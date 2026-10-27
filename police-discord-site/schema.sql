PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS members (discord_id TEXT PRIMARY KEY, username TEXT NOT NULL, display_name TEXT NOT NULL, avatar TEXT, rank_id TEXT, rank_name TEXT, rank_position INTEGER NOT NULL DEFAULT 999, department_id TEXT, department_name TEXT, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', role_id TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
INSERT OR IGNORE INTO settings(key,value) VALUES ('siteName','POLICE DEPARTMENT'),('description','بوابة الأفراد والعمليات');
