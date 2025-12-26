import { Router, Request, Response } from 'express';
import { VisionService } from '../services/visionService';

const router = Router();
const visionService = new VisionService();

/**
 * POST /api/vision/extract-text
 * Extract text and structure from diagram image
 */
router.post('/extract-text', async (req: Request, res: Response) => {
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const extractedText = await visionService.extractFromImage(base64Data);

        res.json({
            success: true,
            extractedText
        });
    } catch (error) {
        console.error('Vision extraction error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Extraction failed'
        });
    }
});

export default router;
