# Deployment Options for Office Network

Since your application has a **Node.js backend** (for GCP connectivity) and a **React frontend**, it cannot be hosted on static static hosting services like GitHub Pages or Netlify directly if you need the backend features.

Here are the best options for sharing this with your team in an office network:

## Option 1: Internal Server (Recommended)
Host the application on an internal server (or a cloud VM accessible via VPN) that runs 24/7.

1.  **Backend**: Run the Node.js server using a process manager like `pm2`.
    *   `npm install -g pm2`
    *   `cd backend && pm2 start src/server.ts --name datatrust-backend`
2.  **Frontend**: Build the React app and serve it.
    *   `npm run build`
    *   Serve the `dist` folder using a simple server like `serve` or Nginx.
    *   `pm2 serve dist 3000 --name datatrust-frontend`
3.  **Access**: Your team accesses it via the server's IP: `http://192.168.x.x:3000`.

**Pros:**
*   Secure (stays inside intranet).
*   Centralized (everyone sees the same version).
*   GCP Keys are stored securely on the server, not on each user's laptop.

## Option 2: Docker (Easiest for IT)
Package everything into a Docker container so any team member can run it with one command.

1.  Create a `Dockerfile` that builds both frontend and backend.
2.  Your teammates install Docker Desktop.
3.  Run: `docker run -p 3000:3000 -v ./keys:/app/backend/keys my-datatrust-app`

**Pros:**
*   Consistent environment.
*   Easy distribution.

## Option 3: Local Clone (Git Repo)
Push the code to your internal Bitbucket/GitHub/GitLab.

1.  Team members clone the repo.
2.  They run `npm install` and `npm run dev`.
3.  **Critical**: They must each have their own `backend/keys/service-account.json` file for GCP access.

**Pros:**
*   Good for developers who want to modify code.
**Cons:**
*   Hard setup for non-technical users.
*   Security risk (distributing key files to everyone).

## Summary Recommendation
For an office tool used by a team:
**Go with Option 1 (Internal Server)**. It provides a stable URL (e.g., `http://datatrust-tool.internal`) and keeps your security credentials centralized on one server.
