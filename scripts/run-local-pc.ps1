$ErrorActionPreference = "Stop"

Set-Location "C:\Users\Samuel\Desktop\abp_6dsm"

$env:MONGODB_URI = "mongodb://127.0.0.1:27017/proconbot_jacarei"
$env:MONGODB_DB_NAME = "proconbot_jacarei"
$env:GEMINI_API_KEY = ""
$env:WHATSAPP_AUTH_PATH = ".wwebjs_auth"
$env:WHATSAPP_AUTH_CLIENT_ID = "proconbot-jacarei-local"
$env:PUPPETEER_HEADLESS = "false"

npm.cmd run dev
