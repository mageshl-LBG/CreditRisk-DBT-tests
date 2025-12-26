/**
 * Real text extraction using Tesseract.js OCR
 * Extracts actual table and field names from diagram images
 */

import Tesseract from 'tesseract.js';

export interface ExtractedTable {
    name: string;
    layer: 'ODP' | 'FDP' | 'CDP';
    fields: string[];
}

export class RealTextExtractor {
    /**
   * Extract actual text from image using OCR with preprocessing
   */
    async extractFromImage(imageUrl: string, onProgress?: (progress: number) => void): Promise<string> {
        try {
            // Preprocess image for better OCR results
            const preprocessedImage = await this.preprocessImage(imageUrl);

            // Perform OCR on the preprocessed image
            const result = await Tesseract.recognize(preprocessedImage, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text' && onProgress) {
                        onProgress(Math.round(m.progress * 100));
                    }
                }
            });

            const text = result.data.text;

            // Debug: Log what OCR actually read
            console.log('=== OCR RAW OUTPUT ===');
            console.log(text);
            console.log('=== END OCR OUTPUT ===');

            // Parse the extracted text with improved logic
            const parsed = this.parseExtractedText(text);

            // If no tables found, return the raw OCR text for debugging
            if (parsed.odpTables.length === 0 && parsed.fdpTables.length === 0 && parsed.cdpTables.length === 0) {
                return `# Extracted from Image (OCR)

⚠️ No tables detected. Here's what OCR read:

\`\`\`
${text}
\`\`\`

**Manual Entry Guide:**
Look at your diagram and fill in the table names and fields:

ODP: [TABLE_NAME_FROM_LEFT_COLUMN]
- [FIELD_1]
- [FIELD_2]

FDP: [TABLE_NAME_FROM_MIDDLE_COLUMN]
- [FIELD_1]
- [FIELD_2]

CDP: [TABLE_NAME_FROM_RIGHT_COLUMN]
- [FIELD_1]
- [FIELD_2]

## Field Mappings
[ODP_TABLE].[FIELD] -> [FDP_TABLE].[FIELD]
[FDP_TABLE].[FIELD] -> [CDP_TABLE].[FIELD]`;
            }

            return this.formatExtraction(parsed);
        } catch (error) {
            console.error('OCR Error:', error);
            throw new Error('Failed to extract text from image');
        }
    }

    /**
     * Preprocess image for better OCR results
     */
    private async preprocessImage(imageUrl: string): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(imageUrl);
                    return;
                }

                // Set canvas size
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw image
                ctx.drawImage(img, 0, 0);

                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Convert to grayscale and increase contrast
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Grayscale
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                    // Increase contrast (simple threshold)
                    const threshold = 128;
                    const value = gray > threshold ? 255 : 0;

                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL());
            };

            img.onerror = () => resolve(imageUrl);
            img.src = imageUrl;
        });
    }

    /**
   * Parse extracted OCR text to identify tables and fields
   * Enhanced to handle OCR noise and various text formats
   */
    private parseExtractedText(text: string): {
        odpTables: ExtractedTable[];
        fdpTables: ExtractedTable[];
        cdpTables: ExtractedTable[];
        mappings: Array<{ source: string; target: string; sourceField: string; targetField: string }>;
    } {
        // Clean the text first
        const cleanedText = this.cleanOCRText(text);
        const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

        const odpTables: ExtractedTable[] = [];
        const fdpTables: ExtractedTable[] = [];
        const cdpTables: ExtractedTable[] = [];
        const mappings: Array<{ source: string; target: string; sourceField: string; targetField: string }> = [];

        let currentLayer: 'ODP' | 'FDP' | 'CDP' | null = null;
        let currentTable: ExtractedTable | null = null;

        // Detect layer by position or keywords
        const hasOdp = /\b(ODP|OPERATIONAL|RAW)\b/i.test(text);
        const hasFdp = /\b(FDP|FOUNDATION|CLEAN)\b/i.test(text);
        const hasCdp = /\b(CDP|CONSUMPTION|COMMON|ANALYTICS)\b/i.test(text);

        let lineIndex = 0;
        const totalLines = lines.length;

        for (const line of lines) {
            lineIndex++;

            // Skip very short or noisy lines
            if (line.length < 3 || /^[^a-zA-Z0-9_]+$/.test(line)) {
                continue;
            }

            // Detect layer headers
            if (/\b(ODP|OPERATIONAL|RAW)\b/i.test(line)) {
                currentLayer = 'ODP';
                continue;
            }
            if (/\b(FDP|FOUNDATION|CLEAN)\b/i.test(line)) {
                currentLayer = 'FDP';
                continue;
            }
            if (/\b(CDP|CONSUMPTION|COMMON|ANALYTICS)\b/i.test(line)) {
                currentLayer = 'CDP';
                continue;
            }

            // If no layer detected yet, infer from position (divide into thirds)
            if (!currentLayer && !hasOdp && !hasFdp && !hasCdp) {
                if (lineIndex < totalLines / 3) {
                    currentLayer = 'ODP';
                } else if (lineIndex < (totalLines * 2) / 3) {
                    currentLayer = 'FDP';
                } else {
                    currentLayer = 'CDP';
                }
            }

            // Clean the line for better matching
            const cleanLine = line.replace(/[^\w\s_-]/g, '').trim();

            // Detect table names - look for uppercase words with underscores
            // More lenient matching for OCR errors
            const tableMatch = cleanLine.match(/^([A-Z][A-Z0-9_]{2,})\s*$/i);
            if (tableMatch && currentLayer) {
                const tableName = tableMatch[1].toUpperCase().replace(/[^A-Z0-9_]/g, '_');

                // Only create new table if it looks valid
                if (tableName.length >= 3 && /^[A-Z]/.test(tableName)) {
                    if (!currentTable || currentTable.name !== tableName) {
                        currentTable = {
                            name: tableName,
                            layer: currentLayer,
                            fields: []
                        };

                        if (currentLayer === 'ODP') odpTables.push(currentTable);
                        else if (currentLayer === 'FDP') fdpTables.push(currentTable);
                        else if (currentLayer === 'CDP') cdpTables.push(currentTable);
                    }
                }

                continue;
            }

            // Detect field names - more lenient for OCR
            const fieldMatch = cleanLine.match(/^([A-Z][A-Z0-9_]*)\s*$/i);
            if (fieldMatch && currentTable && cleanLine.length >= 2 && cleanLine.length < 50) {
                const fieldName = fieldMatch[1].toUpperCase().replace(/[^A-Z0-9_]/g, '_');

                // Don't add if it's the table name itself or already exists
                if (fieldName !== currentTable.name &&
                    !currentTable.fields.includes(fieldName) &&
                    fieldName.length >= 2) {
                    currentTable.fields.push(fieldName);
                }
            }

            // Detect mappings (arrows) - more flexible
            const mappingMatch = line.match(/([A-Za-z][A-Za-z0-9_]+)\s*[-–—>→.]+\s*([A-Za-z][A-Za-z0-9_]+)/);
            if (mappingMatch) {
                const [, sourceField, targetField] = mappingMatch;
                const sourceFieldUpper = sourceField.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
                const targetFieldUpper = targetField.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

                // Find source and target tables
                const allTables = [...odpTables, ...fdpTables, ...cdpTables];
                const sourceTable = allTables.find(t => t.fields.includes(sourceFieldUpper));
                const targetTable = allTables.find(t => t.fields.includes(targetFieldUpper));

                if (sourceTable && targetTable) {
                    mappings.push({
                        source: sourceTable.name,
                        target: targetTable.name,
                        sourceField: sourceFieldUpper,
                        targetField: targetFieldUpper
                    });
                }
            }
        }

        return { odpTables, fdpTables, cdpTables, mappings };
    }

    /**
     * Clean OCR text to remove common noise
     */
    private cleanOCRText(text: string): string {
        return text
            // Remove multiple spaces
            .replace(/\s+/g, ' ')
            // Remove common OCR artifacts
            .replace(/[|]/g, 'I')
            .replace(/[0]/g, 'O')
            // Normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    }

    /**
     * Format extracted data into structured output
     */
    private formatExtraction(parsed: {
        odpTables: ExtractedTable[];
        fdpTables: ExtractedTable[];
        cdpTables: ExtractedTable[];
        mappings: Array<{ source: string; target: string; sourceField: string; targetField: string }>;
    }): string {
        let output = '# Extracted from Image (OCR)\n\n';

        if (parsed.odpTables.length > 0) {
            output += '## ODP Tables (Source/Landing Layer)\n';
            parsed.odpTables.forEach(table => {
                output += `ODP: ${table.name}\n`;
                table.fields.forEach(field => {
                    output += `- ${field}\n`;
                });
                output += '\n';
            });
        }

        if (parsed.fdpTables.length > 0) {
            output += '## FDP Tables (Foundation/Cleansed Layer)\n';
            parsed.fdpTables.forEach(table => {
                output += `FDP: ${table.name}\n`;
                table.fields.forEach(field => {
                    output += `- ${field}\n`;
                });
                output += '\n';
            });
        }

        if (parsed.cdpTables.length > 0) {
            output += '## CDP Tables (Consumption/Analytics Layer)\n';
            parsed.cdpTables.forEach(table => {
                output += `CDP: ${table.name}\n`;
                table.fields.forEach(field => {
                    output += `- ${field}\n`;
                });
                output += '\n';
            });
        }

        if (parsed.mappings.length > 0) {
            output += '## Field Mappings\n';

            // Group by layer transition
            const odpToFdp = parsed.mappings.filter(m => {
                const allTables = [...parsed.odpTables, ...parsed.fdpTables, ...parsed.cdpTables];
                const sourceTable = allTables.find(t => t.name === m.source);
                const targetTable = allTables.find(t => t.name === m.target);
                return sourceTable?.layer === 'ODP' && targetTable?.layer === 'FDP';
            });

            const fdpToCdp = parsed.mappings.filter(m => {
                const allTables = [...parsed.odpTables, ...parsed.fdpTables, ...parsed.cdpTables];
                const sourceTable = allTables.find(t => t.name === m.source);
                const targetTable = allTables.find(t => t.name === m.target);
                return sourceTable?.layer === 'FDP' && targetTable?.layer === 'CDP';
            });

            if (odpToFdp.length > 0) {
                output += '# Source: ODP → Target: FDP\n';
                odpToFdp.forEach(m => {
                    output += `${m.source}.${m.sourceField} -> ${m.target}.${m.targetField}\n`;
                });
                output += '\n';
            }

            if (fdpToCdp.length > 0) {
                output += '# Source: FDP → Target: CDP\n';
                fdpToCdp.forEach(m => {
                    output += `${m.source}.${m.sourceField} -> ${m.target}.${m.targetField}\n`;
                });
            }
        }

        if (parsed.odpTables.length === 0 && parsed.fdpTables.length === 0 && parsed.cdpTables.length === 0) {
            output += '\n⚠️ No tables detected. The image may be unclear or the text format may not be recognized.\n';
            output += 'Please verify the image quality and try again, or fill in manually.\n';
        }

        return output;
    }
}
