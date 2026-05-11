#!/bin/zsh

set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="1235"
HOST="127.0.0.1"
URL="http://${HOST}:${PORT}/"
PID_FILE="${PROJECT_DIR}/.local-server.pid"
LOG_FILE="${PROJECT_DIR}/.local-server.log"

cd "$PROJECT_DIR" || exit 1

server_is_ready() {
  /usr/bin/curl -fsI "$URL" >/dev/null 2>&1
}

if ! server_is_ready; then
  if [[ -f "$PID_FILE" ]]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "${OLD_PID}" ]] && ! kill -0 "$OLD_PID" >/dev/null 2>&1; then
      rm -f "$PID_FILE"
    fi
  fi

  nohup /usr/bin/python3 -c 'from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler; import sys; ThreadingHTTPServer((sys.argv[1], int(sys.argv[2])), SimpleHTTPRequestHandler).serve_forever()' "$HOST" "$PORT" >"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

  for _ in {1..20}; do
    server_is_ready && break
    sleep 0.15
  done
fi

/usr/bin/open "$URL"

echo ""
echo "Jaehong An website is open:"
echo "$URL"
echo ""
echo "Server log:"
echo "$LOG_FILE"
echo ""
echo "You can close this Terminal window. The local server will keep running."
