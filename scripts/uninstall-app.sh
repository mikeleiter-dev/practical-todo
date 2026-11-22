#!/usr/bin/env bash
# Remove the Practical Todo service and launcher entry. Item data is not touched.
set -euo pipefail

SERVICE_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/practical-todo.service"
APPS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

systemctl --user disable --now practical-todo.service 2>/dev/null || true
rm -f "$SERVICE_FILE" "$APPS_DIR/practical-todo.desktop"
systemctl --user daemon-reload
command -v update-desktop-database >/dev/null && update-desktop-database "$APPS_DIR" 2>/dev/null || true

echo "Removed the Practical Todo service and launcher entry. Your items were not touched."
