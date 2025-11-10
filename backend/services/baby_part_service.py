"""
Baby Part Service - Manages baby parts inventory data
Handles CRUD operations for baby_part.csv
"""
import os
import unicodedata
from backend.services.base_service import BaseService
from typing import Dict, Any
import pandas as pd

class BabyPartService(BaseService):
    """Service for managing baby parts inventory"""
    
    def __init__(self):
        super().__init__(
            file_name="baby_part.csv",
            primary_key="baby_parts",  # Using baby_parts (snake_case) as primary key
            entity_name="baby_part"
        )
    
    def _validate(self, data: Dict[str, Any], is_create: bool = False) -> None:
        """
        Validate baby part data
        
        Args:
            data: Baby part data to validate
            is_create: Whether this is a create operation
            
        Raises:
            ValueError: If validation fails
        """
        # Baby Parts name is required
        baby_part_name = data.get("Baby Parts") or data.get("baby_parts") or data.get("BABY PARTS") or ""
        if not str(baby_part_name).strip():
            raise ValueError("Baby Parts name is required")
        
        # Qty should be numeric if provided
        qty = data.get("Qty") or data.get("qty") or data.get("quantity")
        if qty is not None:
            try:
                qty_value = str(qty).strip()
                if qty_value:
                    if not qty_value.replace('-', '', 1).replace('.', '', 1).isdigit():
                        raise ValueError("Quantity must be a number")
            except (ValueError, AttributeError, TypeError):
                raise ValueError("Quantity must be a valid number")
    
    def _parse_number(self, value: Any) -> int:
        """
        Parse number value, handling various formats
        
        Args:
            value: Value to parse
            
        Returns:
            Integer value (0 if empty or invalid)
        """
        if value is None or value == '' or pd.isna(value):
            return 0
        try:
            return int(float(str(value).strip()))
        except (ValueError, TypeError):
            return 0
    
    def get_all(self) -> list[Dict[str, Any]]:
        """
        Get all baby parts with normalized data
        
        Returns:
            List of baby parts as dictionaries
        """
        df = self._get_dataframe()
        
        # Find the baby parts column
        baby_parts_col = "baby_parts"
        if baby_parts_col not in df.columns:
            possible_names = [col for col in df.columns if 'baby' in col.lower() and 'part' in col.lower()]
            if possible_names:
                baby_parts_col = possible_names[0]
            else:
                # Fallback to first column
                baby_parts_col = df.columns[0] if len(df.columns) > 0 else "baby_parts"
        
        # Find the qty column
        qty_col = "qty"
        if qty_col not in df.columns:
            possible_names = [col for col in df.columns if 'qty' in col.lower() or 'quantity' in col.lower()]
            if possible_names:
                qty_col = possible_names[0]
            else:
                # Fallback to second column if exists
                qty_col = df.columns[1] if len(df.columns) > 1 else "qty"
        
        # Filter out empty rows
        df = df[df[baby_parts_col].notna()]
        df = df[df[baby_parts_col].astype(str).str.strip() != '']
        
        # Normalize data
        normalized = []
        for _, row in df.iterrows():
            baby_part_name = str(row.get(baby_parts_col, "")).strip()
            if not baby_part_name:
                continue
            
            qty = self._parse_number(row.get(qty_col, 0))
            
            normalized.append({
                "id": baby_part_name,
                "baby_parts": baby_part_name,
                "qty": qty,
                "Baby Parts": baby_part_name,  # Original column name for compatibility
                "Qty": qty,  # Original column name for compatibility
            })
        
        return normalized
    
    def _get_original_column_mapping(self) -> Dict[str, str]:
        """
        Get mapping from normalized column names to original CSV column names
        
        Returns:
            Dictionary mapping normalized names to original names
        """
        return {
            "baby_parts": "Baby Parts",
            "qty": "Qty",
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
            original_order = ["Baby Parts", "Qty"]
            # Only include columns that exist
            columns_to_include = [col for col in original_order if col in df_to_save.columns]
            # Add any remaining columns that weren't in the original order
            remaining_cols = [col for col in df_to_save.columns if col not in columns_to_include]
            final_columns = columns_to_include + remaining_cols
            
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
    
    def create(self, baby_part_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new baby part in baby_part.csv format
        
        Args:
            baby_part_data: Baby part data to create
            
        Returns:
            Success response dictionary
        """
        self._validate(baby_part_data, is_create=True)
        
        # Get baby part name
        baby_part_name = baby_part_data.get("Baby Parts") or baby_part_data.get("baby_parts") or baby_part_data.get("BABY PARTS", "")
        
        # Convert to CSV format (snake_case for internal processing)
        csv_data = {
            "baby_parts": baby_part_name,
            "qty": self._parse_number(baby_part_data.get("Qty") or baby_part_data.get("qty") or baby_part_data.get("quantity", 0)),
        }
        
        return super().create(csv_data)
    
    def get_by_baby_part_name(self, baby_part_name: str) -> Dict[str, Any]:
        """
        Get baby part by name
        Args:
            baby_part_name: Baby part name to find
        Returns:
            Baby part as dictionary
        Raises:
            ValueError: If baby part not found
        """
        df = self._get_dataframe()

        baby_parts_col = "baby_parts"
        if baby_parts_col not in df.columns:
            possible_names = [col for col in df.columns if 'baby' in col.lower() and 'part' in col.lower()]
            if possible_names:
                baby_parts_col = possible_names[0]
            else:
                raise ValueError(f"Baby Parts column not found in data. Available columns: {list(df.columns)}")

        df = df[df[baby_parts_col].notna()]
        df = df[df[baby_parts_col].astype(str).str.strip() != '']

        # Normalize for comparison: strip whitespace, normalize unicode, and convert to string
        search_name = str(baby_part_name).strip()
        # Normalize unicode characters (handles different unicode representations)
        search_name_normalized = unicodedata.normalize('NFKC', search_name)
        
        # Normalize all baby part names in dataframe for comparison
        df['_normalized_baby_part_name'] = df[baby_parts_col].astype(str).str.strip().apply(
            lambda x: unicodedata.normalize('NFKC', x) if pd.notna(x) else ''
        )
        
        # Try exact match first (case-sensitive, but normalized)
        matching = df[df['_normalized_baby_part_name'] == search_name_normalized]
        
        # If not found, try case-insensitive match
        if matching.empty:
            matching = df[df['_normalized_baby_part_name'].str.lower() == search_name_normalized.lower()]
        
        # Debug: print available baby part names if not found
        if matching.empty:
            available_names = df[baby_parts_col].astype(str).str.strip().tolist()[:10]  # First 10 for debugging
            available_normalized = df['_normalized_baby_part_name'].tolist()[:10]
            print(f"[DEBUG BabyPartService] Baby part '{search_name}' (normalized: '{search_name_normalized}') not found.")
            print(f"[DEBUG BabyPartService] Available names (first 10): {available_names}")
            print(f"[DEBUG BabyPartService] Available normalized (first 10): {available_normalized}")
            raise ValueError(f"Baby part with name '{search_name}' not found")
        
        # Get the baby part data
        baby_part = matching.to_dict(orient="records")[0]
        part_name = str(baby_part.get(baby_parts_col, "")).strip()
        
        # Find qty column
        qty_col = "qty"
        if qty_col not in df.columns:
            possible_names = [col for col in df.columns if 'qty' in col.lower() or 'quantity' in col.lower()]
            if possible_names:
                qty_col = possible_names[0]
            else:
                qty_col = df.columns[1] if len(df.columns) > 1 else "qty"
        
        qty = self._parse_number(baby_part.get(qty_col, 0))
        
        # Normalize using snake_case column names
        return {
            "id": part_name,
            "baby_parts": part_name,
            "qty": qty,
            "Baby Parts": part_name,
            "Qty": qty,
        }
    
    def update_by_baby_part_name(self, baby_part_name: str, updated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update baby part by name
        
        Args:
            baby_part_name: Baby part name to find
            updated_data: Data to update
            
        Returns:
            Success response dictionary with 'no_changes' flag if no changes detected
        """
        # Find the baby part first to get the exact name and current data
        try:
            baby_part = self.get_by_baby_part_name(baby_part_name)
            part_name = baby_part.get("Baby Parts") or baby_part.get("baby_parts") or baby_part_name
        except ValueError:
            # Baby part doesn't exist, use the provided name
            part_name = baby_part_name
            baby_part = None
        
        # Normalize function for comparison
        def normalize_value(value):
            if value is None:
                return ''
            if isinstance(value, (int, float)):
                return int(value) if isinstance(value, float) and value.is_integer() else value
            return str(value).strip()
        
        # Get current values from baby part (if exists)
        if baby_part:
            current_data = {
                "baby_parts": part_name,
                "qty": self._parse_number(baby_part.get("qty") or baby_part.get("Qty") or 0),
            }
        else:
            current_data = {}
        
        # Convert updated_data to CSV format (snake_case)
        new_part_name = updated_data.get("baby_parts") or updated_data.get("Baby Parts", part_name)
        new_data = {
            "baby_parts": new_part_name,
            "qty": self._parse_number(updated_data.get("qty") or updated_data.get("Qty") or updated_data.get("quantity") or 0),
        }
        
        # Compare current data with new data to detect changes
        if baby_part:  # Only check if baby part exists (edit mode)
            has_changes = False
            
            # Compare each field
            if normalize_value(current_data.get("baby_parts")) != normalize_value(new_data.get("baby_parts")):
                has_changes = True
            elif normalize_value(current_data.get("qty")) != normalize_value(new_data.get("qty")):
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
            "baby_parts": new_data["baby_parts"],
            "qty": new_data["qty"],
        }
        
        return super().update(part_name, csv_data)
    
    def delete_by_baby_part_name(self, baby_part_name: str) -> Dict[str, Any]:
        """
        Delete baby part by name
        
        Args:
            baby_part_name: Baby part name to delete
            
        Returns:
            Success response dictionary
        """
        # Find the baby part first to get the exact name
        try:
            baby_part = self.get_by_baby_part_name(baby_part_name)
            part_name = baby_part.get("Baby Parts") or baby_part.get("baby_parts") or baby_part_name
        except ValueError:
            # Baby part doesn't exist, use the provided name
            part_name = baby_part_name
        
        return super().delete(part_name)

