export interface Account {
    id: string;
    name: string;
    username: string;
    password: string;
    email?: string;
    category: string;
    last_login: string | undefined;
    game_type: string;
}

export interface Settings {
    riot_client_path: string;
    league_path: string;
    valorant_path: string;
    startWithWindows: boolean;
    minimizeToTray: boolean;
    minimizeOnGameLaunch: boolean;
    loginDelay: number;
}

export interface TabItem {
    id: string;
    label: string;
} 