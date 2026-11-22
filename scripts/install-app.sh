#!/usr/bin/env bash
# Install Practical Todo for this user: a systemd user service for the server,
# and an entry in the app launcher. Run again any time; it overwrites its own files.
set -euo pipefail

ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
NODE="$(command -v node)" || { echo "Node.js is required: https://nodejs.org/" >&2; exit 1; }
SERVICE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
APPS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
SERVICE_FILE="$SERVICE_DIR/practical-todo.service"
DESKTOP_FILE="$APPS_DIR/practical-todo.desktop"

mkdir -p "$SERVICE_DIR" "$APPS_DIR"
chmod +x "$ROOT/bin/practical-todo"

cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=Practical Todo local server
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$NODE $ROOT/server.js
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
EOF

cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Practical Todo
Comment=See what you're working on, snooze the rest, see what you keep putting off
Exec=$ROOT/bin/practical-todo
Icon=$ROOT/public/icons/icon-512.png
Terminal=false
Categories=Office;ProjectManagement;
Keywords=todo;tasks;snooze;
StartupNotify=true
EOF

systemctl --user daemon-reload
# Pick up code changes if the server was already running.
systemctl --user try-restart practical-todo.service
command -v update-desktop-database >/dev/null && update-desktop-database "$APPS_DIR" 2>/dev/null || true

echo "Installed Practical Todo."
echo "  Launcher entry: $DESKTOP_FILE"
echo "  Server service: $SERVICE_FILE"
echo "Open it from your app launcher, or run: $ROOT/bin/practical-todo"
