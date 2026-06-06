@echo off
chcp 65001 >nul
title Paper2Galgame 启动中...

cd /d "%~dp0"

echo.
echo ========================================
echo   Paper2Galgame - 互动学习启动器
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org (选择 LTS 版本)
    echo 安装完成后重新运行本脚本。
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules\" (
    echo [首次运行] 正在安装依赖，请稍候...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接后重试。
        pause
        exit /b 1
    )
    echo [完成] 依赖安装成功！
    echo.
)

echo [启动] 正在启动学习服务器...
echo [提示] 浏览器将自动打开，如未打开请手动访问 http://localhost:3000
echo [提示] 关闭本窗口即可停止服务。
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start the dev server
call npm run dev

pause
