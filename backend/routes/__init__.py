from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from flask import Flask

from .engineers import engineer_bp
from .machines import machine_bp
from .stock_parts import stock_part_bp
from .fsl_locations import fsl_bp
from .uploads import upload_bp
from .monthly_machines import monthly_machine_bp
from .tools import tool_bp
from .baby_parts import baby_part_bp

def register_routes(app: 'Flask') -> None:
    """
    Register all blueprints with the Flask application
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(engineer_bp, url_prefix='/api')
    app.register_blueprint(machine_bp, url_prefix='/api')
    app.register_blueprint(stock_part_bp, url_prefix='/api')
    app.register_blueprint(fsl_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(monthly_machine_bp, url_prefix='/api')
    app.register_blueprint(tool_bp, url_prefix='/api')
    app.register_blueprint(baby_part_bp, url_prefix='/api')