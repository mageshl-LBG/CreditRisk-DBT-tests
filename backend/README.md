# Data Automation Framework - Backend API

## Setup Instructions

### Prerequisites
1. Node.js 18+ installed
2. GCP Project with BigQuery enabled
3. Service Account with BigQuery permissions

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your GCP credentials:
```env
GCP_PROJECT_ID=your-gcp-project-id
GCP_DATASET_ID=your-bigquery-dataset
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

3. Download your GCP service account key:
   - Go to GCP Console → IAM & Admin → Service Accounts
   - Create or select a service account
   - Create a JSON key
   - Save as `service-account-key.json` in the `backend/` directory

### Running Locally

```bash
npm run dev
```

Server will start on `http://localhost:3001`

### API Endpoints

#### Test Connection
```
GET /api/bigquery/test-connection
Response: { "connected": true }
```

#### Execute Test Query
```
POST /api/bigquery/execute-test
Body: { "query": "SELECT * FROM table LIMIT 10" }
Response: {
  "success": true,
  "rows": [...],
  "executionTime": 1234,
  "bytesProcessed": "1024"
}
```

#### List Tables
```
GET /api/bigquery/tables
Response: { "tables": ["table1", "table2"] }
```

#### Get Table Schema
```
GET /api/bigquery/schema/:tableId
Response: {
  "fields": [
    { "name": "id", "type": "STRING", "mode": "REQUIRED" }
  ]
}
```

### Security

- API key validation (disabled in development)
- Rate limiting: 100 queries/hour
- CORS restricted to frontend origin
- Query byte limits to control costs

### Deployment to Cloud Run

```bash
gcloud run deploy data-automation-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=your-project,GCP_DATASET_ID=your-dataset
```
