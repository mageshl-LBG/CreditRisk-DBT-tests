import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';

dotenv.config();

export interface TestResult {
    success: boolean;
    rows: any[];
    executionTime: number;
    bytesProcessed: string;
    error?: string;
}

export interface TableSchema {
    fields: Array<{
        name: string;
        type: string;
        mode: string;
    }>;
}

export class BigQueryService {
    private bigquery: BigQuery;
    private projectId: string;
    private datasetId: string;
    private currentEnv: string;

    constructor(environment?: string) {
        // Support multiple environments: BLD, INT, PRE, PROD
        this.currentEnv = environment || process.env.ACTIVE_ENV || 'BLD';

        // Get environment-specific configuration
        this.projectId = process.env[`GCP_PROJECT_ID_${this.currentEnv}`] || '';
        this.datasetId = process.env[`GCP_DATASET_ID_${this.currentEnv}`] || '';
        const credentialsPath = process.env[`GOOGLE_APPLICATION_CREDENTIALS_${this.currentEnv}`];

        if (!this.projectId || !this.datasetId) {
            console.warn(`⚠️  Missing configuration for environment: ${this.currentEnv}`);
        }

        this.bigquery = new BigQuery({
            projectId: this.projectId,
            keyFilename: credentialsPath
        });

        console.log(`📊 BigQuery initialized for environment: ${this.currentEnv}`);
        console.log(`   Project: ${this.projectId}`);
        console.log(`   Dataset: ${this.datasetId}`);
    }

    /**
     * Get current environment
     */
    getEnvironment(): string {
        return this.currentEnv;
    }

    /**
     * Execute a test query against BigQuery
     */
    async executeTest(query: string, location: string = 'US'): Promise<TestResult> {
        const startTime = Date.now();

        try {
            const options = {
                query: query,
                location: location,
                maximumBytesBilled: process.env.MAX_BYTES_PER_QUERY || '10737418240' // 10GB default
            };

            const [job] = await this.bigquery.createQueryJob(options);
            const [rows] = await job.getQueryResults();

            const executionTime = Date.now() - startTime;
            const metadata = job.metadata;
            const bytesProcessed = metadata.statistics?.query?.totalBytesProcessed || '0';

            return {
                success: true,
                rows,
                executionTime,
                bytesProcessed
            };
        } catch (error) {
            return {
                success: false,
                rows: [],
                executionTime: Date.now() - startTime,
                bytesProcessed: '0',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get table schema
     */
    async getTableSchema(tableId: string): Promise<TableSchema> {
        const dataset = this.bigquery.dataset(this.datasetId);
        const table = dataset.table(tableId);

        const [metadata] = await table.getMetadata();

        return {
            fields: metadata.schema.fields
        };
    }

    /**
     * List all tables in dataset
     */
    async listTables(): Promise<string[]> {
        const dataset = this.bigquery.dataset(this.datasetId);
        const [tables] = await dataset.getTables();

        return tables.map(table => table.id || '');
    }

    /**
     * Check if table exists
     */
    async tableExists(tableId: string): Promise<boolean> {
        try {
            const dataset = this.bigquery.dataset(this.datasetId);
            const table = dataset.table(tableId);
            const [exists] = await table.exists();
            return exists;
        } catch {
            return false;
        }
    }

    /**
     * Test connection to BigQuery
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.bigquery.getDatasets();
            return true;
        } catch {
            return false;
        }
    }
}
