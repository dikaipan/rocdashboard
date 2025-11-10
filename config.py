import os
from typing import Set

class Config:
    """Application configuration"""
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR: str = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, "data"))
    FRONTEND_DIR: str = os.path.join(BASE_DIR, "frontend")
    DIST_DIR: str = os.path.join(FRONTEND_DIR, "dist")
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    UPLOAD_TOOLS_DIR: str = os.path.join(BASE_DIR, "uploads", "tools")
    
    ALLOWED_EXTENSIONS: Set[str] = {"csv"}
    ALLOWED_IMAGE_EXTENSIONS: Set[str] = {"jpg", "jpeg", "png", "gif", "webp"}
    
    # Flask config
    SECRET_KEY: str = os.environ.get('SECRET_KEY', 'dev-secret-key')
    DEBUG: bool = os.environ.get('DEBUG', 'True') == 'True'
    HOST: str = os.environ.get('HOST', '0.0.0.0')
    PORT: int = int(os.environ.get('PORT', 5000))