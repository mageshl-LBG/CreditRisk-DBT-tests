# Local Office Setup Guide

This guide describes how to set up the Data Automation Framework on a secure office laptop.

## Prerequisites

1.  **Node.js**: Ensure Node.js (v16 or higher) is installed.
    *   Command to check: `node -v`
2.  **Git**: For cloning the repository.
3.  **VS Code**: Recommended editor.

## Installation Steps

1.  **Clone the Repository**
    ```bash
    git clone <your-repo-url>
    cd data-automation-framework
    ```

2.  **Install Frontend Dependencies**
    ```bash
    # In the root folder
    npm install
    # or
    yarn install
    ```

3.  **Install Backend Dependencies** (Optional, for GCP connectivity)
    ```bash
    cd backend
    npm install
    cd ..
    ```

## Running Locally

1.  **Start the Frontend**
    ```bash
    # In the root folder
    npm run dev
    ```
    - Access the app at `http://localhost:5173` (or the port shown in terminal).

2.  **Start the Backend** (Optional)
    - Follow the steps in `GCP_CONNECTIVITY.md` to configure credentials.
    - Run `npm run dev` inside the `backend` folder.

## Security Note for Office Laptops

-   **Credentials**: NEVER commit `service-account.json` or keys to Git. The `.gitignore` is already set up to exclude `backend/keys` and `.env` files.
-   **Data**: The app runs locally. Asset metadata is stored in your browser's `localStorage` (clearing cache will wipe it) or strictly in local memory. No sensitive data is sent to external servers unless you explicitly configure the backend integration.
