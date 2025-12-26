# Hosting & Running on GitHub

Since this application has a backend (node.js), it cannot be hosted on "GitHub Pages" (which is for static sites only).

However, you can **run it entirely in the cloud** using **GitHub Codespaces**.

## Option 1: GitHub Codespaces (Zero Setup)

This is the easiest way for your team to run the app without installing anything on their laptops.

1.  Go to your repository on GitHub.
2.  Click the green **Code** button.
3.  Select the **Codespaces** tab.
4.  Click **Create codespace on main**.

GitHub will spin up a cloud machine with VS Code in your browser.
**Note**: You still need to:
1.  Create the `.env` file in the `backend` folder.
2.  Upload your `service-account.json` key to `backend/keys/` in the cloud environment.

## Option 2: Clone & Run Locally

For long-term usage, team members should clone it:

1.  **Clone**: `git clone https://github.com/mageshl-LBG/CreditRisk-DBT-tests.git`
2.  **Install**: `npm install && cd backend && npm install`
3.  **Configure**: Add your GCP keys to `backend/keys/`.
4.  **Run**: `npm run dev` (Frontend) and `npm run dev` (Backend).
