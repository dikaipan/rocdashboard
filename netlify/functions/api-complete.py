import json
import os
import sys
from typing import Dict, Any

# Add root directory and backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

# Set data directory to functions/data for Netlify
os.environ['DATA_DIR'] = os.path.join(os.path.dirname(__file__), 'data')

from services.engineer_service import EngineerService
from services.machine_service import MachineService
from services.stock_service import StockPartService
from services.fsl_service import FSLService
from services.monthly_machine_service import MonthlyMachineService

def handler(event, context):
    """Complete Netlify function for all API routes"""
    
    # Get HTTP method and path
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '')
    
    # Parse query parameters
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Parse body for POST/PUT requests
    body = None
    if http_method in ['POST', 'PUT']:
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }
    
    try:
        # Engineers endpoints
        if '/engineers' in path:
            service = EngineerService()
            
            if path.endswith('/engineers') and http_method == 'GET':
                data = service.get_all()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(data)
                }
                
            elif path.endswith('/engineers') and http_method == 'POST':
                if not body:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'No data provided'})
                    }
                result = service.create(body)
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
                
            elif '/engineers/' in path and http_method == 'PUT':
                engineer_id = path.split('/engineers/')[-1]
                result = service.update(engineer_id, body)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
                
            elif '/engineers/' in path and http_method == 'DELETE':
                engineer_id = path.split('/engineers/')[-1]
                result = service.delete(engineer_id)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
        
        # Machines endpoints
        elif '/machines' in path:
            service = MachineService()
            
            if path.endswith('/machines') and http_method == 'GET':
                data = service.get_all()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(data)
                }
                
            elif path.endswith('/machines') and http_method == 'POST':
                if not body:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'No data provided'})
                    }
                result = service.create(body)
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
                
            elif '/machines/' in path and http_method == 'PUT':
                wsid = path.split('/machines/')[-1]
                result = service.update(wsid, body)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
                
            elif '/machines/' in path and http_method == 'DELETE':
                wsid = path.split('/machines/')[-1]
                result = service.delete(wsid)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
        
        # Stock parts endpoints
        elif '/stock-parts' in path:
            service = StockPartService()
            
            if path.endswith('/stock-parts') and http_method == 'GET':
                data = service.get_all()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(data)
                }
                
            elif path.endswith('/stock-parts') and http_method == 'POST':
                if not body:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'No data provided'})
                    }
                result = service.create(body)
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(result)
                }
        
        # FSL locations endpoints
        elif '/fsl-locations' in path:
            service = FSLService()
            
            if path.endswith('/fsl-locations') and http_method == 'GET':
                data = service.get_all()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(data)
                }
        
        # Monthly machines endpoints
        elif '/monthly-machines' in path:
            service = MonthlyMachineService()
            
            if path.endswith('/monthly-machines') and http_method == 'GET':
                data = service.get_all()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(data)
                }
        
        # Endpoint not found
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Endpoint not found'})
        }
            
    except FileNotFoundError as e:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
