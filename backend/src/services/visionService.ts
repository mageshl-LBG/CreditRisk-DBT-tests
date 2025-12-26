import { ImageAnnotatorClient } from '@google-cloud/vision';
import dotenv from 'dotenv';

dotenv.config();

export interface ExtractedTable {
    name: string;
    layer: 'ODP' | 'FDP' | 'CDP';
    fields: string[];
    position: { x: number; y: number };
}

export interface ExtractedConnection {
    source: string;
    target: string;
    sourceField: string;
    targetField: string;
}

export class VisionService {
    private client: ImageAnnotatorClient;

    constructor() {
        this.client = new ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
    }

    /**
   * Extract text from image using Google Cloud Vision API
   */
    async extractTextFromImage(imageBase64: string): Promise<string> {
        try {
            // Check if credentials are available
            if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
            }

            const [result] = await this.client.textDetection({
                image: { content: imageBase64 }
            });

            const detections = result.textAnnotations;
            if (!detections || detections.length === 0) {
                throw new Error('No text detected in image');
            }

            // First annotation contains all detected text
            const fullText = detections[0].description || '';
            return fullText;
        } catch (error) {
            console.error('Vision API error:', error);
            // Return a helpful template instead of failing
            return this.generateFallbackTemplate();
        }
    }

    /**
     * Generate a helpful template when Vision API is not available
     */
    private generateFallbackTemplate(): string {
        return `# Vision API Not Configured

To enable automatic extraction, set up Google Cloud Vision API:
1. Enable Vision API in your GCP project
2. Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env

For now, please fill in manually by looking at your diagram:

## ODP Tables (Left side of diagram)
ODP: [TABLE_NAME_FROM_DIAGRAM]
- [FIELD_1]
- [FIELD_2]
- [FIELD_3]

## FDP Tables (Middle of diagram)
FDP: [TABLE_NAME_FROM_DIAGRAM]
- [FIELD_1]
- [FIELD_2]

## CDP Tables (Right side of diagram)
CDP: [TABLE_NAME_FROM_DIAGRAM]
- [FIELD_1]
- [FIELD_2]

## Field Mappings
# Source: ODP → Target: FDP
[ODP_TABLE].[FIELD] -> [FDP_TABLE].[FIELD]

# Source: FDP → Target: CDP
[FDP_TABLE].[FIELD] -> [CDP_TABLE].[FIELD]`;
    }

    /**
     * Parse extracted text to identify tables and fields
     */
    parseExtractedText(text: string): { tables: ExtractedTable[]; connections: ExtractedConnection[] } {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const tables: ExtractedTable[] = [];
        const connections: ExtractedConnection[] = [];

        let currentLayer: 'ODP' | 'FDP' | 'CDP' | null = null;
        let currentTable: ExtractedTable | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect layer headers
            if (/\b(ODP|OPERATIONAL)\b/i.test(line)) {
                currentLayer = 'ODP';
                continue;
            }
            if (/\b(FDP|FOUNDATION)\b/i.test(line)) {
                currentLayer = 'FDP';
                continue;
            }
            if (/\b(CDP|CONSUMPTION|COMMON)\b/i.test(line)) {
                currentLayer = 'CDP';
                continue;
            }

            // Detect table names (uppercase with underscores, at least 4 chars)
            const tableMatch = line.match(/^([A-Z][A-Z0-9_]{3,})\s*$/);
            if (tableMatch && currentLayer) {
                const tableName = tableMatch[1];

                // Check if it's a new table
                if (!currentTable || currentTable.name !== tableName) {
                    currentTable = {
                        name: tableName,
                        layer: currentLayer,
                        fields: [],
                        position: { x: 0, y: i }
                    };
                    tables.push(currentTable);
                }
                continue;
            }

            // Detect field names (follow table names)
            const fieldMatch = line.match(/^([A-Z][A-Z0-9_]+)\s*$/);
            if (fieldMatch && currentTable) {
                const fieldName = fieldMatch[1];
                // Don't add if it's the table name itself
                if (fieldName !== currentTable.name && !currentTable.fields.includes(fieldName)) {
                    currentTable.fields.push(fieldName);
                }
            }

            // Detect mappings (arrows or connections)
            const mappingMatch = line.match(/([A-Z][A-Z0-9_]+)\s*[-–—>→]+\s*([A-Z][A-Z0-9_]+)/);
            if (mappingMatch) {
                const [, source, target] = mappingMatch;

                // Try to find which tables these fields belong to
                const sourceTable = tables.find(t => t.fields.includes(source));
                const targetTable = tables.find(t => t.fields.includes(target));

                if (sourceTable && targetTable) {
                    connections.push({
                        source: sourceTable.name,
                        target: targetTable.name,
                        sourceField: source,
                        targetField: target
                    });
                }
            }
        }

        return { tables, connections };
    }

    /**
     * Format extracted data into readable structure
     */
    formatExtraction(tables: ExtractedTable[], connections: ExtractedConnection[]): string {
        let output = '# Extracted from Image\n\n';

        // Group by layer
        const odpTables = tables.filter(t => t.layer === 'ODP');
        const fdpTables = tables.filter(t => t.layer === 'FDP');
        const cdpTables = tables.filter(t => t.layer === 'CDP');

        if (odpTables.length > 0) {
            output += '## ODP Tables (Source/Landing Layer)\n';
            odpTables.forEach(table => {
                output += `ODP: ${table.name}\n`;
                table.fields.forEach(field => {
                    output += `- ${field}\n`;
                });
                output += '\n';
            });
        }

        if (fdpTables.length > 0) {
            output += '## FDP Tables (Foundation/Cleansed Layer)\n';
            fdpTables.forEach(table => {
                output += `FDP: ${table.name}\n`;
                table.fields.forEach(field => {
                    output += `- ${field}\n`;
                });
                output += '\n';
            });
        }

        if (cdpTables.length > 0) {
            output += '## CDP Tables (Consumption/Analytics Layer)\n';
            cdpTables.forEach(table => {
                output += `CDP: ${table.name}\n`;
                table.fields.forEach(field => {
                    output += `- ${field}\n`;
                });
                output += '\n';
            });
        }

        if (connections.length > 0) {
            output += '## Field Mappings\n';

            // Group by source layer
            const odpToFdp = connections.filter(c => {
                const sourceTable = tables.find(t => t.name === c.source);
                const targetTable = tables.find(t => t.name === c.target);
                return sourceTable?.layer === 'ODP' && targetTable?.layer === 'FDP';
            });

            const fdpToCdp = connections.filter(c => {
                const sourceTable = tables.find(t => t.name === c.source);
                const targetTable = tables.find(t => t.name === c.target);
                return sourceTable?.layer === 'FDP' && targetTable?.layer === 'CDP';
            });

            if (odpToFdp.length > 0) {
                output += '# Source: ODP → Target: FDP\n';
                odpToFdp.forEach(conn => {
                    output += `${conn.source}.${conn.sourceField} -> ${conn.target}.${conn.targetField}\n`;
                });
                output += '\n';
            }

            if (fdpToCdp.length > 0) {
                output += '# Source: FDP → Target: CDP\n';
                fdpToCdp.forEach(conn => {
                    output += `${conn.source}.${conn.sourceField} -> ${conn.target}.${conn.targetField}\n`;
                });
            }
        }

        return output;
    }

    /**
     * Full extraction pipeline
     */
    async extractFromImage(imageBase64: string): Promise<string> {
        const text = await this.extractTextFromImage(imageBase64);
        const { tables, connections } = this.parseExtractedText(text);
        return this.formatExtraction(tables, connections);
    }
}
