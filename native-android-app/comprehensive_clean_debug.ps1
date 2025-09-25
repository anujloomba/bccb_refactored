# Comprehensive Debug Cleaner Script

# Define the assets directory
$assetsDir = "app\src\main\assets"

# Get all JavaScript files
$jsFiles = Get-ChildItem -Path $assetsDir -Filter "*.js" -Recurse

Write-Host "Starting comprehensive debug removal..."

foreach ($file in $jsFiles) {
    Write-Host "Processing: $($file.Name)"
    
    # Read file content
    $content = Get-Content -Path $file.FullName -Raw
    $originalLength = $content.Length
    
    # Remove all variations of console statements (multiline safe)
    $content = $content -replace '(?s)console\.(log|info|warn|error|debug)\s*\([^)]*\).*;?', ''
    
    # Remove debug function calls with various patterns
    $content = $content -replace '(?s)(?:console\.|)(?:log|info|warn|error|debug)\s*\([^{]*?\);?', ''
    
    # Remove specific debug patterns found in the logs
    $content = $content -replace '(?s)console\.log\([^)]*\);?', ''
    $content = $content -replace '(?s)console\.info\([^)]*\);?', ''  
    $content = $content -replace '(?s)console\.warn\([^)]*\);?', ''
    $content = $content -replace '(?s)console\.error\([^)]*\);?', ''
    $content = $content -replace '(?s)console\.debug\([^)]*\);?', ''
    
    # Remove any remaining console calls with complex parameters
    $content = $content -replace 'console\.(?:log|info|warn|error|debug)\s*\([^;]*;', ''
    
    # Remove specific patterns from the logcat
    $content = $content -replace '"📡 SYNC DEBUG: Data structure: "[^"]*"', '""'
    $content = $content -replace '"🔍 MATCH DETAILS: First match structure: "[^"]*"', '""'
    $content = $content -replace '"📊 Loading match history and captain stats \(forced: [^)]*\)"', '""'
    $content = $content -replace '"MOM awarded to [^"]*"', '""'
    $content = $content -replace '"Available players: [^"]*"', '""'
    $content = $content -replace '"📊 SCORING ANALYTICS DEBUG: [^"]*"', '""'
    $content = $content -replace '"CRICKET_DEBUG: ANALYTICS - [^"]*"', '""'
    $content = $content -replace '"🎯 [^"]*"', '""'
    $content = $content -replace '"💡 [^"]*"', '""'
    $content = $content -replace '"✅ [^"]*"', '""'
    $content = $content -replace '"🚑 [^"]*"', '""'
    $content = $content -replace '"🔧 [^"]*"', '""'
    $content = $content -replace '"📱 [^"]*"', '""'
    $content = $content -replace '"🔄 [^"]*"', '""'
    
    # Remove empty lines that were left behind
    $content = $content -replace '^\s*$', '' -replace '\r?\n\s*\r?\n', "`n"
    
    # Write back to file
    if ($content.Length -ne $originalLength) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Cleaned $($originalLength - $content.Length) characters"
    } else {
        Write-Host "  No changes needed"
    }
}

Write-Host "Debug removal complete!"

# Now process HTML files too
$htmlFiles = Get-ChildItem -Path $assetsDir -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing HTML: $($file.Name)"
    
    $content = Get-Content -Path $file.FullName -Raw
    $originalLength = $content.Length
    
    # Remove console statements from HTML
    $content = $content -replace '(?s)console\.(log|info|warn|error|debug)\s*\([^)]*\).*;?', ''
    
    if ($content.Length -ne $originalLength) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Cleaned HTML $($originalLength - $content.Length) characters"
    }
}

Write-Host "All files processed!"