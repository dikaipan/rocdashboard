from typing import Optional
from flask import Flask, send_from_directory, Response
from flask_cors import CORS
from config import Config
from backend.routes import register_routes
import os
import mimetypes

def create_app() -> Flask:
    """
    Application factory
    
    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    
    app.config.from_object(Config)
    CORS(app)
    
    # Ensure correct MIME types for modern JavaScript modules
    mimetypes.add_type('application/javascript', '.js')
    mimetypes.add_type('text/css', '.css')
    mimetypes.add_type('application/json', '.json')
    
    # Register all API routes FIRST (with /api prefix)
    register_routes(app)
    
    # Serve documentation HTML file
    @app.route("/docs")
    @app.route("/panduan")
    @app.route("/documentation")
    def serve_documentation() -> Response:
        """
        Serve documentation HTML file
        
        Returns:
            Documentation HTML file response
        """
        docs_path = os.path.join(os.path.dirname(__file__), "PANDUAN_PENGGUNAAN_ROC_DASHBOARD.html")
        if os.path.exists(docs_path):
            return send_from_directory(os.path.dirname(__file__), "PANDUAN_PENGGUNAAN_ROC_DASHBOARD.html", mimetype='text/html')
        else:
            return Response(
                "<h1>Documentation Not Found</h1><p>File PANDUAN_PENGGUNAAN_ROC_DASHBOARD.html tidak ditemukan.</p>",
                mimetype='text/html',
                status=404
            )
    
    # Serve screenshots folder for documentation
    @app.route("/screenshots/<path:filename>")
    def serve_screenshot(filename: str) -> Response:
        """
        Serve screenshot images for documentation
        
        Args:
            filename: Screenshot filename
            
        Returns:
            Image file response
        """
        screenshots_dir = os.path.join(os.path.dirname(__file__), "screenshots")
        if os.path.exists(screenshots_dir):
            return send_from_directory(screenshots_dir, filename)
        else:
            return Response("Screenshot not found", status=404)
    
    # Serve React frontend - CATCH-ALL route (must be LAST)
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path: str) -> Response:
        """
        Serve React frontend static files with SPA fallback
        
        This route handles:
        1. Static assets (JS, CSS, images) from dist/assets/
        2. All SPA routes (dashboard, engineers, etc.) -> return index.html
        
        Args:
            path: Requested file path
            
        Returns:
            Static file response or index.html for SPA routes
        """
        # Check if dist folder exists
        if not os.path.exists(Config.DIST_DIR):
            return """
            <html>
              <head><meta charset="utf-8"><title>ROC Dashboard - Setup</title></head>
              <body style="font-family: Arial, sans-serif; padding:30px;">
                <h2>ROC Dashboard</h2>
                <p>The frontend build was not found.</p>
                <p>Please build the React frontend first:</p>
                <pre>cd frontend\nnpm install\nnpm run build</pre>
                <p>Then refresh this page.</p>
              </body>
            </html>
            """
        
        # If requesting a file that exists (JS, CSS, images, etc.), serve it
        if path != "":
            # Normalize path - remove leading slash if present
            normalized_path = path.lstrip('/')
            file_path = os.path.join(Config.DIST_DIR, normalized_path)
            
            # Debug logging (only in debug mode)
            if Config.DEBUG:
                print(f"[DEBUG] Requested path: {path}")
                print(f"[DEBUG] Normalized path: {normalized_path}")
                print(f"[DEBUG] File path: {file_path}")
                print(f"[DEBUG] File exists: {os.path.exists(file_path)}")
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                # Explicitly set MIME type based on file extension
                if file_path.endswith('.js'):
                    mimetype = 'application/javascript; charset=utf-8'
                elif file_path.endswith('.mjs'):
                    mimetype = 'application/javascript; charset=utf-8'
                elif file_path.endswith('.css'):
                    mimetype = 'text/css; charset=utf-8'
                elif file_path.endswith('.json'):
                    mimetype = 'application/json; charset=utf-8'
                elif file_path.endswith('.png'):
                    mimetype = 'image/png'
                elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                    mimetype = 'image/jpeg'
                elif file_path.endswith('.svg'):
                    mimetype = 'image/svg+xml'
                else:
                    # Fallback to mimetypes.guess_type
                    mimetype = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
                
                if Config.DEBUG:
                    print(f"[DEBUG] MIME type: {mimetype}")
                
                response = send_from_directory(Config.DIST_DIR, normalized_path, mimetype=mimetype)
                
                # Ensure proper headers for CSS files
                if file_path.endswith('.css'):
                    response.headers['Content-Type'] = 'text/css; charset=utf-8'
                    # Disable caching for CSS during development to see changes immediately
                    if Config.DEBUG:
                        response.cache_control.no_cache = True
                        response.cache_control.must_revalidate = True
                    else:
                        # Cache CSS in production (hash-based names, safe to cache)
                        response.cache_control.max_age = 31536000  # 1 year
                        response.cache_control.public = True
                else:
                    # Cache other static assets for 1 year (they have hash-based names, so safe to cache)
                    if normalized_path.startswith('assets/'):
                        response.cache_control.max_age = 31536000  # 1 year
                        response.cache_control.public = True
                return response
        
        # For all other requests (SPA routes), return index.html
        # This handles: /, /dashboard, /engineers, /stockpart, etc.
        response = send_from_directory(Config.DIST_DIR, "index.html")
        # Disable caching for index.html to ensure fresh builds are served
        response.cache_control.no_cache = True
        response.cache_control.no_store = True
        response.cache_control.must_revalidate = True
        return response
    
    return app

if __name__ == "__main__":
    app = create_app()
    # Get port from environment variable (for Railway, Render, etc.) or use config
    port = int(os.environ.get('PORT', Config.PORT))
    # Bind to 0.0.0.0 for production deployment
    host = os.environ.get('HOST', '0.0.0.0')
    app.run(host=host, port=port, debug=Config.DEBUG)