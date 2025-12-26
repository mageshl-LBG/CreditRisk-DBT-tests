import { ProductLayer, TableMetadata } from '../types';

/**
 * Enhanced Intelligent Mapping Analyzer
 * 
 * Consolidates parsing logic for both CSV and Image/Markdown formats.
 * Enforces strict ODP -> FDP -> CDP data flow and validates field mappings.
 */

export interface EnhancedMappingRow {
    sourceTable: string;
    sourceField: string;
    targetTable: string;
    targetField: string;
    dataType: string;
    transformation?: string;
    sourceLayer?: ProductLayer;
    targetLayer?: ProductLayer;
}

export interface EnhancedMappingResult {
    tables: TableMetadata[];
    lineage: Map<string, string[]>;
    summary: {
        odpTables: number;
        fdpTables: number;
        cdpTables: number;
        totalFields: number;
    };
}

interface ParsedTableFragment {
    name: string;
    layer: ProductLayer;
    fields: string[];
}

export class IntelligentMappingAnalyzer {

    /**
     * Main analysis function - intelligently processes input content (CSV or Markdown)
     */
    public analyze(content: string): EnhancedMappingResult {
        let rows: EnhancedMappingRow[] = [];
        let explicitTables: ParsedTableFragment[] = [];

        // Detect format and parse accordingly
        if (content.includes('ODP:') || content.includes('FDP:') || content.includes('CDP:') || content.includes('->')) {
            // Markdown / Image-Text Format
            const result = this.parseMarkdownFormat(content);
            rows = result.rows;
            explicitTables = result.explicitTables;
        } else {
            // CSV Format
            rows = this.parseCSV(content);
        }

        if (rows.length === 0 && explicitTables.length === 0) {
            throw new Error('No valid mapping data found. Please check the input format.');
        }

        // Generate TableMetadata
        const tables = this.generateTables(rows, explicitTables);

        // Build lineage map
        const lineage = new Map<string, string[]>();
        for (const table of tables.values()) {
            lineage.set(table.targetName, table.sources.map(s => s.name));
        }

        // Calculate summary
        const tableArray = Array.from(tables.values());
        const summary = {
            odpTables: tableArray.filter(t => t.layer === ProductLayer.ODP).length,
            fdpTables: tableArray.filter(t => t.layer === ProductLayer.FDP).length,
            cdpTables: tableArray.filter(t => t.layer === ProductLayer.CDP).length,
            totalFields: rows.length
        };

        return {
            tables: tableArray,
            lineage,
            summary
        };
    }

    /**
     * Parse Markdown-like format used by Image Diagram Builder
     * Also handles noisy OCR output (e.g. "ODP.TABLE FDP.TABLE")
     */
    private parseMarkdownFormat(content: string): { rows: EnhancedMappingRow[], explicitTables: ParsedTableFragment[] } {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l && l.length > 1);
        const rows: EnhancedMappingRow[] = [];
        const explicitTables: ParsedTableFragment[] = [];

        // Track the most recently detected tables to associate fields with
        let activeTables: ParsedTableFragment[] = [];

        for (const line of lines) {
            // 1. Detect Dot Notation Headers (e.g. "ODP.USER_NAME" or "FDP.NAME")
            // This regex finds all occurrences in a single line
            const dotNotationMatches = [...line.matchAll(/\b(ODP|FDP|CDP|RAW|FOUNDATION|CONSUMPTION)\.([A-Za-z0-9_]+)\b/gi)];

            if (dotNotationMatches.length > 0) {
                // If we found new headers, clear active tables and add these
                const newTables: ParsedTableFragment[] = [];

                for (const match of dotNotationMatches) {
                    const layerStr = match[1].toUpperCase();
                    let layer = ProductLayer.ODP;
                    if (['FDP', 'FOUNDATION'].includes(layerStr)) layer = ProductLayer.FDP;
                    if (['CDP', 'CONSUMPTION'].includes(layerStr)) layer = ProductLayer.CDP;

                    const tableName = match[2];

                    // Check if already exists
                    let table = explicitTables.find(t => t.name === tableName && t.layer === layer);
                    if (!table) {
                        table = {
                            name: tableName,
                            layer: layer,
                            fields: []
                        };
                        explicitTables.push(table);
                    }
                    newTables.push(table);
                }

                activeTables = newTables;
                continue;
            }

            // 2. Detect Standard Headers (ODP: Table)
            const standardMatch = line.match(/^(ODP|FDP|CDP|RAW|FOUNDATION|CONSUMPTION)[:\s_-]+(\w+)/i);
            if (standardMatch) {
                const layerStr = standardMatch[1].toUpperCase();
                let layer = ProductLayer.ODP;
                if (['FDP', 'FOUNDATION'].includes(layerStr)) layer = ProductLayer.FDP;
                if (['CDP', 'CONSUMPTION'].includes(layerStr)) layer = ProductLayer.CDP;

                const tableName = standardMatch[2];
                let table = explicitTables.find(t => t.name === tableName && t.layer === layer);
                if (!table) {
                    table = { name: tableName, layer: layer, fields: [] };
                    explicitTables.push(table);
                }
                activeTables = [table];
                continue;
            }

            // 3. Detect Mappings (Arrow Notation)
            const mappingMatch = line.match(/([A-Za-z0-9_]+)\.?([A-Za-z0-9_]*)\s*[-=]>\s*([A-Za-z0-9_]+)\.?([A-Za-z0-9_]*)/);
            if (mappingMatch) {
                const [, p1, p2, p3, p4] = mappingMatch;
                // Handle optional table.field vs field -> field
                const sourceTable = p2 ? p1 : (activeTables[0]?.name || 'Unknown_Source');
                const sourceField = p2 ? p2 : p1;
                const targetTable = p4 ? p3 : (activeTables[activeTables.length - 1]?.name || 'Unknown_Target');
                const targetField = p4 ? p4 : p3;

                rows.push({
                    sourceTable, sourceField, targetTable, targetField,
                    dataType: 'STRING',
                    sourceLayer: this.detectLayer(sourceTable),
                    targetLayer: this.detectLayer(targetTable)
                });
                continue;
            }

            // 4. Detect Fields (loose words)
            // If we have active tables, try to distribute words as fields
            if (activeTables.length > 0) {
                // Split line by spaces, but ignore common noise chars
                const potentialFields = line.split(/[\s|]+/).filter(w => w.length > 1 && /^[A-Za-z0-9_]+$/.test(w));

                // Enhanced Heuristic for Multi-Column Layouts:
                // If we have N active tables and we find approximately N words on the line,
                // assume 1:1 mapping (Column 1 -> Table 1, Column 2 -> Table 2).
                if (activeTables.length > 1 && potentialFields.length >= activeTables.length) {
                    for (let i = 0; i < activeTables.length; i++) {
                        const word = potentialFields[i];
                        const targetTable = activeTables[i];

                        // Validate word is not a keyword
                        if (!['ODP', 'FDP', 'CDP', 'ID', 'NULL'].includes(word.toUpperCase()) && !targetTable.fields.includes(word)) {
                            const cleanField = word.replace(/[^a-zA-Z0-9_]/g, '');
                            if (cleanField.length > 1) {
                                targetTable.fields.push(cleanField);
                            }
                        }
                    }
                } else {
                    // Fallback: Add all valid words to the LAST active table (standard list behavior)
                    const targetTable = activeTables[activeTables.length - 1];
                    for (const word of potentialFields) {
                        if (!['ODP', 'FDP', 'CDP', 'ID', 'NULL'].includes(word.toUpperCase()) && !targetTable.fields.includes(word)) {
                            // Clean up field name
                            const cleanField = word.replace(/[^a-zA-Z0-9_]/g, '');
                            if (cleanField.length > 1) {
                                targetTable.fields.push(cleanField);
                            }
                        }
                    }
                }
            }
        }

        return { rows, explicitTables };
    }

    /**
     * Parse CSV Content
     */
    private parseCSV(content: string): EnhancedMappingRow[] {
        const lines = content.trim().split('\n');
        const rows: EnhancedMappingRow[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#') || line.toLowerCase().startsWith('source_table')) continue;

            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 4) continue; // Allow strict minimum

            rows.push({
                sourceTable: parts[0],
                sourceField: parts[1],
                targetTable: parts[2],
                targetField: parts[3],
                dataType: parts[4] || 'STRING',
                transformation: parts[5] || undefined,
                sourceLayer: this.detectLayer(parts[0]),
                targetLayer: this.detectLayer(parts[2])
            });
        }
        return rows;
    }

    /**
     * Generate TableMetadata objects from parsed rows and explicit definitions
     */
    private generateTables(rows: EnhancedMappingRow[], explicitTables: ParsedTableFragment[]): Map<string, TableMetadata> {
        const tables = new Map<string, TableMetadata>();

        // 1. Initialize tables from Explicit Definitions (Markdown/Image)
        for (const tbl of explicitTables) {
            tables.set(tbl.name, {
                id: `${tbl.layer.toLowerCase().split(' ')[0]}-${tbl.name}`,
                layer: tbl.layer,
                targetName: tbl.name,
                columns: ['id', 'created_at', 'updated_at', ...tbl.fields],
                primaryKeys: ['id'],
                sources: [],
                checkTypes: []
            });
        }

        // 2. Initialize/Update tables from Mapping Rows
        for (const row of rows) {
            // Target Table
            this.ensureTableExists(tables, row.targetTable, row.targetLayer || ProductLayer.ODP);
            const targetTable = tables.get(row.targetTable)!;

            // Add Field to Target if missing
            if (!targetTable.columns.includes(row.targetField)) {
                targetTable.columns.push(row.targetField);
            }

            // Source Table (Ensure it exists, usually ODP)
            this.ensureTableExists(tables, row.sourceTable, row.sourceLayer || ProductLayer.ODP);
            const sourceTable = tables.get(row.sourceTable)!;

            // Add Field to Source if missing (common in CSV import where source def is implied)
            if (!sourceTable.columns.includes(row.sourceField)) {
                sourceTable.columns.push(row.sourceField);
            }

            // Add Mapping to Target Table
            let sourceEntry = targetTable.sources.find(s => s.name === row.sourceTable);
            if (!sourceEntry) {
                sourceEntry = { name: row.sourceTable, mappings: [] };
                targetTable.sources.push(sourceEntry);
            }

            // Avoid duplicate mappings
            if (!sourceEntry.mappings.some(m => m.targetField === row.targetField)) {
                sourceEntry.mappings.push({
                    sourceField: row.sourceField,
                    targetField: row.targetField,
                    transformation: row.transformation || ''
                });
            }
        }

        return tables;
    }

    private ensureTableExists(tables: Map<string, TableMetadata>, tableName: string, layer: ProductLayer) {
        if (!tables.has(tableName)) {
            tables.set(tableName, {
                id: `${layer.toLowerCase().split(' ')[0]}-${tableName}`,
                layer: layer,
                targetName: tableName,
                columns: ['id', 'created_at', 'updated_at'],
                primaryKeys: ['id'],
                sources: [],
                checkTypes: []
            });
        }
    }

    private detectLayer(tableName: string): ProductLayer {
        const lower = tableName.toLowerCase();
        if (lower.startsWith('cdp') || lower.includes('_cdp') || lower.includes('consumption')) return ProductLayer.CDP;
        if (lower.startsWith('fdp') || lower.includes('_fdp') || lower.includes('foundation')) return ProductLayer.FDP;
        return ProductLayer.ODP; // Default
    }
}
