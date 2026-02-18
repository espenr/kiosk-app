# Google Calendar API Setup Guide

Complete guide for configuring Google Calendar integration in the kiosk app.

## Prerequisites

- Google account (any Gmail account)
- Access to [Google Cloud Console](https://console.cloud.google.com)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **"Select a project"** dropdown (top bar)
3. Click **"New Project"**
4. Enter project details:
   - **Project name:** `Kiosk Calendar` (or any name)
   - **Organization:** Leave as default
5. Click **"Create"**
6. Wait for project creation (takes ~30 seconds)

## Step 2: Enable Google Calendar API

1. In the project dashboard, click **"APIs & Services"** → **"Library"**
2. Search for: **"Google Calendar API"**
3. Click on **"Google Calendar API"** from results
4. Click **"Enable"**
5. Wait for API to be enabled

## Step 3: Configure OAuth Consent Screen

This is required before creating credentials.

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type
3. Click **"Create"**

### App Information

Fill in the required fields:
- **App name:** `Kiosk Dashboard`
- **User support email:** Your email address
- **Developer contact email:** Your email address

### App Domain (Optional - can skip these)
- Leave blank

Click **"Save and Continue"**

### Scopes

1. Click **"Add or Remove Scopes"**
2. Find and select:
   - `https://www.googleapis.com/auth/calendar.readonly`
3. Click **"Update"**
4. Click **"Save and Continue"**

### Test Users

1. Click **"Add Users"**
2. Add the email addresses for family members who have calendars you want to display
3. Click **"Add"**
4. Click **"Save and Continue"**

### Summary

Review and click **"Back to Dashboard"**

## Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: Select **"Web application"**
4. Name: `Kiosk Calendar Client`
5. **Authorized JavaScript origins:**
   - Click **"Add URI"**
   - Add: `http://localhost:3000` (for development)
   - Click **"Add URI"** again
   - Add: `http://raspberrypizerow2.local` (for production)
6. **Authorized redirect URIs:**
   - Click **"Add URI"**
   - Add: `http://localhost:3000/calendar/callback` (development)
   - Click **"Add URI"** again
   - Add: `http://raspberrypizerow2.local/calendar/callback` (production)
7. Click **"Create"**

## Step 5: Copy Credentials

A popup will appear with your credentials:

```
Client ID: 123456789-abcdefghijk.apps.googleusercontent.com
Client Secret: GOCSPX-abc123xyz
```

⚠️ **Important:** Save these values! You'll need them for the kiosk settings.

Click **"OK"** to close the popup.

You can always retrieve them later from:
**"APIs & Services"** → **"Credentials"** → Click on your OAuth client name

## Step 6: Configure Kiosk Settings

### On Raspberry Pi

1. Open browser to: `http://raspberrypizerow2.local/admin`
2. Login with your PIN
3. Scroll to **"Google Calendar"** section
4. Paste:
   - **Client ID:** `123456789-abcdefghijk.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-abc123xyz`
5. Click **"Save Changes"**
6. Enter your PIN

### On Development Machine

1. Open: `http://localhost:3000/admin/settings`
2. Same as above

## Step 7: Connect Calendar

After saving credentials:

1. Go to the dashboard (main kiosk screen)
2. The calendar widget should show **"Connect Google Calendar"** button
3. Click it
4. Sign in with your Google account
5. Grant permissions
6. You'll be redirected back to the dashboard

The calendar widget will now display events from your Google Calendar!

## Adding Multiple Family Calendars

After initial OAuth setup:

1. Go to admin settings
2. In the calendar section, you can configure which calendars to display
3. Each family member's calendar can have:
   - Custom name (e.g., "Pappa", "Mamma", "Emma")
   - Color
   - Icon (emoji)

## Troubleshooting

### "Access blocked: Authorization Error"

**Problem:** Your app is in testing mode and the user isn't added as a test user.

**Solution:**
1. Go to OAuth consent screen
2. Add the user's email under "Test users"
3. Try connecting again

### "Redirect URI mismatch"

**Problem:** The callback URL doesn't match what you configured.

**Solution:**
1. Go to Credentials → Your OAuth client
2. Add the exact URL shown in the error message under "Authorized redirect URIs"
3. Wait 5 minutes for changes to propagate
4. Try again

### Calendar shows "Configure calendar"

**Problem:** OAuth credentials not configured.

**Solution:**
1. Verify Client ID and Client Secret are saved in admin settings
2. Check they're copied correctly (no extra spaces)
3. Reload the dashboard

### Events not showing up

**Problem:** Wrong calendar selected or permissions not granted.

**Solution:**
1. Make sure you granted calendar.readonly permission during OAuth
2. Check which calendars are selected in settings
3. Verify events exist in the Google Calendar web interface

## Security Notes

### Publishing the App (Optional)

Your app starts in "Testing" mode, which:
- ✅ Works fine for personal/family use
- ✅ No review required
- ❌ Requires adding each user as a "test user"
- ❌ Refresh tokens expire after 7 days (need to re-authenticate)

To publish for wider use:
1. Complete OAuth consent screen setup
2. Submit for verification
3. Google will review (can take weeks)
4. Once verified, no need to add test users

For a home kiosk, **staying in testing mode is perfectly fine**.

### Keeping Refresh Tokens Working

In testing mode, refresh tokens expire after 7 days of inactivity. To avoid this:

**Option 1:** Use the calendar daily (automatic refresh)

**Option 2:** Keep test mode forever (re-authenticate when needed)

**Option 3:** Publish the app (requires verification)

For a home kiosk that's used daily, this is usually not a problem.

## Example Credentials

Here's what your credentials will look like (these are fake examples):

```
Client ID: 123456789012-abc123def456ghi789jkl.apps.googleusercontent.com
Client Secret: GOCSPX-1234567890abcdefGHIJKL
```

- Client ID is ~70 characters, ends with `.apps.googleusercontent.com`
- Client Secret is ~35 characters, starts with `GOCSPX-`

## Need Help?

Common issues:
1. **App not verified warning:** Click "Advanced" → "Go to Kiosk Dashboard (unsafe)" - this is normal for testing mode
2. **403 Access denied:** Add the user as a test user in OAuth consent screen
3. **Invalid grant:** Refresh token expired - re-authenticate through the dashboard

## Summary Checklist

- [ ] Create Google Cloud project
- [ ] Enable Google Calendar API
- [ ] Configure OAuth consent screen (External, with scopes)
- [ ] Add family members as test users
- [ ] Create OAuth client ID (Web application)
- [ ] Add authorized origins and redirect URIs
- [ ] Copy Client ID and Client Secret
- [ ] Paste credentials in kiosk admin settings
- [ ] Connect calendar from dashboard
- [ ] Grant permissions
- [ ] Verify events appear in widget

Done! Your kiosk will now display family calendar events. 🎉
