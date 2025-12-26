# Connecting to GCP Locally

This guide explains how to configure the DataTrust backend to connect to your Google Cloud Platform (GCP) environment.

## Prerequisites

1.  **GCP Service Account**: You need a Service Account with **BigQuery Admin** and **BigQuery Data Viewer** roles.
2.  **Key File**: Download the JSON key file for this service account.

## Setup Instructions

### 1. Backend Configuration

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Create a `.env` file (if it doesn't exist) by determining which environment you want to connect to (BLD, INT, PRE, PROD).
    ```bash
    cp .env.example .env
    ```

3.  Update the `.env` file with your specific details. For example, to connect to **BLD** (Build/Dev):

    ```properties
    # Set the active environment
    ACTIVE_ENV=BLD

    # BLD Environment Config
    GCP_PROJECT_ID_BLD=your-actual-project-id
    GCP_DATASET_ID_BLD=your-dataset-name
    GOOGLE_APPLICATION_CREDENTIALS_BLD=./keys/my-service-account-key.json
    ```

    *Note: You can switch `ACTIVE_ENV` to `INT`, `PRE`, or `PROD` to toggle connections without changing the entire file.*

### 2. Service Account Key

1.  Create a `keys` folder in the `backend` directory (it is git-ignored by default).
2.  Place your downloaded Service Account JSON file in this folder (e.g., `backend/keys/my-service-account-key.json`).
3.  Ensure the path in `.env` matches exactly:
    ```properties
    GOOGLE_APPLICATION_CREDENTIALS_BLD=./keys/my-service-account-key.json
    ```

### 3. Restart the Backend

After changing `.env`, you must restart the backend server for changes to take effect:

```bash
# In the backend directory
npm run dev
```

## Verification

The backend attempts to verify the connection on startup. Look for this message in your terminal:
`✅ BigQuery Connection Verified (Project: your-project-id)`

## Troubleshooting

-   **"Credential file not found"**: Check the path in `GOOGLE_APPLICATION_CREDENTIALS_...`. It is relative to the `backend` folder root.
-   **"Permission denied"**: Ensure the Service Account has the correct IAM roles in IAM & Admin.
