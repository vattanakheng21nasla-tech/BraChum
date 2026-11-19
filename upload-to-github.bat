@echo off
chcp 65001 > nul
title ដំណើរការ Upload កូដទៅកាន់ GitHub
echo ===================================================================
echo   កំពុងបញ្ជូនឯកសារទៅកាន់ GitHub: vattanakheng21nasla-tech/BraChum
echo ===================================================================
echo.
echo កំពុងដំណើរការ Git Push... 
echo (ប្រសិនបើមានផ្ទាំង Browser លោតមក សូមចុច "Authorize" ដើម្បី Login)
echo.

set GIT_PATH="C:\Users\NAK KAC\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"

%GIT_PATH% config credential.helper manager
%GIT_PATH% push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo   🎉 អបអរសាទរ! បាន Upload ទៅកាន់ GitHub ដោយជោគជ័យ ១០០%!
    echo ===================================================================
    echo.
    echo លោកអ្នកអាចត្រឡប់ទៅកាន់ទំព័រ GitHub Settings -^> Pages ដើម្បីបើក Link ប្រើប្រាស់បានហើយ។
) else (
    echo.
    echo ⚠️ មិនទាន់អាច Push បានទេ សូមពិនិត្យមើលការ Login GitHub។
)

echo.
pause
