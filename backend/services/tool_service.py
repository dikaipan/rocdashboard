"""
Tool Service - Manages tools inventory data
Handles CRUD operations for stock_detail.csv
"""
import os
import unicodedata
from backend.services.base_service import BaseService
from typing import Dict, Any
import pandas as pd

class ToolService(BaseService):
    """Service for managing tools inventory"""
    
    def __init__(self):
        super().__init__(
            file_name="stock_detail.csv",
            primary_key="part_name",  # Using part_name (snake_case) as primary key
            entity_name="tool"
        )
        self.tools_name_key = "part_name"  # Store tools name column separately (snake_case)
    
    def _validate(self, data: Dict[str, Any], is_create: bool = False) -> None:
        """
        Validate tool data
        
        Args:
            data: Tool data to validate
            is_create: Whether this is a create operation
            
        Raises:
            ValueError: If validation fails
        """
        # Part Name (tools name) is required
        part_name = data.get("Part Name") or data.get("tools_name") or data.get("TOOLS NAME") or ""
        if not str(part_name).strip():
            raise ValueError("Part Name is required")
        
        # Total (current stock) should be numeric if provided
        total_stock = data.get("Total") or data.get("current_stock") or data.get("CURRENT STOCK")
        if total_stock is not None:
            try:
                stock_value = str(total_stock).strip()
                if stock_value:
                    if not stock_value.replace('-', '', 1).replace('.', '', 1).isdigit():
                        raise ValueError("Total stock must be a number")
            except (ValueError, AttributeError, TypeError):
                raise ValueError("Total stock must be a valid number")
    
    def get_all(self) -> list[Dict[str, Any]]:
        """
        Get all tools with normalized column names from stock_detail.csv
        
        Returns:
            List of all tools as dictionaries
        """
        df = self._get_dataframe()
        
        # Debug: Print available columns
        print(f"[DEBUG ToolService] Available columns: {list(df.columns)}")
        print(f"[DEBUG ToolService] DataFrame shape: {df.shape}")
        if not df.empty:
            print(f"[DEBUG ToolService] First row sample: {df.iloc[0].to_dict()}")
        
        # Columns are normalized to snake_case by read_csv_normalized
        # "Part Name" -> "part_name", "Detail Specification" -> "detail_specification", etc.
        # Empty columns become "unnamed_1", "unnamed_2", etc.
        part_name_col = "part_name"
        
        # Check if column exists
        if part_name_col not in df.columns:
            # Try to find the column (case-insensitive or with variations)
            possible_names = [col for col in df.columns if 'part' in col.lower() and 'name' in col.lower()]
            if possible_names:
                part_name_col = possible_names[0]
                print(f"[DEBUG ToolService] Found part_name column: {part_name_col}")
            else:
                # Return empty if column not found
                print(f"[ERROR ToolService] Column 'part_name' not found in stock_detail.csv.")
                print(f"[ERROR ToolService] Available columns: {list(df.columns)}")
                return []
        
        # Filter out empty rows (rows where part_name is empty or NaN)
        df = df[df[part_name_col].notna()]
        df = df[df[part_name_col].astype(str).str.strip() != '']
        
        print(f"[DEBUG ToolService] After filtering empty rows: {df.shape}")
        
        # Convert to list of dictionaries
        tools = df.to_dict(orient="records")
        
        # Normalize column names and add computed fields
        normalized_tools = []
        for tool in tools:
            # Use snake_case column names (normalized by read_csv_normalized)
            part_name = str(tool.get(part_name_col, "")).strip()
            if not part_name:  # Skip empty part names
                continue
                
            normalized = {
                "id": part_name,  # Use Part Name as ID
                "tools_name": part_name,
                "current_stock": self._parse_number(tool.get("total", 0)),
                "stock_new": self._parse_number(tool.get("new", 0)),
                "stock_old": self._parse_number(tool.get("old", 0)),
                "stock_detail": str(tool.get("detail_specification", "")).strip(),  # Detail Specification
                "photo": str(tool.get("picture", "")).strip(),  # Picture column
                "uom": str(tool.get("uom", "Pcs")).strip(),  # Unit of Measure
                "remark": str(tool.get("remark", "")).strip(),  # Remark
                "description": str(tool.get("detail_specification", "")).strip(),  # Detail Specification as description
                # Keep original columns for compatibility (using original CSV names)
                "Part Name": part_name,
                "Detail Specification": str(tool.get("detail_specification", "")).strip(),
                "Picture": str(tool.get("picture", "")).strip(),
                "Total": self._parse_number(tool.get("total", 0)),
                "NEW": self._parse_number(tool.get("new", 0)),
                "OLD": self._parse_number(tool.get("old", 0)),
                "UOM": str(tool.get("uom", "Pcs")).strip(),
                "Remark": str(tool.get("remark", "")).strip(),
            }
            normalized_tools.append(normalized)
        
        print(f"[DEBUG ToolService] Returning {len(normalized_tools)} tools")
        return normalized_tools
    
    def _parse_number(self, value) -> int:
        """Parse number from string, return 0 if invalid"""
        try:
            if pd.isna(value) or value == '':
                return 0
            return int(float(str(value).strip()))
        except (ValueError, TypeError):
            return 0
    
    def _get_original_column_mapping(self) -> Dict[str, str]:
        """Map normalized column names back to original CSV column names"""
        return {
            "part_name": "Part Name",
            "brand": "Brand",  # Keep Brand column for CSV structure (but will be empty)
            "detail_specification": "Detail Specification",
            "picture": "Picture",
            "total": "Total",
            "new": "NEW",
            "old": "OLD",
            "uom": "UOM",
            "remark": "Remark",
        }
    
    def _save_dataframe(self, df: pd.DataFrame) -> None:
        """
        Save dataframe to CSV file with original column names
        
        Override base method to preserve original CSV column format
        """
        try:
            # Rename columns back to original format
            column_mapping = self._get_original_column_mapping()
            df_to_save = df.copy()
            
            # Only rename columns that exist in the dataframe
            rename_dict = {k: v for k, v in column_mapping.items() if k in df_to_save.columns}
            if rename_dict:
                df_to_save = df_to_save.rename(columns=rename_dict)
            
            # Reorder columns to match original CSV format
            # Note: Brand column is kept but will be empty (to preserve CSV structure)
            original_order = ["Part Name", "Brand", "Detail Specification", "Picture", "Total", "NEW", "OLD", "UOM", "Remark"]
            # Only include columns that exist
            columns_to_include = [col for col in original_order if col in df_to_save.columns]
            # Add any remaining columns that weren't in the original order
            remaining_cols = [col for col in df_to_save.columns if col not in columns_to_include]
            final_columns = columns_to_include + remaining_cols
            
            # Ensure Brand column exists (even if empty) to preserve CSV structure
            if "Brand" not in df_to_save.columns:
                df_to_save["Brand"] = ""
            
            df_to_save = df_to_save[final_columns]
            
            # Check if file exists and is writable
            if os.path.exists(self.file_path):
                # Check write permission
                if not os.access(self.file_path, os.W_OK):
                    raise PermissionError(
                        f"File '{self.file_path}' is read-only or locked. "
                        "Please close the file if it's open in another application (Excel, Notepad, etc.) "
                        "and ensure you have write permissions."
                    )
                
                # Try to open file in write mode to check if it's locked
                try:
                    with open(self.file_path, 'r+', encoding='utf-8') as test_file:
                        test_file.read(1)  # Try to read first byte
                        test_file.seek(0)  # Reset to beginning
                except (IOError, OSError) as e:
                    if e.errno == 13:  # Permission denied
                        raise PermissionError(
                            f"Permission denied: Cannot write to file '{self.file_path}'. "
                            "The file may be:\n"
                            "1. Open in another application (Excel, Notepad, etc.) - Please close it\n"
                            "2. Set to read-only - Check file properties and remove read-only attribute\n"
                            "3. Locked by another process - Restart your computer if needed\n"
                            "4. Protected by antivirus - Check antivirus settings"
                        )
                    else:
                        raise IOError(
                            f"Cannot access file '{self.file_path}'. "
                            f"Error: {str(e)}"
                        )
            
            # Save with original column names
            try:
                df_to_save.to_csv(self.file_path, index=False, encoding='utf-8')
            except PermissionError as e:
                # Re-raise with more context
                raise PermissionError(
                    f"Permission denied: Cannot save to file '{self.file_path}'. "
                    f"Error: {str(e)}\n"
                    "Please ensure:\n"
                    "1. The file is not open in Excel, Notepad, or any other application\n"
                    "2. You have write permissions to the file and directory\n"
                    "3. The file is not set to read-only\n"
                    "4. No antivirus is blocking file access"
                )
            except IOError as e:
                raise IOError(
                    f"Cannot write to file '{self.file_path}'. "
                    f"Error: {str(e)}\n"
                    "Please close the file if it's open in another application."
                )
                
        except PermissionError:
            # Re-raise PermissionError as-is (already has detailed message)
            raise
        except IOError as e:
            # Convert IOError to more user-friendly message
            raise IOError(
                f"Cannot write to file '{self.file_path}'. "
                f"Error: {str(e)}\n"
                "Please ensure the file is not open in another application."
            )
        except Exception as e:
            # Catch any other errors and provide context
            error_msg = str(e)
            if "Permission denied" in error_msg or "Errno 13" in error_msg or "[Errno 13]" in error_msg:
                raise PermissionError(
                    f"Permission denied: Cannot save to file '{self.file_path}'. "
                    "Please close the file if it's open in Excel, Notepad, or any other application, "
                    "and ensure you have write permissions."
                )
            else:
                raise Exception(f"Failed to save {self.entity_name} data: {error_msg}")
    
    def create(self, tool_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new tool in stock_detail.csv format
        
        Args:
            tool_data: Tool data to create
            
        Returns:
            Success response dictionary
        """
        part_name = tool_data.get("tools_name") or tool_data.get("Part Name") or tool_data.get("TOOLS NAME", "")
        if not part_name:
            raise ValueError("Part Name is required")
        
        # Convert normalized fields to CSV format (snake_case for internal processing)
        # Note: BaseService will handle saving, but we need to use the normalized column names
        # Brand column is kept empty to preserve CSV structure
        csv_data = {
            "part_name": part_name,  # snake_case for internal use
            "brand": "",  # Keep Brand column but empty (to preserve CSV structure)
            "detail_specification": tool_data.get("stock_detail") or tool_data.get("Detail Specification") or tool_data.get("description", ""),
            "picture": tool_data.get("photo") or tool_data.get("Picture", ""),
            "total": self._parse_number(tool_data.get("current_stock") or tool_data.get("Total", 0)),
            "new": self._parse_number(tool_data.get("stock_new") or tool_data.get("NEW", 0)),
            "old": self._parse_number(tool_data.get("stock_old") or tool_data.get("OLD", 0)),
            "uom": tool_data.get("uom") or tool_data.get("UOM", "Pcs"),
            "remark": tool_data.get("remark") or tool_data.get("Remark", ""),
        }
        
        return super().create(csv_data)
    
    def get_by_tools_name(self, tools_name: str) -> Dict[str, Any]:
        """
        Get tool by Part Name
        
        Args:
            tools_name: Part Name to find
            
        Returns:
            Tool as dictionary
            
        Raises:
            ValueError: If tool not found
        """
        df = self._get_dataframe()
        
        # Columns are normalized to snake_case
        part_name_col = "part_name"
        
        if part_name_col not in df.columns:
            # Try to find the column
            possible_names = [col for col in df.columns if 'part' in col.lower() and 'name' in col.lower()]
            if possible_names:
                part_name_col = possible_names[0]
            else:
                raise ValueError(f"Part Name column not found in data. Available columns: {list(df.columns)}")
        
        # Filter out empty rows
        df = df[df[part_name_col].notna()]
        df = df[df[part_name_col].astype(str).str.strip() != '']
        
        # Normalize for comparison: strip whitespace, normalize unicode, and convert to string
        search_name = str(tools_name).strip()
        # Normalize unicode characters (handles different unicode representations)
        search_name_normalized = unicodedata.normalize('NFKC', search_name)
        
        # Normalize all part names in dataframe for comparison
        df['_normalized_part_name'] = df[part_name_col].astype(str).str.strip().apply(
            lambda x: unicodedata.normalize('NFKC', x) if pd.notna(x) else ''
        )
        
        # Try exact match first (case-sensitive, but normalized)
        matching = df[df['_normalized_part_name'] == search_name_normalized]
        
        # If not found, try case-insensitive match
        if matching.empty:
            matching = df[df['_normalized_part_name'].str.lower() == search_name_normalized.lower()]
        
        # Debug: print available part names if not found
        if matching.empty:
            available_names = df[part_name_col].astype(str).str.strip().tolist()[:10]  # First 10 for debugging
            available_normalized = df['_normalized_part_name'].tolist()[:10]
            print(f"[DEBUG ToolService] Tool '{search_name}' (normalized: '{search_name_normalized}') not found.")
            print(f"[DEBUG ToolService] Available names (first 10): {available_names}")
            print(f"[DEBUG ToolService] Available normalized (first 10): {available_normalized}")
            print(f"[DEBUG ToolService] Search name type: {type(search_name)}, length: {len(search_name)}")
            print(f"[DEBUG ToolService] Search name repr: {repr(search_name)}")
            print(f"[DEBUG ToolService] Search name bytes: {search_name.encode('utf-8')}")
            # Check if there's a similar match (fuzzy) - check if search_name is contained in any part name
            similar_matches = df[df['_normalized_part_name'].str.contains(search_name_normalized, case=False, na=False, regex=False)]
            if not similar_matches.empty:
                similar_names = similar_matches[part_name_col].astype(str).str.strip().tolist()
                print(f"[DEBUG ToolService] Similar matches found (contains '{search_name_normalized}'): {similar_names}")
            # Also check reverse - if any part name is contained in search_name
            reverse_matches = df[df['_normalized_part_name'].apply(lambda x: search_name_normalized in x if pd.notna(x) else False)]
            if not reverse_matches.empty:
                reverse_names = reverse_matches[part_name_col].astype(str).str.strip().tolist()
                print(f"[DEBUG ToolService] Reverse matches found (search_name contains part_name): {reverse_names}")
            raise ValueError(f"Tool with part_name '{search_name}' not found")
        
        # Get the tool data before cleaning up
        tool = matching.to_dict(orient="records")[0]
        part_name = str(tool.get(part_name_col, "")).strip()
        
        # Normalize using snake_case column names
        return {
            "id": part_name,
            "tools_name": part_name,
            "current_stock": self._parse_number(tool.get("total", 0)),
            "stock_new": self._parse_number(tool.get("new", 0)),
            "stock_old": self._parse_number(tool.get("old", 0)),
            "stock_detail": str(tool.get("detail_specification", "")).strip(),
            "photo": str(tool.get("picture", "")).strip(),
            "uom": str(tool.get("uom", "Pcs")).strip(),
            "remark": str(tool.get("remark", "")).strip(),
            "description": str(tool.get("detail_specification", "")).strip(),
            # Keep original columns for compatibility
            "Part Name": part_name,
            "Detail Specification": str(tool.get("detail_specification", "")).strip(),
            "Picture": str(tool.get("picture", "")).strip(),
            "Total": self._parse_number(tool.get("total", 0)),
            "NEW": self._parse_number(tool.get("new", 0)),
            "OLD": self._parse_number(tool.get("old", 0)),
            "UOM": str(tool.get("uom", "Pcs")).strip(),
            "Remark": str(tool.get("remark", "")).strip(),
        }
    
    def update_by_tools_name(self, tools_name: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update tool by Part Name
        
        Args:
            tools_name: Part Name to find
            updated_data: Data to update
            
        Returns:
            Success response dictionary with 'no_changes' flag if no changes detected
            
        Raises:
            ValueError: If no changes detected (to avoid unnecessary file writes)
        """
        # Find the tool first to get the exact Part Name and current data
        try:
            tool = self.get_by_tools_name(tools_name)
            part_name = tool.get("Part Name") or tool.get("tools_name") or tools_name
        except ValueError:
            # Tool doesn't exist, use the provided name
            part_name = tools_name
            tool = None
        
        # Normalize function for comparison
        def normalize_value(value):
            if value is None:
                return ''
            if isinstance(value, (int, float)):
                return int(value) if isinstance(value, float) and value.is_integer() else value
            return str(value).strip()
        
        # Get current values from tool (if exists)
        if tool:
            current_data = {
                "part_name": part_name,
                "detail_specification": str(tool.get("stock_detail") or tool.get("Detail Specification") or tool.get("detail_specification") or "").strip(),
                "picture": str(tool.get("photo") or tool.get("Picture") or "").strip(),
                "total": self._parse_number(tool.get("current_stock") or tool.get("Total") or 0),
                "new": self._parse_number(tool.get("stock_new") or tool.get("NEW") or 0),
                "old": self._parse_number(tool.get("stock_old") or tool.get("OLD") or 0),
                "uom": str(tool.get("uom") or tool.get("UOM") or "Pcs").strip(),
                "remark": str(tool.get("remark") or tool.get("Remark") or "").strip(),
            }
        else:
            current_data = {}
        
        # Convert updated_data to CSV format (snake_case)
        new_part_name = updated_data.get("tools_name") or updated_data.get("Part Name", part_name)
        new_data = {
            "part_name": new_part_name,
            "detail_specification": str(updated_data.get("stock_detail") or updated_data.get("Detail Specification") or updated_data.get("description") or "").strip(),
            "picture": str(updated_data.get("photo") or updated_data.get("Picture") or "").strip(),
            "total": self._parse_number(updated_data.get("current_stock") or updated_data.get("Total") or 0),
            "new": self._parse_number(updated_data.get("stock_new") or updated_data.get("NEW") or 0),
            "old": self._parse_number(updated_data.get("stock_old") or updated_data.get("OLD") or 0),
            "uom": str(updated_data.get("uom") or updated_data.get("UOM") or "Pcs").strip(),
            "remark": str(updated_data.get("remark") or updated_data.get("Remark") or "").strip(),
        }
        
        # Compare current data with new data to detect changes
        if tool:  # Only check if tool exists (edit mode)
            has_changes = False
            
            # Compare each field
            if normalize_value(current_data.get("part_name")) != normalize_value(new_data.get("part_name")):
                has_changes = True
            elif normalize_value(current_data.get("detail_specification")) != normalize_value(new_data.get("detail_specification")):
                has_changes = True
            elif normalize_value(current_data.get("picture")) != normalize_value(new_data.get("picture")):
                has_changes = True
            elif normalize_value(current_data.get("total")) != normalize_value(new_data.get("total")):
                has_changes = True
            elif normalize_value(current_data.get("new")) != normalize_value(new_data.get("new")):
                has_changes = True
            elif normalize_value(current_data.get("old")) != normalize_value(new_data.get("old")):
                has_changes = True
            elif normalize_value(current_data.get("uom")) != normalize_value(new_data.get("uom")):
                has_changes = True
            elif normalize_value(current_data.get("remark")) != normalize_value(new_data.get("remark")):
                has_changes = True
            
            # If no changes detected, return special response
            if not has_changes:
                return {
                    "ok": True,
                    "message": "No changes detected",
                    "no_changes": True
                }
        
        # There are changes, proceed with update
        csv_data = {
            "part_name": new_data["part_name"],
            "brand": "",  # Keep Brand column but empty
            "detail_specification": new_data["detail_specification"],
            "picture": new_data["picture"],
            "total": new_data["total"],
            "new": new_data["new"],
            "old": new_data["old"],
            "uom": new_data["uom"],
            "remark": new_data["remark"],
        }
        
        return super().update(part_name, csv_data)
    
    def delete_by_tools_name(self, tools_name: str) -> Dict[str, Any]:
        """
        Delete tool by Part Name
        
        Args:
            tools_name: Part Name to find
            
        Returns:
            Success response dictionary
        """
        # Find the tool first to get the exact Part Name
        tool = self.get_by_tools_name(tools_name)
        part_name = tool.get("Part Name") or tool.get("tools_name") or tools_name
        
        return super().delete(part_name)
    
    def bulk_upsert(self, tools_data: list[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Bulk insert or update tools (for CSV import)
        
        Override base method to normalize data before upserting
        
        Args:
            tools_data: List of tool data dictionaries
            
        Returns:
            Success response dictionary
        """
        if not tools_data:
            raise ValueError("No data provided")
        
        # Normalize each tool data to CSV format
        normalized_tools = []
        for tool_data in tools_data:
            part_name = tool_data.get("tools_name") or tool_data.get("Part Name") or tool_data.get("TOOLS NAME", "")
            if not part_name:
                continue  # Skip tools without Part Name
            
            # Convert to CSV format (same as create method)
            csv_data = {
                "part_name": part_name,
                "brand": "",  # Keep Brand column but empty
                "detail_specification": tool_data.get("stock_detail") or tool_data.get("Detail Specification") or tool_data.get("description", ""),
                "picture": tool_data.get("photo") or tool_data.get("Picture", ""),
                "total": self._parse_number(tool_data.get("current_stock") or tool_data.get("Total", 0)),
                "new": self._parse_number(tool_data.get("stock_new") or tool_data.get("NEW", 0)),
                "old": self._parse_number(tool_data.get("stock_old") or tool_data.get("OLD", 0)),
                "uom": tool_data.get("uom") or tool_data.get("UOM", "Pcs"),
                "remark": tool_data.get("remark") or tool_data.get("Remark", ""),
            }
            normalized_tools.append(csv_data)
        
        # Use parent's bulk_upsert with normalized data
        return super().bulk_upsert(normalized_tools)

