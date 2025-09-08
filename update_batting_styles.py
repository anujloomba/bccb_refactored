import json

# List of JSON files to update
json_files = ['cricket_stats.json', 'cricket_stats_new.json']

for filename in json_files:
    try:
        # Read and update the file
        with open(filename, 'r') as f:
            data = f.read()

        # Replace batting style abbreviations with full words
        data = data.replace('"Batting_Style": "R"', '"Batting_Style": "Reliable"')
        data = data.replace('"Batting_Style": "S"', '"Batting_Style": "So-So"')
        data = data.replace('"Batting_Style": "U"', '"Batting_Style": "Tailend"')

        # Write back to file
        with open(filename, 'w') as f:
            f.write(data)

        print(f'✅ Updated batting styles in {filename}')

        # Verify changes
        with open(filename, 'r') as f:
            content = f.read()
            reliable_count = content.count('"Batting_Style": "Reliable"')
            soso_count = content.count('"Batting_Style": "So-So"')
            tailend_count = content.count('"Batting_Style": "Tailend"')
            print(f'📊 {filename}: {reliable_count} Reliable, {soso_count} So-So, {tailend_count} Tailend')
    except FileNotFoundError:
        print(f'⚠️ File {filename} not found, skipping')

print('\n🎯 All batting style updates completed!')
