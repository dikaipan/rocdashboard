"""
Baby Parts API Routes
Handles CRUD operations for baby parts inventory
"""
from flask import Blueprint, jsonify, request
from urllib.parse import unquote
from backend.services.baby_part_service import BabyPartService
import traceback

baby_part_bp = Blueprint('baby_parts', __name__)
service = BabyPartService()

@baby_part_bp.route('/baby-parts', methods=['GET', 'POST'])
def baby_parts():
    """
    GET: Retrieve all baby parts with optional filtering and pagination
    POST: Create new baby part
    """
    if request.method == 'GET':
        try:
            # Get query parameters
            page = request.args.get('page', type=int)
            per_page = request.args.get('per_page', type=int)
            search = request.args.get('search', '')
            
            # Get all data
            data = service.get_all()
            
            # Apply search filter
            if search:
                from backend.utils.helpers import search_dict_list
                # Search in: baby_parts, Baby Parts
                data = search_dict_list(data, search, [
                    'baby_parts', 
                    'Baby Parts', 
                    'BABY PARTS',
                ])
            
            # Apply pagination if requested
            if page and per_page:
                from backend.utils.helpers import paginate
                result = paginate(data, page, per_page)
                return jsonify(result), 200
            
            return jsonify(data), 200
            
        except FileNotFoundError as e:
            print(f"[ERROR] File not found: {e}")
            return jsonify({"error": str(e), "data": []}), 404
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to get baby parts: {e}")
            print(traceback.format_exc())
            return jsonify({"error": str(e), "data": []}), 500
    
    elif request.method == 'POST':
        try:
            new_baby_part = request.get_json()
            if not new_baby_part:
                return jsonify({"error": "No data provided"}), 400
            result = service.create(new_baby_part)
            return jsonify(result), 201
        except PermissionError as e:
            print(f"[ERROR] Permission denied when creating baby part: {e}")
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to create baby part: {e}")
            print(traceback.format_exc())
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg:
                return jsonify({
                    "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
                }), 403
            return jsonify({"error": error_msg}), 500

@baby_part_bp.route('/baby-parts/<path:baby_part_name>', methods=['GET', 'PUT', 'DELETE'])
def baby_part_by_name(baby_part_name):
    """
    GET: Get specific baby part by name
    PUT: Update baby part
    DELETE: Delete baby part
    
    Note: baby_part_name is URL-encoded. We decode it here to handle special characters.
    """
    # Decode URL-encoded string to handle special characters like +, (, ), etc.
    original_name = baby_part_name
    try:
        # Unquote to decode URL encoding (handles %28, %29, %2B, %20, etc.)
        decoded_name = unquote(baby_part_name, encoding='utf-8')
        baby_part_name = decoded_name
        print(f"[DEBUG] Decoded baby_part_name: '{baby_part_name}' (original encoded: '{original_name}')")
    except Exception as e:
        print(f"[WARNING] Error decoding baby_part_name '{original_name}': {e}")
        # Continue with original if decoding fails
        baby_part_name = original_name
    
    if request.method == 'GET':
        try:
            data = service.get_by_baby_part_name(baby_part_name)
            return jsonify(data), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            print(f"[ERROR] Failed to get baby part: {e}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            updated_baby_part = request.get_json()
            if not updated_baby_part:
                return jsonify({"error": "No data provided"}), 400
            result = service.update_by_baby_part_name(baby_part_name, updated_baby_part)
            
            # Check if no changes were detected
            if result.get("no_changes"):
                return jsonify({
                    "ok": True,
                    "message": "No changes detected",
                    "no_changes": True
                }), 200
            
            return jsonify(result), 200
        except PermissionError as e:
            print(f"[ERROR] Permission denied when updating baby part: {e}")
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to update baby part: {e}")
            traceback.print_exc()
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg:
                return jsonify({
                    "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
                }), 403
            return jsonify({"error": error_msg}), 500
    
    elif request.method == 'DELETE':
        try:
            result = service.delete_by_baby_part_name(baby_part_name)
            return jsonify(result), 200
        except PermissionError as e:
            print(f"[ERROR] Permission denied when deleting baby part: {e}")
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to delete baby part: {e}")
            traceback.print_exc()
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg:
                return jsonify({
                    "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
                }), 403
            return jsonify({"error": error_msg}), 500

