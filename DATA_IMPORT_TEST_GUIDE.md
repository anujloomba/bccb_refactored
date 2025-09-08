# Cricket Data Management Test Guide

## Updated Import Functionality

The import function has been enhanced to automatically guide users to look for cricket backup files in the Downloads folder.

### Key Changes:

1. **Smart File Detection**: Import now specifically looks for files with pattern `cricket-data-backup-*.json`
2. **Enhanced Validation**: Validates backup file format including version and export date
3. **Better User Guidance**: Clear instructions about expected file location and naming
4. **Automatic Backup**: Creates auto-backup before import for safety
5. **Detailed Logging**: Comprehensive console logging for debugging

### How to Test:

1. **Export Data**:
   ```
   - Go to Settings → Data Management
   - Click "Export Data" 
   - File saves as: cricket-data-backup-YYYY-MM-DD.json in Downloads
   ```

2. **Import Data**:
   ```
   - Click "Import Data"
   - File picker opens with instruction to select from Downloads
   - Only accepts cricket-data-backup-*.json files
   - Shows detailed merge results
   ```

3. **Console Testing**:
   ```javascript
   // Test export
   dataHelpers.export()
   
   // Test import  
   dataHelpers.import()
   
   // Check current data
   dataHelpers.summary()
   
   // Show expected filename
   dataHelpers.expectedFile()
   
   // Get help
   dataHelpers.help()
   ```

### Browser Limitations:

- Cannot automatically access Downloads folder due to security restrictions
- File picker opens but defaults to last used directory (usually Downloads)
- User must manually select the backup file
- Function validates file name pattern to ensure correct file selection

### File Name Pattern:
- Export creates: `cricket-data-backup-2025-09-08.json`
- Import expects: `cricket-data-backup-*.json`
- Rejects other JSON files that don't match pattern

### Benefits:
- ✅ Prevents accidental import of wrong files
- ✅ Clear user guidance about file location
- ✅ Enhanced validation and error handling
- ✅ Automatic backup before import
- ✅ Better merge logic with duplicate prevention
