#!/usr/bin/env python3
"""Local preview server that never lets the browser reuse stale files.

    python3 serve.py          # http://localhost:8080
    python3 serve.py 3000     # another port
"""
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f'Buzzar preview on http://localhost:{port}  (no caching)')
    http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
