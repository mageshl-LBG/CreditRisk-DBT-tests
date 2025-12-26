/**
 * DBT Test Execution Service
 * Runs DBT tests locally via backend API
 */

import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const router = express.Router();

interface TestExecutionRequest {
    projectName: string;
    testType: 'single' | 'table' | 'all';
    testName?: string;
    tableName?: string;
    environment?: 'dev' | 'prod';
}

interface TestResult {
    success: boolean;
    output: string;
    errors?: string;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    duration: number;
}

/**
 * Execute DBT tests locally
 */
router.post('/execute', async (req: Request, res: Response) => {
    try {
        const {
            projectName,
            testType,
            testName,
            tableName,
            environment = 'dev'
        }: TestExecutionRequest = req.body;

        // Validate request
        if (!projectName || !testType) {
            return res.status(400).json({
                error: 'Missing required fields: projectName, testType'
            });
        }

        // Build DBT command
        let command = 'dbt test';

        switch (testType) {
            case 'single':
                if (!testName) {
                    return res.status(400).json({ error: 'testName required for single test' });
                }
                command += ` --select ${testName}`;
                break;

            case 'table':
                if (!tableName) {
                    return res.status(400).json({ error: 'tableName required for table tests' });
                }
                command += ` --select ${tableName}`;
                break;

            case 'all':
                // Run all tests
                break;
        }

        command += ` --target ${environment}`;
        command += ` --project-dir ./dbt_projects/${projectName}`;

        console.log(`Executing: ${command}`);

        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            env: {
                ...process.env,
                DBT_PROFILES_DIR: `./dbt_projects/${projectName}`
            }
        });
        const duration = Date.now() - startTime;

        // Parse DBT output
        const result = parseDbtOutput(stdout, stderr, duration);

        res.json(result);
    } catch (error: any) {
        console.error('DBT execution error:', error);

        // Parse error output
        const result = parseDbtOutput('', error.stderr || error.message, 0);
        result.success = false;

        res.status(500).json(result);
    }
});

/**
 * Get test status
 */
router.get('/status/:projectName', async (req: Request, res: Response) => {
    try {
        const { projectName } = req.params;
        const projectDir = path.join(process.cwd(), 'dbt_projects', projectName);

        // Check if project exists
        try {
            await fs.access(projectDir);
        } catch {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get last test results
        const targetDir = path.join(projectDir, 'target');
        try {
            const runResults = await fs.readFile(
                path.join(targetDir, 'run_results.json'),
                'utf-8'
            );
            const results = JSON.parse(runResults);

            res.json({
                lastRun: results.metadata.generated_at,
                totalTests: results.results.length,
                passed: results.results.filter((r: any) => r.status === 'pass').length,
                failed: results.results.filter((r: any) => r.status === 'fail').length,
                results: results.results
            });
        } catch {
            res.json({ message: 'No test results available yet' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * List available tests
 */
router.get('/list/:projectName', async (req: Request, res: Response) => {
    try {
        const { projectName } = req.params;
        const projectDir = path.join(process.cwd(), 'dbt_projects', projectName);

        const command = `dbt list --resource-type test --project-dir ${projectDir}`;
        const { stdout } = await execAsync(command);

        const tests = stdout.trim().split('\n').filter(line => line.trim());

        res.json({ tests });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Parse DBT output
 */
function parseDbtOutput(stdout: string, stderr: string, duration: number): TestResult {
    const output = stdout + '\n' + stderr;

    // Extract test counts from DBT output
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const totalMatch = output.match(/Completed with (\d+) errors? and (\d+) warnings?/);

    const testsPassed = passMatch ? parseInt(passMatch[1]) : 0;
    const testsFailed = failMatch ? parseInt(failMatch[1]) : 0;
    const testsRun = testsPassed + testsFailed;

    return {
        success: testsFailed === 0,
        output: stdout,
        errors: stderr,
        testsRun,
        testsPassed,
        testsFailed,
        duration
    };
}

export default router;
