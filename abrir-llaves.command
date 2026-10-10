#!/bin/zsh
# Doble clic para abrir Llaves: arranca el servidor (si no está corriendo) y abre el navegador.
cd "$(dirname "$0")"
export PATH="$HOME/.nvm/versions/node/v24.20.0/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! lsof -iTCP:8811 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup node server.mjs > data/progreso/servidor.log 2>&1 &
  sleep 1
fi
open "http://localhost:8811"
