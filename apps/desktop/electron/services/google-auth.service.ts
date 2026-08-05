import { google } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

import { spawn } from "child_process";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

const CREDENTIALS_PATH = path.join(__dirname, "../../electron/config/google-credentials.json");
const TOKEN_PATH = path.join(__dirname, "../../electron/config/google-token.json");

// read-only scopes -- we only ever fetch data, never modify anything
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

let cachedClient: OAuth2Client | null = null;

function loadCredentials() {
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed.installed ?? parsed.web;
}

function saveToken(tokens: unknown) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function loadSavedToken(): Record<string, unknown> | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
}

/**
 * First-time login flow: opens the default browser to Google's consent
 * page, spins up a tiny local HTTP server to catch the redirect with
 * the auth code, exchanges it for tokens, and saves them to disk so
 * this only has to happen once.
 */
function authenticateInteractively(oAuth2Client: OAuth2Client): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "", "http://localhost:53682");
        const code = url.searchParams.get("code");

        if (code) {
          res.end("Login successful! You can close this tab and return to Nexus.");
          server.close();

          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          saveToken(tokens);
          resolve();
        }
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(53682, () => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
      });

      console.log("[Google Auth] Opening browser for first-time login...");
      openUrlInWindowsBrowser(authUrl);
    });
  });
}
function openUrlInWindowsBrowser(url: string): void {
  const powershellPath = "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/PowerShell.exe";

  spawn(
    powershellPath,
    ["-NoProfile", "-NonInteractive", "-Command", `Start-Process '${url}'`],
    { stdio: "ignore", detached: true, windowsHide: true }
  ).unref();
}


/**
 * Returns an authenticated Google client, reusing the saved token if
 * one exists, otherwise triggering the one-time interactive login.
 */
export async function getGoogleClient(): Promise<OAuth2Client> {
  if (cachedClient) return cachedClient;

  const { client_id, client_secret } = loadCredentials();
  const redirectUri = "http://localhost:53682";

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const savedToken = loadSavedToken();

  if (savedToken) {
    oAuth2Client.setCredentials(savedToken);
  } else {
    await authenticateInteractively(oAuth2Client);
  }

  // Google auto-refreshes access tokens; persist the refreshed token
  // whenever it rotates so the login survives app restarts.
  oAuth2Client.on("tokens", (tokens) => {
    const merged = { ...(loadSavedToken() ?? {}), ...tokens };
    saveToken(merged);
  });

  cachedClient = oAuth2Client;
  return oAuth2Client;
}