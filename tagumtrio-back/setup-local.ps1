param(
  [string]$DumpPath = ''
)

Write-Host "Setting up Python venv and installing requirements..."
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Default DB settings (edit if needed)
$DBUser = 'demo'
$DBPass = 'demo_pass'
$DBName = 'tagumtrio'

Write-Host "Creating database user and database (requires psql/localhost postgres admin access)..."
psql -U postgres -c "DO \\\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DBUser') THEN CREATE ROLE $DBUser LOGIN PASSWORD '$DBPass'; END IF; END \\\$\\$;"
psql -U postgres -c "CREATE DATABASE $DBName WITH OWNER = $DBUser;" || Write-Host "Database may already exist or create failed."

if ($DumpPath -and (Test-Path $DumpPath)) {
  Write-Host "Restoring dump from $DumpPath ..."
  pg_restore -U $DBUser -d $DBName $DumpPath
} else {
  Write-Host "No dump provided. Start with an empty DB or apply migrations manually."
}

Write-Host "Setup complete. Edit .env as needed and run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
