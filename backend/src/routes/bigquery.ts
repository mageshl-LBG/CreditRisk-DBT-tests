import { Router, Request, Response } from 'express';
import { BigQueryService } from '../services/bigQueryService';

const router = Router();

/**
 * POST /api/bigquery/execute-test
 * Execute a test query against BigQuery
 * Body: { query: string, environment?: 'BLD' | 'INT' | 'PRE' | 'PROD' }
 */
router.post('/execute-test', async (req: Request, res: Response) => {
    try {
        const { query, environment, location } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const bigQueryService = new BigQueryService(environment);
        const result = await bigQueryService.executeTest(query, location);

        res.json({
            ...result,
            environment: bigQueryService.getEnvironment()
        });
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/bigquery/tables
 * List all tables in the configured dataset
 * Query param: ?environment=BLD|INT|PRE|PROD
 */
router.get('/tables', async (req: Request, res: Response) => {
    try {
        const environment = req.query.environment as string | undefined;
        const bigQueryService = new BigQueryService(environment);
        const tables = await bigQueryService.listTables();
        res.json({
            tables,
            environment: bigQueryService.getEnvironment()
        });
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/bigquery/schema/:tableId
 * Get schema for a specific table
 * Query param: ?environment=BLD|INT|PRE|PROD
 */
router.get('/schema/:tableId', async (req: Request, res: Response) => {
    try {
        const { tableId } = req.params;
        const environment = req.query.environment as string | undefined;
        const bigQueryService = new BigQueryService(environment);
        const schema = await bigQueryService.getTableSchema(tableId);
        res.json({
            ...schema,
            environment: bigQueryService.getEnvironment()
        });
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/bigquery/test-connection
 * Test connection to BigQuery
 * Query param: ?environment=BLD|INT|PRE|PROD
 */
router.get('/test-connection', async (req: Request, res: Response) => {
    try {
        const environment = req.query.environment as string | undefined;
        const bigQueryService = new BigQueryService(environment);
        const connected = await bigQueryService.testConnection();
        res.json({
            connected,
            environment: bigQueryService.getEnvironment()
        });
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

export default router;
