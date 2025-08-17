REM Stop and remove existing container if it exists
echo 🛑 Stopping and removing existing container (if it exists)...

REM Check if container exists
podman ps -a -q -f name=%CONTAINER_NAME% >nul 2>&1
if not errorlevel 1 (
    for /f %%i in ('podman ps -q -f name=%CONTAINER_NAME%') do (
        echo    Stopping running container: %CONTAINER_NAME%
        podman stop %CONTAINER_NAME%
    )
    for /f %%i in ('podman ps -a -q -f name=%CONTAINER_NAME%') do (
        echo    Removing container: %CONTAINER_NAME%
        podman rm -f %CONTAINER_NAME%
    )
) else (
    echo    No existing container found.
)
