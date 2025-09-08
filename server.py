import http.server
import socketserver
import webbrowser
import os
import threading
import time
import urllib.parse
import gzip
import io
import json

class CricketHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Check if client accepts gzip encoding
        accept_encoding = self.headers.get('Accept-Encoding', '')
        
        # Get the file path
        file_path = self.translate_path(self.path)
        
        # Check if file exists and is compressible
        if (os.path.exists(file_path) and 
            'gzip' in accept_encoding and 
            (file_path.endswith('.html') or file_path.endswith('.js') or file_path.endswith('.css'))):
            
            try:
                # Read and compress the file
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                # Compress content
                compressed_content = gzip.compress(content)
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', self.guess_type(file_path))
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Content-Length', str(len(compressed_content)))
                self.end_headers()
                self.wfile.write(compressed_content)
                return
            except Exception as e:
                print(f"⚠️ Gzip compression failed for {file_path}: {e}")
                # Fall back to normal serving
        
        # Fall back to default behavior
        super().do_GET()
    
    def do_POST(self):
        """Handle POST requests to save updated player data"""
        if self.path == '/api/save-players':
            try:
                # Read the request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Parse JSON data
                data = json.loads(post_data.decode('utf-8'))
                
                # Save to cricket_stats.json
                with open('cricket_stats.json', 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Create backup
                backup_filename = f"cricket_stats_backup_{time.strftime('%Y%m%d_%H%M%S')}.json"
                with open(backup_filename, 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': 'Player data saved successfully',
                    'backup_created': backup_filename,
                    'players_count': len(data.get('player_info', []))
                }
                self.wfile.write(json.dumps(response).encode())
                
                print(f"✅ Saved player data to cricket_stats.json ({len(data.get('player_info', []))} players)")
                print(f"📁 Backup created: {backup_filename}")
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': False,
                    'message': f'Error saving player data: {str(e)}'
                }
                self.wfile.write(json.dumps(response).encode())
                print(f"❌ Error saving player data: {e}")
        
        elif self.path == '/api/delete-match':
            try:
                # Read the request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Parse JSON data
                request_data = json.loads(post_data.decode('utf-8'))
                match_id = request_data.get('matchId')
                
                if not match_id:
                    raise ValueError("Match ID is required")
                
                # Load current cricket_stats.json
                with open('cricket_stats.json', 'r') as f:
                    data = json.load(f)
                
                # Remove match from matches or history (handle both formats)
                deleted_match = None
                if 'matches' in data:
                    original_count = len(data['matches'])
                    data['matches'] = [m for m in data['matches'] if m.get('Match_ID') != match_id]
                    if len(data['matches']) < original_count:
                        deleted_match = True
                
                if 'history' in data:
                    original_count = len(data['history'])
                    data['history'] = [m for m in data['history'] if m.get('Match_ID') != match_id]
                    if len(data['history']) < original_count:
                        deleted_match = True
                
                # Remove associated batting and bowling data
                if 'match_batting_performance' in data:
                    data['match_batting_performance'] = [b for b in data['match_batting_performance'] if b.get('Match_ID') != match_id]
                
                if 'match_bowling_performance' in data:
                    data['match_bowling_performance'] = [b for b in data['match_bowling_performance'] if b.get('Match_ID') != match_id]
                
                if 'index' in data:
                    data['index'] = [i for i in data['index'] if i.get('Match_ID') != match_id]
                
                if not deleted_match:
                    raise ValueError(f"Match with ID {match_id} not found")
                
                # Save updated data to cricket_stats.json
                with open('cricket_stats.json', 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Create backup
                backup_filename = f"cricket_stats_backup_delete_{time.strftime('%Y%m%d_%H%M%S')}.json"
                with open(backup_filename, 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': f'Match {match_id} deleted successfully',
                    'backup_created': backup_filename
                }
                self.wfile.write(json.dumps(response).encode())
                
                print(f"🗑️ Deleted match {match_id} from cricket_stats.json")
                print(f"📁 Backup created: {backup_filename}")
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': False,
                    'message': f'Error deleting match: {str(e)}'
                }
                self.wfile.write(json.dumps(response).encode())
                print(f"❌ Error deleting match: {e}")
        
        else:
            # Send 404 for unknown POST endpoints
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def end_headers(self):
        # Only add no-cache headers for HTML files to ensure page updates
        # Allow caching for static assets (JS, CSS, images) to improve performance
        if self.path.endswith('.html') or self.path.endswith('.js') or self.path.endswith('.css') or self.path == '/' or '?' in self.path:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            # Allow short-term caching for static assets
            self.send_header('Cache-Control', 'public, max-age=300')  # 5 minutes
        super().end_headers()
    
    def translate_path(self, path):
        # Parse the URL
        parsed_path = urllib.parse.urlparse(path).path
        
        # Redirect root and index.html to complete.html for consistency
        if parsed_path == '/' or parsed_path == '/index.html':
            parsed_path = '/complete.html'
        
        # If requesting cricket_data files, serve from parent directory
        if parsed_path.startswith('/cricket_data/'):
            # Remove leading slash and serve from parent directory
            rel_path = parsed_path[1:]  # Remove leading /
            base_dir = os.path.dirname(os.getcwd())  # Parent of cricket-pwa
            full_path = os.path.join(base_dir, rel_path)
            return full_path
        
        # For all other files, serve from current directory (cricket-pwa)
        # Use the modified path for consistent routing
        if parsed_path.startswith('/'):
            parsed_path = parsed_path[1:]
        return os.path.join(os.getcwd(), parsed_path)

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
