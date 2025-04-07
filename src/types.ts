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
    start_with_windows: boolean;
    minimize_to_tray: boolean;
    minimize_on_game_launch: boolean;
    login_delay: number;
    window_pos: [number, number] | null;
}

export interface TabItem {
    id: string;
    label: string;
} 