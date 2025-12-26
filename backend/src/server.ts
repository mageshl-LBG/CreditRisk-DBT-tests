import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import bigqueryRoutes from './routes/bigquery';
import visionRoutes from './routes/vision';
import dbtTestRoutes from './routes/dbtTests';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.MAX_QUERIES_PER_HOUR || '100'),
    message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);

// API Key validation middleware
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    // Skip API key validation in development or if no API key is configured
    if (!process.env.API_KEY || process.env.NODE_ENV === 'development') {
        return next();
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
};

// Routes
app.use('/api/bigquery', validateApiKey, bigqueryRoutes);
app.use('/api/vision', validateApiKey, visionRoutes);
app.use('/api/dbt-tests', dbtTestRoutes); // DBT tests don't need API key for local execution

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend API running on http://localhost:${PORT}`);
    console.log(`📊 BigQuery integration enabled`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
