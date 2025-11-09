import json
import os
import sys

# Add root directory and backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Set data directory to functions/data for Netlify
os.environ['DATA_DIR'] = os.path.join(os.path.dirname(__file__), 'data')

# Import the API function
sys.path.append(os.path.dirname(__file__))
import api_complete
handler = api_complete.handler

# Test machines endpoint
event = {
    'httpMethod': 'GET',
    'path': '/api/machines',
    'queryStringParameters': {}
}

try:
    result = handler(event, None)
    print(f'Status: {result["statusCode"]}')
    data = json.loads(result["body"])
    print(f'Response length: {len(data)} records')
    if data:
        print(f'First record WSID: {data[0].get("wsid", "N/A")}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
