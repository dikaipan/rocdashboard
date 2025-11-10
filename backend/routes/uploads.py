from flask import Blueprint, jsonify, request, send_file, send_from_directory
from werkzeug.utils import secure_filename
from backend.services.upload_service import UploadService
from config import Config
import os
from datetime import datetime
import uuid

upload_bp = Blueprint('uploads', __name__)
service = UploadService()

ALLOWED_EXTENSIONS = {'csv'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_image_file(filename: str) -> bool:
    """Check if image file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

@upload_bp.route('/upload', methods=['POST'])
def upload():
    """Upload CSV file"""
    if 'file' not in request.files or 'target' not in request.form:
        return jsonify({"error": "file and target required"}), 400
    
    file = request.files['file']
    target = request.form['target']
    
    if file.filename == '':
        return jsonify({"error": "empty filename"}), 400
    
    filename = secure_filename(file.filename)
    if not allowed_file(filename):
        return jsonify({"error": "only csv allowed"}), 400
    
    if target not in ('machines', 'engineers', 'stock-parts'):
        return jsonify({"error": "target must be machines, engineers, or stock-parts"}), 400
    
    try:
        result = service.upload_csv(file, target)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"[ERROR] File upload failed: {e}")
        return jsonify({"error": str(e)}), 500

@upload_bp.route('/export', methods=['GET'])
def export():
    """Export data to Excel"""
    try:
        excel_file = service.export_to_excel()
        return send_file(
            excel_file,
            download_name="summary_export.xlsx",
            as_attachment=True,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"[ERROR] Export failed: {e}")
        return jsonify({"error": str(e)}), 500

@upload_bp.route('/upload-photo', methods=['POST'])
def upload_photo():
    """Upload photo/image file for tools"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        if not allowed_image_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"}), 400
        
        # Validate file size (max 5MB)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            return jsonify({"error": "File size exceeds 5MB limit"}), 400
        
        # Ensure upload directory exists
        os.makedirs(Config.UPLOAD_TOOLS_DIR, exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_ext}"
        
        # Save file
        file_path = os.path.join(Config.UPLOAD_TOOLS_DIR, unique_filename)
        file.save(file_path)
        
        # Return relative path for storage in CSV
        # Path will be: /api/uploads/tools/filename.jpg
        relative_path = f"/api/uploads/tools/{unique_filename}"
        
        return jsonify({
            "ok": True,
            "message": "Photo uploaded successfully",
            "path": relative_path,
            "filename": unique_filename
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Photo upload failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@upload_bp.route('/uploads/tools/<filename>', methods=['GET'])
def serve_tool_photo(filename):
    """Serve uploaded tool photos"""
    try:
        # Security: ensure filename is safe
        safe_filename = secure_filename(filename)
        file_path = os.path.join(Config.UPLOAD_TOOLS_DIR, safe_filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        return send_from_directory(Config.UPLOAD_TOOLS_DIR, safe_filename)
    except Exception as e:
        print(f"[ERROR] Failed to serve photo: {e}")
        return jsonify({"error": str(e)}), 500