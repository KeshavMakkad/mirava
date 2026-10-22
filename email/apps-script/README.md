# Mirava emailer (Google Sheets + Apps Script)

The backend sends confirmation, sign-in and password-reset emails through this
Apps Script web app. Emails go out from the Google account that deploys it,
and every email is logged to the sheet. Quota: about 100 emails/day on a free
Gmail account, or 1,500/day on Google Workspace.

## Setup (about 5 minutes)

1. Create a Google Sheet, e.g. "Mirava email log". Then click **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with [`Code.gs`](Code.gs) from this folder, and save.
3. **Project Settings** (gear icon) → **Script Properties** → add a property:
   `MIRAVA_SECRET` = a long random string, e.g. the output of `openssl rand -hex 32`.
4. In the editor, choose the `setup` function and click **Run**. Approve the permissions; Google
   will warn that the app is unverified, because it's your own script. Choose
   **Advanced → Go to project → Allow**.
5. **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click Deploy and copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`).
6. Set these on the backend (in `backend/.env` locally, and in Render's environment variables):
   ```
   APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec
   APPS_SCRIPT_SECRET=<the same value as MIRAVA_SECRET>
   ```

To check that it's working, open the Web app URL in a browser. It should show `{"ok":true,"service":"mirava-emailer",…}`.

If you edit `Code.gs` later, go to **Deploy → Manage deployments → Edit → New version**. The URL stays the same.
