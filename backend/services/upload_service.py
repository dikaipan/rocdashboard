import os
from typing import Dict, Any, BinaryIO
import pandas as pd
from io import BytesIO
from config import Config
from backend.utils.csv_utils import read_csv_normalized

class UploadService:
    """Service for file upload and export operations"""
    
    def upload_csv(self, file: Any, target: str) -> Dict[str, Any]:
        """Upload and save CSV file"""
        # Determine destination
        if target == "machines":
            dest = os.path.join(Config.DATA_DIR, "data_mesin.csv")
        elif target == "engineers":
            dest = os.path.join(Config.DATA_DIR, "data_ce.csv")
        elif target == "stock-parts":
            dest = os.path.join(Config.DATA_DIR, "stok_part.csv")
        elif target == "so":
            dest = os.path.join(Config.DATA_DIR, "so_apr_spt.csv")
        else:
            raise ValueError(f"Invalid target: {target}")
        
        # Save file
        file.save(dest)
        
        # Validate by reading
        try:
            read_csv_normalized(dest)
        except Exception as e:
            # If validation fails, remove the file
            if os.path.exists(dest):
                os.remove(dest)
            raise Exception(f"Invalid CSV format: {e}")
        
        return {"ok": True, "message": f"{target} data uploaded successfully"}
    
    def export_to_excel(self) -> BytesIO:
        """Export all data to Excel"""
        machines_path = os.path.join(Config.DATA_DIR, "data_mesin.csv")
        engineers_path = os.path.join(Config.DATA_DIR, "data_ce.csv")
        stock_parts_path = os.path.join(Config.DATA_DIR, "stok_part.csv")
        
        if not any(os.path.exists(p) for p in [machines_path, engineers_path, stock_parts_path]):
            raise FileNotFoundError("No data files found")
        
        writer = BytesIO()
        
        with pd.ExcelWriter(writer, engine="openpyxl") as xw:
            # Export machines
            if os.path.exists(machines_path):
                try:
                    machines_df = read_csv_normalized(machines_path)
                    if not machines_df.empty:
                        machines_df.to_excel(xw, sheet_name="machines", index=False)
                except Exception as e:
                    print(f"[ERROR] Error exporting machines: {e}")
            
            # Export engineers
            if os.path.exists(engineers_path):
                try:
                    engineers_df = read_csv_normalized(engineers_path)
                    if not engineers_df.empty:
                        engineers_df.to_excel(xw, sheet_name="engineers", index=False)
                except Exception as e:
                    print(f"[ERROR] Error exporting engineers: {e}")
            
            # Export stock parts
            if os.path.exists(stock_parts_path):
                try:
                    stock_parts_df = read_csv_normalized(stock_parts_path)
                    if not stock_parts_df.empty:
                        stock_parts_df.to_excel(xw, sheet_name="stock_parts", index=False)
                except Exception as e:
                    print(f"[ERROR] Error exporting stock parts: {e}")
        
        writer.seek(0)
        return writer