# Google Calendar OAuth Setup

This guide helps you get a refresh token for Google Calendar integration.

## Prerequisites

1. **Google Cloud Project with Calendar API enabled**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Calendar API
   - Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)

2. **Create OAuth 2.0 Client ID**
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Desktop app** (or Web application)
   - Name: "Kiosk Calendar" (or any name)
   - Add authorized redirect URI: `http://localhost:8080/callback`
   - Save and copy the Client ID and Client Secret

## Getting Your Refresh Token

### Method 1: Web Flow (Recommended - Easiest!)

This method automatically opens a browser and handles everything for you.

```bash
# Run from project root
node scripts/get-calendar-token-web.js
```

**What happens:**
1. Script prompts for Client ID and Client Secret (or reads from environment)
2. Opens your browser to Google authorization page
3. After you authorize, redirects back automatically
4. Displays your refresh token in the terminal
5. Done! Copy the token and paste it in the admin settings

**Environment variables (optional):**
```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
node scripts/get-calendar-token-web.js
```

### Method 2: Device Code Flow (Old method - CLI only)

Use this if you're on a headless server or prefer CLI-only flow.

```bash
bash scripts/get-calendar-token.sh
```

This requires manually opening a URL and entering a code. Less convenient but works anywhere.

## Using the Refresh Token

1. Go to `http://pi.local/admin/settings`
2. Scroll to "Google Calendar" section
3. Enter:
   - Client ID
   - Client Secret
   - Refresh Token (from the script above)
4. Add calendar sources:
   - `primary` for your main calendar
   - Or specific calendar emails like `family@gmail.com`
5. Save settings

## Troubleshooting

### Port 8080 already in use
```bash
# Check what's using port 8080
lsof -i :8080

# Kill the process or use a different port
# (edit PORT constant in get-calendar-token-web.js)
```

### Browser doesn't open automatically
Copy the URL from terminal and open it manually in your browser.

### "Redirect URI mismatch" error
Make sure you added `http://localhost:8080/callback` as an authorized redirect URI in Google Cloud Console.

### No refresh token in response
This can happen if you've already authorized the app before. To fix:
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Remove "Kiosk Calendar" (or your app name)
3. Run the script again - Google will ask for authorization again and provide a refresh token

## Security Notes

- **Client Secret**: Keep this secret! Don't commit it to git
- **Refresh Token**: Allows offline access to your calendar. Store securely
- Both are encrypted in the kiosk config using your PIN
- Tokens are stored server-side only, never exposed to the frontend

## Calendar Scopes

The script requests `https://www.googleapis.com/auth/calendar.readonly` which provides:
- Read-only access to calendar events
- No ability to create, modify, or delete events
- Minimal permissions needed for the kiosk display
