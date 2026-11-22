@echo off
rem Compile le generateur de cles (fenetre Windows) avec le compilateur C# fourni par Windows (.NET Framework 4).
rem Resultat : licence-privee\Generateur-cle-RestoPilote.exe  (dossier jamais publie : ni GitHub ni .exe client)
setlocal
set ROOT=%~dp0..\..
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
if not exist "%ROOT%\licence-privee" mkdir "%ROOT%\licence-privee"
"%CSC%" /nologo /target:winexe /codepage:65001 /win32icon:"%ROOT%\build\icon.ico" /out:"%ROOT%\licence-privee\Generateur-cle-RestoPilote.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "%~dp0GenerateurCle.cs"
if errorlevel 1 (echo Echec de la compilation. & exit /b 1)
echo OK : licence-privee\Generateur-cle-RestoPilote.exe
