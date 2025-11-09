#!/usr/bin/env python3
"""Convert CSV files to JSON for static hosting"""

import csv
import json
import os

def csv_to_json(csv_file, json_file):
    """Convert CSV file to JSON"""
    data = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert empty strings to None
            cleaned_row = {k: (None if v == '' else v) for k, v in row.items()}
            data.append(cleaned_row)
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Converted {csv_file} -> {json_file} ({len(data)} records)")

def main():
    # Create API directory in frontend/public
    api_dir = os.path.join('frontend', 'public', 'api')
    os.makedirs(api_dir, exist_ok=True)
    
    # Convert all CSV files
    conversions = [
        ('data/data_mesin.csv', 'api/machines.json'),
        ('data/data_ce.csv', 'api/engineers.json'),
        ('data/stok_part.csv', 'api/stock-parts.json'),
        ('data/alamat_fsl.csv', 'api/fsl-locations.json'),
        ('data/data_mesin_perbulan.csv', 'api/monthly-machines.json'),
    ]
    
    for csv_file, json_file in conversions:
        json_path = os.path.join('frontend', 'public', json_file)
        if os.path.exists(csv_file):
            csv_to_json(csv_file, json_path)
        else:
            print(f"⚠️  Warning: {csv_file} not found")
    
    print("\n✅ All CSV files converted to JSON!")

if __name__ == '__main__':
    main()
