import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get cookie by name securely
const getCookie = (req: express.Request, name: string): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").reduce((acc, pair) => {
    const [key, val] = pair.trim().split("=");
    if (key && val) {
      acc[key] = decodeURIComponent(val);
    }
    return acc;
  }, {} as Record<string, string>);
  
  return cookies[name] || null;
};

// Helper for GitHub API requests
const githubRequest = async (url: string, token: string, options: RequestInit = {}) => {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "GitHub-Explorer-App",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`GitHub API error (${response.status}): ${errorBody || response.statusText}`);
  }

  return response.json();
};

// 0. Check OAuth Configuration Status
app.get("/api/auth/config", (req, res) => {
  res.json({
    configured: !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
    clientId: process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.substring(0, 4)}...` : null
  });
});

// 1. Get OAuth Authorization URL
app.get("/api/auth/url", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GITHUB_CLIENT_ID environment variable is not configured." });
  }

  const redirectUri = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, "")}/auth/callback`
    : `http://localhost:${PORT}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user,repo",
    state: Math.random().toString(36).substring(2, 15),
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

// 2. OAuth Callback
const callbackHandler = async (req: express.Request, res: express.Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).send("Authorization code is missing.");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("GitHub client configuration is missing on the server.");
  }

  const redirectUri = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, "")}/auth/callback`
    : `http://localhost:${PORT}/auth/callback`;

  try {
    // Exchange code for Access Token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const token = tokenData.access_token;
    if (!token) {
      throw new Error("No access token received from GitHub.");
    }

    // Set token in secure HTTP-only cookie
    // Max age: 30 days
    const cookieOptions = [
      `gh_token=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=None",
      `Max-Age=${30 * 24 * 60 * 60}`,
    ].join("; ");

    res.setHeader("Set-Cookie", cookieOptions);

    // Return HTML page to notify parent window and close popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
              background-color: #0d1117;
              color: #c9d1d9;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .spinner {
              border: 3px solid #161b22;
              border-top: 3px solid #58a6ff;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Connection Successful!</h2>
          <p>Closing window and returning to app...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_SUCCESS" }, "*");
              window.close();
            } else {
              window.location.href = "/";
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error during GitHub token exchange:", error);
    res.status(500).send(`Authentication failed: ${error.message || error}`);
  }
};

// Bind both with and without trailing slash
app.get("/auth/callback", callbackHandler);
app.get("/auth/callback/", callbackHandler);

// 3. Auth Status
app.get("/api/auth/status", async (req, res) => {
  const token = getCookie(req, "gh_token");
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const user = await githubRequest("https://api.github.com/user", token);
    res.json({ authenticated: true, user });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// 4. Logout
app.post("/api/auth/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "gh_token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0"
  );
  res.json({ success: true });
});

// --- Proxy Endpoints for GitHub API ---

// Auth Middleware for GitHub Proxies
const requireGithubAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = getCookie(req, "gh_token");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Please connect your GitHub account." });
  }
  (req as any).ghToken = token;
  next();
};

// GET /api/github/user
app.get("/api/github/user", requireGithubAuth, async (req, res) => {
  try {
    const user = await githubRequest("https://api.github.com/user", (req as any).ghToken);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/github/repos
app.get("/api/github/repos", requireGithubAuth, async (req, res) => {
  try {
    // Fetches repositories belonging to the authenticated user, sorted by updated
    const repos = await githubRequest(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      (req as any).ghToken
    );
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/github/branches
app.get("/api/github/branches", requireGithubAuth, async (req, res) => {
  const { owner, repo } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo parameters are required." });
  }

  try {
    const branches = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      (req as any).ghToken
    );
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/github/contents
app.get("/api/github/contents", requireGithubAuth, async (req, res) => {
  const { owner, repo, path: filePath, ref } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo parameters are required." });
  }

  const p = filePath ? `${filePath}` : "";
  const query = ref ? `?ref=${ref}` : "";
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${p}${query}`;

  try {
    const contents = await githubRequest(url, (req as any).ghToken);

    // If it's a file, decode base64 content server-side for clean transmission
    if (contents && !Array.isArray(contents) && contents.type === "file" && contents.content) {
      try {
        // Base64 content might have line breaks, strip them before decoding
        const sanitizedBase64 = contents.content.replace(/\r?\n|\r/g, "");
        contents.decodedContent = Buffer.from(sanitizedBase64, "base64").toString("utf8");
      } catch (decodeErr) {
        contents.decodedContent = "Error: Unable to decode file content on the server.";
      }
    }

    res.json(contents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/github/languages
app.get("/api/github/languages", requireGithubAuth, async (req, res) => {
  const { owner, repo } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo parameters are required." });
  }

  try {
    const languages = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      (req as any).ghToken
    );
    res.json(languages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/github/issues
app.get("/api/github/issues", requireGithubAuth, async (req, res) => {
  const { owner, repo } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo parameters are required." });
  }

  try {
    const issues = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50&sort=created&direction=desc`,
      (req as any).ghToken
    );
    res.json(issues);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/github/issues
app.post("/api/github/issues", requireGithubAuth, async (req, res) => {
  const { owner, repo } = req.query;
  const { title, body } = req.body;

  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo parameters are required." });
  }
  if (!title) {
    return res.status(400).json({ error: "title is required." });
  }

  try {
    const issue = await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      (req as any).ghToken,
      {
        method: "POST",
        body: JSON.stringify({ title, body }),
      }
    );
    res.json(issue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend assets
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production build from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Vite server setup failed:", err);
});
