import http.server
import socketserver
import webbrowser
import os
import threading
import time
import urllib.parse

class CricketHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Parse the URL
        parsed_path = urllib.parse.urlparse(path).path
        
        # If requesting cricket_data files, serve from parent directory
        if parsed_path.startswith('/cricket_data/'):
            # Remove leading slash and serve from parent directory
            rel_path = parsed_path[1:]  # Remove leading /
            base_dir = os.path.dirname(os.getcwd())  # Parent of cricket-pwa
            full_path = os.path.join(base_dir, rel_path)
            return full_path
        
        # For all other files, serve from current directory (cricket-pwa)
        return super().translate_path(path)

def start_server():
    # Stay in the current directory (cricket-pwa-standalone)
    # os.chdir(r'C:\Users\anujl\PycharmProjects\BCCB_refactored\cricket-pwa')
    
    # Set up the server with custom handler
    PORT = 8000
    Handler = CricketHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🏏 Cricket PWA Server Starting...")
            print(f"📱 Open in browser: http://localhost:{PORT}")
            print(f"🌐 Server running at: http://localhost:{PORT}")
            print(f"📁 Serving cricket-pwa/ and cricket_data/")
            print(f"📱 For mobile: Use your computer's IP address")
            print(f"⚠️  Press Ctrl+C to stop server")
            print("-" * 50)
            
            # Auto-open browser after a short delay
            def open_browser():
                time.sleep(1)
                webbrowser.open(f'http://localhost:{PORT}')
            
            browser_thread = threading.Thread(target=open_browser)
            browser_thread.start()
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == "__main__":
    start_server()
