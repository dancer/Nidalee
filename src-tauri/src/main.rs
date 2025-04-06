#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use chrono::Utc;
use enigo::{Enigo, Key, KeyboardControllable};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::fs::create_dir_all;
use std::fs::read_dir;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::api::path;
use tauri::SystemTrayMenuItem;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use windows::core::PCSTR;
use windows::core::PCWSTR;
use windows::Win32::Foundation::HWND;
use windows::Win32::System::Threading::{CreateMutexW, OpenMutexW, MUTEX_ALL_ACCESS};
use windows::Win32::UI::WindowsAndMessaging::FindWindowA;
use winreg::enums::*;
use winreg::RegKey;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Account {
    id: String,
    name: String,
    username: String,
    password: String,
    category: String,
    last_login: Option<String>,
    game_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub riot_client_path: String,
    pub league_path: String,
    pub valorant_path: String,
    pub start_with_windows: bool,
    pub minimize_to_tray: bool,
    pub minimize_on_game_launch: bool,
    pub login_delay: u32,
    pub window_pos: Option<(i32, i32)>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Categories {
    categories: Vec<String>,
}

struct AppState {
    accounts: Mutex<HashMap<String, Account>>,
    settings: Mutex<Settings>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct GameStatus {
    league_running: bool,
    valorant_running: bool,
}

#[tauri::command]
async fn save_account(account: Account, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut accounts = state.accounts.lock().unwrap();
    accounts.insert(account.id.clone(), account);

    let accounts_path = get_app_data_dir()?.join("accounts.json");
    let accounts_json = serde_json::to_string(&*accounts).map_err(|e| e.to_string())?;
    fs::write(accounts_path, accounts_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_accounts(state: tauri::State<'_, AppState>) -> Result<Vec<Account>, String> {
    let accounts = state.accounts.lock().unwrap();
    Ok(accounts.values().cloned().collect())
}

#[tauri::command]
async fn delete_account(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut accounts = state.accounts.lock().unwrap();
    accounts.remove(&id);

    let accounts_path = get_app_data_dir()?.join("accounts.json");
    let accounts_json = serde_json::to_string(&*accounts).map_err(|e| e.to_string())?;
    fs::write(accounts_path, accounts_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn save_settings(
    mut settings: Settings,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    println!("Saving settings: {:?}", settings);

    settings.riot_client_path = settings.riot_client_path.replace('/', "\\");
    settings.league_path = settings.league_path.replace('/', "\\");
    settings.valorant_path = settings.valorant_path.replace('/', "\\");

    if let Err(e) = set_auto_startup(settings.start_with_windows) {
        println!("Failed to set auto startup: {}", e);
    }

    let mut current_settings = state.settings.lock().unwrap();
    *current_settings = settings;

    let settings_path = get_app_data_dir()?.join("settings.json");
    let settings_json = serde_json::to_string(&*current_settings).map_err(|e| {
        println!("Failed to serialize settings: {}", e);
        e.to_string()
    })?;

    fs::write(settings_path, settings_json).map_err(|e| {
        println!("Failed to write settings file: {}", e);
        e.to_string()
    })?;

    println!("Settings saved successfully");
    Ok(())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

fn wait_for_riot_client() -> Result<(), String> {
    println!("Waiting for Riot Client window...");
    let max_attempts = 30;
    let mut attempts = 0;

    while attempts < max_attempts {
        unsafe {
            let window = FindWindowA(
                PCSTR::from_raw("Chrome_WidgetWin_1\0".as_ptr()),
                PCSTR::from_raw("Riot Client\0".as_ptr()),
            );

            let window2 = FindWindowA(
                PCSTR::from_raw("RCLIENT\0".as_ptr()),
                PCSTR::from_raw("Riot Client\0".as_ptr()),
            );

            if window != HWND(0) || window2 != HWND(0) {
                thread::sleep(Duration::from_secs(2));
                println!("Riot Client window found!");
                return Ok(());
            }
        }

        thread::sleep(Duration::from_secs(1));
        attempts += 1;
    }

    Err("Riot Client window not found after 30 seconds".to_string())
}

#[tauri::command]
async fn launch_game(
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    account: Account,
    selected_game: String,
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    let login_delay = settings.login_delay.clamp(2, 30) as u64;

    if settings.riot_client_path.is_empty() {
        println!("Riot Client path not set, searching automatically...");
        if let Some(path) = find_riot_client_path() {
            println!("Found Riot Client at: {}", path);
            settings.riot_client_path = path;

            let settings_path = get_app_data_dir()?.join("settings.json");
            if let Ok(json) = serde_json::to_string(&*settings) {
                fs::write(settings_path, json).map_err(|e| e.to_string())?;
            }
        } else {
            return Err("Could not find Riot Client. Please set the path in Settings.".to_string());
        }
    }

    let riot_client_path = settings.riot_client_path.clone();
    if !verify_riot_client_path(&riot_client_path) {
        println!("Invalid Riot Client path, searching for new path...");
        if let Some(path) = find_riot_client_path() {
            println!("Found new Riot Client path: {}", path);
            settings.riot_client_path = path;

            let settings_path = get_app_data_dir()?.join("settings.json");
            if let Ok(json) = serde_json::to_string(&*settings) {
                fs::write(settings_path, json).map_err(|e| e.to_string())?;
            }
        } else {
            return Err("Could not find Riot Client. Please set the path in Settings.".to_string());
        }
    }

    if settings.minimize_on_game_launch {
        let _ = window.hide();
    }

    println!("Launching Riot Client from: {}", riot_client_path);

    let fresh_launch = unsafe {
        let window = FindWindowA(
            PCSTR::from_raw("Chrome_WidgetWin_1\0".as_ptr()),
            PCSTR::from_raw("Riot Client\0".as_ptr()),
        );

        let window2 = FindWindowA(
            PCSTR::from_raw("RCLIENT\0".as_ptr()),
            PCSTR::from_raw("Riot Client\0".as_ptr()),
        );

        window == HWND(0) && window2 == HWND(0)
    };

    #[cfg(target_os = "windows")]
    let _command = Command::new(&riot_client_path)
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| {
            println!("Failed to spawn Riot Client: {}", e);
            e.to_string()
        })?;

    wait_for_riot_client()?;

    println!("Waiting {} seconds for client to load...", login_delay);
    thread::sleep(Duration::from_secs(login_delay));

    println!("Starting login sequence");
    let mut enigo = Enigo::new();

    if !fresh_launch {
        unsafe {
            let window = FindWindowA(
                PCSTR::from_raw("Chrome_WidgetWin_1\0".as_ptr()),
                PCSTR::from_raw("Riot Client\0".as_ptr()),
            );

            let window2 = FindWindowA(
                PCSTR::from_raw("RCLIENT\0".as_ptr()),
                PCSTR::from_raw("Riot Client\0".as_ptr()),
            );

            if window != HWND(0) || window2 != HWND(0) {
                use windows::Win32::UI::WindowsAndMessaging::{
                    BringWindowToTop, SetForegroundWindow,
                };

                if window != HWND(0) {
                    BringWindowToTop(window);
                    SetForegroundWindow(window);
                } else {
                    BringWindowToTop(window2);
                    SetForegroundWindow(window2);
                }

                thread::sleep(Duration::from_secs(1));

                for _ in 0..3 {
                    enigo.key_click(Key::Tab);
                    thread::sleep(Duration::from_millis(300));
                }

                thread::sleep(Duration::from_millis(500));
            }
        }
    }

    for c in account.username.chars() {
        enigo.key_sequence(&c.to_string());
        thread::sleep(Duration::from_millis(10));
    }
    thread::sleep(Duration::from_millis(300));

    enigo.key_click(Key::Tab);
    thread::sleep(Duration::from_millis(300));

    for c in account.password.chars() {
        enigo.key_sequence(&c.to_string());
        thread::sleep(Duration::from_millis(10));
    }
    thread::sleep(Duration::from_millis(300));

    enigo.key_click(Key::Return);

    thread::sleep(Duration::from_secs(2));

    println!("Launching game: {}", selected_game);
    let launch_args = match selected_game.as_str() {
        "valorant" => "--launch-product=valorant --launch-patchline=live",
        "league" => "--launch-product=league_of_legends --launch-patchline=live",
        _ => return Err("Invalid game type".to_string()),
    };

    #[cfg(target_os = "windows")]
    Command::new(&riot_client_path)
        .args(launch_args.split_whitespace())
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| {
            println!("Failed to launch game: {}", e);
            e.to_string()
        })?;

    println!("Login sequence completed");

    let mut accounts = state.accounts.lock().unwrap();
    if let Some(acc) = accounts.get_mut(&account.id) {
        acc.last_login = Some(Utc::now().to_rfc3339());

        let accounts_path = get_app_data_dir()?.join("accounts.json");
        let accounts_json = serde_json::to_string(&*accounts).map_err(|e| e.to_string())?;
        fs::write(accounts_path, accounts_json).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn get_windows_drives() -> Vec<String> {
    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        if Path::new(&drive).exists() {
            drives.push(drive);
        }
    }
    drives
}

fn find_riot_client_path() -> Option<String> {
    println!("Starting Riot Client path search...");

    let registry_paths = [
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\WOW6432Node\\Riot Games\\Riot Client",
        ),
        (HKEY_LOCAL_MACHINE, "SOFTWARE\\Riot Games\\Riot Client"),
        (HKEY_CURRENT_USER, "SOFTWARE\\Riot Games\\Riot Client"),
    ];

    println!("Checking registry keys...");
    for (hkey, path) in &registry_paths {
        if let Ok(key) = RegKey::predef(*hkey).open_subkey(path) {
            if let Ok(install_dir) = key.get_value::<String, _>("InstallLocation") {
                let client_path = Path::new(&install_dir).join("RiotClientServices.exe");
                if client_path.exists() {
                    println!("Found via registry: {}", client_path.display());
                    return Some(client_path.to_string_lossy().into_owned());
                }
            }
        }
    }

    let common_paths = vec![
        "C:\\Riot Games\\Riot Client\\RiotClientServices.exe",
        "C:\\Program Files\\Riot Games\\Riot Client\\RiotClientServices.exe",
        "C:\\Program Files (x86)\\Riot Games\\Riot Client\\RiotClientServices.exe",
    ];

    println!("Checking common paths...");
    for path in &common_paths {
        if Path::new(path).exists() {
            println!("Found in common path: {}", path);
            return Some(path.to_string());
        }
    }

    println!("Searching all drives...");
    for drive in get_windows_drives() {
        let direct_path = format!("{}Riot Games\\Riot Client\\RiotClientServices.exe", drive);
        if Path::new(&direct_path).exists() {
            println!("Found in drive root: {}", direct_path);
            return Some(direct_path);
        }

        let program_files = vec![
            format!("{}Program Files\\Riot Games", drive),
            format!("{}Program Files (x86)\\Riot Games", drive),
            format!("{}Riot Games", drive),
        ];

        for dir in program_files {
            if let Some(path) = search_directory_for_riot_client(&dir) {
                println!("Found via directory search: {}", path);
                return Some(path);
            }
        }
    }

    println!("Checking running processes...");
    if let Some(path) = find_riot_client_from_process() {
        println!("Found via process: {}", path);
        return Some(path);
    }

    println!("Riot Client not found in any location");
    None
}

fn search_directory_for_riot_client(start_path: &str) -> Option<String> {
    if !Path::new(start_path).exists() {
        return None;
    }

    let target = "RiotClientServices.exe";
    let mut dirs_to_check = vec![start_path.to_string()];

    while let Some(dir) = dirs_to_check.pop() {
        if let Ok(entries) = read_dir(&dir) {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                if path.is_file() && path.file_name().and_then(|n| n.to_str()) == Some(target) {
                    return Some(path.to_string_lossy().into_owned());
                } else if path.is_dir() {
                    dirs_to_check.push(path.to_string_lossy().into_owned());
                }
            }
        }
    }
    None
}

fn find_riot_client_from_process() -> Option<String> {
    #[cfg(windows)]
    {
        let output = Command::new("wmic")
            .args([
                "process",
                "where",
                "name='RiotClientServices.exe'",
                "get",
                "ExecutablePath",
            ])
            .output()
            .ok()?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        for line in output_str.lines() {
            let trimmed = line.trim();
            if trimmed.ends_with("RiotClientServices.exe") {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

fn verify_riot_client_path(path: &str) -> bool {
    let normalized_path = path.replace('/', "\\");
    Path::new(&normalized_path).exists()
}

fn set_auto_startup(enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;

    if enable {
        let clean_path = get_clean_exe_path()?;
        let registry_value = format!("\"{}\" --start-minimized", clean_path);
        key.set_value("Nidalee", &registry_value)
            .map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value("Nidalee");
    }
    Ok(())
}

fn verify_startup_path() -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";

    if let Ok((key, _)) = hkcu.create_subkey(path) {
        if let Ok(current_path) = key.get_value::<String, _>("Nidalee") {
            let clean_current = current_path.replace(r"\\?\", "");
            let clean_path = get_clean_exe_path()?;
            let expected_value = format!("\"{}\" --start-minimized", clean_path);

            if clean_current != expected_value {
                key.set_value("Nidalee", &expected_value)
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn toggle_auto_start(enable: bool) -> Result<(), String> {
    println!("toggle_auto_start called with enable={}", enable);
    set_auto_startup(enable)
}

#[tauri::command]
async fn get_auto_start_status() -> Result<bool, String> {
    Ok(RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
        .and_then(|key| key.get_value::<String, _>("Nidalee"))
        .is_ok())
}

fn get_app_data_dir() -> Result<PathBuf, String> {
    let app_data_dir = path::app_data_dir(&tauri::Config::default())
        .ok_or("Failed to get app data directory")?
        .join("Nidalee");

    create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create app directory: {}", e))?;

    Ok(app_data_dir)
}

#[tauri::command]
async fn save_categories(
    categories: Vec<String>,
    _state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let categories_path = get_app_data_dir()?.join("categories.json");
    let categories_json =
        serde_json::to_string(&Categories { categories }).map_err(|e| e.to_string())?;
    fs::write(categories_path, categories_json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_categories() -> Result<Vec<String>, String> {
    let categories_path = get_app_data_dir()?.join("categories.json");
    if let Ok(content) = fs::read_to_string(categories_path) {
        let categories: Categories = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(categories.categories)
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
async fn check_first_run() -> Result<bool, String> {
    let app_data_dir = get_app_data_dir()?;
    let install_marker = app_data_dir.join(".installed");

    if !install_marker.exists() {
        fs::write(&install_marker, "").map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

fn get_clean_exe_path() -> Result<String, String> {
    let exe_path = env::current_exe().map_err(|e| e.to_string())?;
    let canonical_path = exe_path.canonicalize().map_err(|e| e.to_string())?;

    if let Some(path_str) = canonical_path.to_str() {
        Ok(path_str.replace(r"\\?\", ""))
    } else {
        Err("Failed to convert path to string".to_string())
    }
}

#[tauri::command]
async fn minimize_window(
    window: tauri::Window,
    _state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let settings = _state.settings.lock().unwrap();
    if settings.minimize_to_tray {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn check_game_status() -> Result<GameStatus, String> {
    let output = Command::new("tasklist")
        .output()
        .map_err(|e| e.to_string())?;

    let process_list = String::from_utf8_lossy(&output.stdout);

    Ok(GameStatus {
        league_running: process_list.contains("League of Legends.exe")
            || process_list.contains("LeagueClient.exe")
            || process_list.contains("LeagueClientUx.exe"),
        valorant_running: process_list.contains("VALORANT.exe")
            || process_list.contains("VALORANT-Win64-Shipping.exe"),
    })
}

#[tauri::command]
async fn force_close_game(game_type: String) -> Result<(), String> {
    let processes = match game_type.as_str() {
        "league" => vec![
            "League of Legends.exe",
            "LeagueClient.exe",
            "LeagueClientUx.exe",
            "LeagueClientUxRender.exe",
            "RiotClientServices.exe",
            "RiotClientUx.exe",
            "RiotClientUxRender.exe",
        ],
        "valorant" => vec![
            "VALORANT.exe",
            "VALORANT-Win64-Shipping.exe",
            "RiotClientServices.exe",
            "RiotClientUx.exe",
            "RiotClientUxRender.exe",
        ],
        _ => return Err("Invalid game type".to_string()),
    };

    println!("Attempting to close game processes...");

    for process in &processes {
        println!("Closing process: {}", process);
        let _ = Command::new("taskkill").args(["/IM", process]).output();

        thread::sleep(Duration::from_millis(500));
    }

    for process in &processes {
        println!("Force closing process: {}", process);
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", process])
            .output();

        thread::sleep(Duration::from_millis(200));
    }

    println!("Waiting for processes to terminate...");
    thread::sleep(Duration::from_secs(3));

    let output = Command::new("tasklist")
        .output()
        .map_err(|e| e.to_string())?;

    let process_list = String::from_utf8_lossy(&output.stdout);

    for process in &processes {
        if process_list.contains(process) {
            return Err(format!("Failed to close process: {}", process));
        }
    }

    println!("All game processes closed successfully");
    Ok(())
}

fn main() {
    let mutex_name = "Global\\NidaleeAppSingleInstance";
    let mutex_name_wide: Vec<u16> = String::from(mutex_name)
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let existing_mutex =
            OpenMutexW(MUTEX_ALL_ACCESS, false, PCWSTR(mutex_name_wide.as_ptr())).ok();

        if let Some(_mutex) = existing_mutex {
            let window = FindWindowA(PCSTR::null(), PCSTR::from_raw("Nidalee\0".as_ptr()));

            if window != HWND(0) {
                use windows::Win32::UI::WindowsAndMessaging::{
                    BringWindowToTop, IsIconic, SetForegroundWindow, ShowWindow, SW_HIDE,
                    SW_MINIMIZE, SW_RESTORE, SW_SHOW,
                };

                if IsIconic(window).as_bool() {
                    ShowWindow(window, SW_RESTORE);
                    ShowWindow(window, SW_SHOW);
                    BringWindowToTop(window);
                    SetForegroundWindow(window);
                } else {
                    let settings_path = get_app_data_dir().unwrap().join("settings.json");
                    if let Ok(content) = fs::read_to_string(&settings_path) {
                        if let Ok(settings) = serde_json::from_str::<Settings>(&content) {
                            if settings.minimize_to_tray {
                                ShowWindow(window, SW_HIDE);
                            } else {
                                ShowWindow(window, SW_MINIMIZE);
                            }
                        } else {
                            ShowWindow(window, SW_MINIMIZE);
                        }
                    } else {
                        ShowWindow(window, SW_MINIMIZE);
                    }
                }
                return;
            }
            return;
        }

        let _mutex = CreateMutexW(Option::None, true, PCWSTR(mutex_name_wide.as_ptr()));
    }

    let app_data_dir = get_app_data_dir().unwrap();
    println!("Using app data directory: {}", app_data_dir.display());

    let _settings_path = app_data_dir.join("settings.json");
    let _accounts_path = app_data_dir.join("accounts.json");
    let _categories_path = app_data_dir.join("categories.json");

    let riot_client_path = find_riot_client_path().unwrap_or_else(|| String::new());
    println!("Found Riot Client path: {}", riot_client_path);

    let settings = if let Ok(content) = fs::read_to_string(&_settings_path) {
        let mut settings: Settings = serde_json::from_str(&content).unwrap_or_else(|_| Settings {
            riot_client_path: riot_client_path.clone(),
            league_path: String::new(),
            valorant_path: String::new(),
            start_with_windows: false,
            minimize_to_tray: false,
            minimize_on_game_launch: false,
            login_delay: 5,
            window_pos: None,
        });

        if settings.riot_client_path.is_empty() && !riot_client_path.is_empty() {
            settings.riot_client_path = riot_client_path;
            if let Ok(json) = serde_json::to_string(&settings) {
                let _ = fs::write(&_settings_path, json);
            }
        }
        settings
    } else {
        let settings = Settings {
            riot_client_path,
            league_path: String::new(),
            valorant_path: String::new(),
            start_with_windows: false,
            minimize_to_tray: false,
            minimize_on_game_launch: false,
            login_delay: 5,
            window_pos: None,
        };
        if let Ok(json) = serde_json::to_string(&settings) {
            let _ = fs::write(&_settings_path, json);
        }
        settings
    };

    let accounts = if let Ok(content) = fs::read_to_string(&_accounts_path) {
        serde_json::from_str(&content).unwrap_or_else(|_| HashMap::new())
    } else {
        HashMap::new()
    };

    let app_state = AppState {
        accounts: Mutex::new(accounts),
        settings: Mutex::new(settings),
    };

    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    let system_tray = SystemTray::new()
        .with_menu(tray_menu)
        .with_tooltip("Nidalee");

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    app.exit(0);
                }
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                _ => {}
            },
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(window) = app.get_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            _ => {}
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            save_account,
            get_accounts,
            delete_account,
            save_settings,
            get_settings,
            launch_game,
            toggle_auto_start,
            get_auto_start_status,
            save_categories,
            get_categories,
            check_first_run,
            minimize_window,
            check_game_status,
            force_close_game
        ])
        .setup(|app| {
            if let Err(e) = verify_startup_path() {
                println!("Failed to verify startup path: {}", e);
            }

            let window = app.get_window("main").unwrap();
            let state = app.state::<AppState>();
            let settings = state.settings.lock().unwrap();

            let args: Vec<String> = env::args().collect();
            if args.contains(&"--start-minimized".to_string()) {
                window.hide().unwrap();
            } else {
                let target_monitor = if let Some((x, y)) = settings.window_pos {
                    let monitors = window.available_monitors().unwrap();
                    monitors
                        .into_iter()
                        .find(|monitor| {
                            let position = monitor.position();
                            let size = monitor.size();
                            x >= position.x
                                && x < position.x + size.width as i32
                                && y >= position.y
                                && y < position.y + size.height as i32
                        })
                        .or_else(|| window.current_monitor().unwrap())
                } else {
                    window.current_monitor().unwrap()
                };

                if let Some(monitor) = target_monitor {
                    let monitor_position = monitor.position();
                    let monitor_size = monitor.size();
                    let window_size = window.outer_size().unwrap();

                    let center_x = monitor_position.x
                        + (monitor_size.width as i32 - window_size.width as i32) / 2;
                    let center_y = monitor_position.y
                        + (monitor_size.height as i32 - window_size.height as i32) / 2;

                    window
                        .set_position(tauri::PhysicalPosition::new(center_x, center_y))
                        .unwrap();
                } else {
                    window.center().unwrap();
                }
                window.show().unwrap();
            }

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Moved(position) = event.event() {
                let window = event.window();
                let state = window.state::<AppState>();
                let mut settings = state.settings.lock().unwrap();
                settings.window_pos = Some((position.x, position.y));

                if let Ok(settings_json) = serde_json::to_string(&*settings) {
                    let app_data_dir = path::app_data_dir(&tauri::Config::default()).unwrap();
                    let settings_path = app_data_dir.join("settings.json");
                    let _ = fs::write(settings_path, settings_json);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
