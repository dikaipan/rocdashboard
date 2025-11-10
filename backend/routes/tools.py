"""
Tools API Routes
Handles CRUD operations for tools inventory
"""
from flask import Blueprint, jsonify, request
from urllib.parse import unquote
from backend.services.tool_service import ToolService

tool_bp = Blueprint('tools', __name__)
service = ToolService()

@tool_bp.route('/tools', methods=['GET', 'POST'])
def tools():
    """
    GET: Retrieve all tools with optional filtering and pagination
    POST: Create new tool
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
                # Search in: tools_name, description, stock_detail, remark
                data = search_dict_list(data, search, [
                    'tools_name', 
                    'Part Name', 
                    'TOOLS NAME', 
                    'description', 
                    'stock_detail', 
                    'Detail Specification',
                    'remark',
                    'Remark'
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
            print(f"[ERROR] Failed to get tools: {e}")
            print(traceback.format_exc())
            return jsonify({"error": str(e), "data": []}), 500
    
    elif request.method == 'POST':
        try:
            new_tool = request.get_json()
            if not new_tool:
                return jsonify({"error": "No data provided"}), 400
            result = service.create(new_tool)
            return jsonify(result), 201
        except PermissionError as e:
            print(f"[ERROR] Permission denied when creating tool: {e}")
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to create tool: {e}")
            print(traceback.format_exc())
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg:
                return jsonify({
                    "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
                }), 403
            return jsonify({"error": error_msg}), 500

@tool_bp.route('/tools/<path:tools_name>', methods=['GET', 'PUT', 'DELETE'])
def tool_by_name(tools_name):
    """
    GET: Get specific tool by tools name
    PUT: Update tool
    DELETE: Delete tool
    
    Note: tools_name is URL-encoded. We decode it here to handle special characters.
    """
    # Decode URL-encoded string to handle special characters like +, (, ), etc.
    # Flask's path converter handles some encoding, but we need to ensure proper decoding
    original_name = tools_name
    try:
        # Unquote to decode URL encoding (handles %28, %29, %2B, %20, etc.)
        # This handles characters like: space -> %20, ( -> %28, ) -> %29, + -> %2B, # -> %23
        decoded_name = unquote(tools_name, encoding='utf-8')
        tools_name = decoded_name
        print(f"[DEBUG] Decoded tools_name: '{tools_name}' (original encoded: '{original_name}')")
    except Exception as e:
        print(f"[WARNING] Error decoding tools_name '{original_name}': {e}")
        # Continue with original if decoding fails
        tools_name = original_name
    
    if request.method == 'GET':
        try:
            data = service.get_by_tools_name(tools_name)
            return jsonify(data), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            print(f"[ERROR] Failed to get tool: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            updated_tool = request.get_json()
            if not updated_tool:
                return jsonify({"error": "No data provided"}), 400
            result = service.update_by_tools_name(tools_name, updated_tool)
            
            # Check if no changes were detected
            if result.get("no_changes"):
                return jsonify({
                    "ok": True,
                    "message": "No changes detected",
                    "no_changes": True
                }), 200
            
            return jsonify(result), 200
        except PermissionError as e:
            print(f"[ERROR] Permission denied when updating tool: {e}")
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to update tool: {e}")
            traceback.print_exc()
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg:
                return jsonify({
                    "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
                }), 403
            return jsonify({"error": error_msg}), 500
    
    elif request.method == 'DELETE':
        try:
            result = service.delete_by_tools_name(tools_name)
            return jsonify(result), 200
        except PermissionError as e:
            print(f"[ERROR] Permission denied when deleting tool: {e}")
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            import traceback
            print(f"[ERROR] Failed to delete tool: {e}")
            traceback.print_exc()
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg:
                return jsonify({
                    "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
                }), 403
            return jsonify({"error": error_msg}), 500

@tool_bp.route('/tools/bulk-upsert', methods=['POST'])
def bulk_upsert_tools():
    """
    Bulk insert or update tools (untuk CSV import)
    """
    try:
        tools_data = request.get_json()
        if not tools_data or not isinstance(tools_data, list):
            return jsonify({"error": "Expected array of tools"}), 400
        
        result = service.bulk_upsert(tools_data)
        return jsonify(result), 200
    except PermissionError as e:
        print(f"[ERROR] Permission denied when bulk upserting tools: {e}")
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to bulk upsert tools: {e}")
        traceback.print_exc()
        error_msg = str(e)
        if "Permission denied" in error_msg or "Errno 13" in error_msg:
            return jsonify({
                "error": "Permission denied: Cannot save to file. Please close the file if it's open in Excel, Notepad, or any other application, and ensure you have write permissions."
            }), 403
        return jsonify({"error": error_msg}), 500

