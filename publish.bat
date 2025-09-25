@echo off
echo ========================================
echo  🚀 PepperLog NPM Publishing Script
echo ========================================
echo.

echo 📋 Step 1: Clean and build...
call npm run clean
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed! Please fix errors and try again.
    pause
    exit /b 1
)
echo ✅ Build successful!
echo.

echo 📋 Step 2: Dry run to verify package contents...
echo This shows what would be published:
echo.
call npm publish --dry-run
if %ERRORLEVEL% neq 0 (
    echo ❌ Dry run failed! Please check configuration.
    pause
    exit /b 1
)
echo.

echo 📋 Step 3: Ready to publish!
echo.
echo The following will be published to npm:
echo - Package name: pepper-log
echo - Version: 1.0.0
echo - Repository: https://github.com/padfoot044/pepper-log
echo.
set /p confirm="Are you sure you want to publish? (y/N): "
if /i not "%confirm%"=="y" (
    echo Publishing cancelled.
    pause
    exit /b 0
)

echo.
echo 📋 Step 4: Publishing to npm...
call npm publish
if %ERRORLEVEL% neq 0 (
    echo ❌ Publishing failed! Please check your npm credentials.
    echo Run 'npm login' if you haven't logged in yet.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  🎉 Successfully published to npm!
echo ========================================
echo.
echo Your package is now available:
echo - Install with: npm install pepper-log
echo - View on npm: https://www.npmjs.com/package/pepper-log
echo.
echo 📋 Next steps:
echo 1. Test installation: npm install pepper-log
echo 2. Verify on npmjs.com
echo 3. Share with the community!
echo.
pause