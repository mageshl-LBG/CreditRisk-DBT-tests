# Hosting & Running on GitHub

Since this application has a backend (node.js), it cannot be hosted on "GitHub Pages" (which is for static sites only).

However, you can **run it entirely in the cloud** using **GitHub Codespaces**.

## Option 1: GitHub Codespaces (Zero Setup)

This is the easiest way for your team to run the app without installing anything on their laptops.

### Step 1: Start the Codespace
1.  Go to your repository on GitHub.
2.  Click the green **Code** button.
3.  Select the **Codespaces** tab.
4.  Click **Create codespace on main**.

### Step 2: Connect to GCP (One-Time Setup)
Since Codespaces runs in the cloud, you need to provide it with your GCP credentials securely.

1.  **Generate Key (If you haven't already)**:
    *   Go to GCP Console > IAM & Admin > Service Accounts.
    *   Select your service account > Keys > Add Key > JSON.
    *   This downloads a file like `project-id-12345.json` to your laptop.

2.  **Upload to Codespace**:
    *   In the Codespace (VS Code in Browser), look at the file explorer on the left.
    *   Right-click the `backend` folder -> **New Folder** -> name it `keys`.
    *   **Drag and drop** your JSON file from your computer into this `keys` folder.
    *   Rename it to `service-account.json`.

3.  **Configure Environment**:
    *   Right-click `backend/.env.example` -> **Copy**.
    *   Right-click `backend` -> **Paste** -> Rename to `.env`.
    *   Open `.env` and check the path: `GOOGLE_APPLICATION_CREDENTIALS_BLD=./keys/service-account.json`.

Now your cloud environment is authenticated!

### Step 3: Run the App
1.  Open two terminals (Terminal > New Terminal).
2.  **Terminal 1 (Backend)**:
    ```bash
    cd backend
    npm run dev
    ```
3.  **Terminal 2 (Frontend)**:
    ```bash
    npm run dev
    ```
4.  A popup will appear: "Open in Browser". Click it to use the app!

## Option 2: Clone & Run Locally

For long-term usage, team members should clone it:

1.  **Clone**: `git clone https://github.com/mageshl-LBG/CreditRisk-DBT-tests.git`
2.  **Install**: `npm install && cd backend && npm install`
3.  **Configure**: Add your GCP keys to `backend/keys/`.
4.  **Run**: `npm run dev` (Frontend) and `npm run dev` (Backend).
