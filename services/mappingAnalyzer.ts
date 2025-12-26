/**
 * =============================================================================
 * MAPPING ANALYZER SERVICE
 * =============================================================================
 * 
 * PURPOSE:
 * This service analyzes CSV/Excel mapping documents and extracts:
 * - Source table names (where data comes from)
 * - Target table names (where data goes to)
 * - Field-level mappings (which columns map to which)
 * - Data types for each field
 * - Required transformations
 * 
 * HOW IT WORKS:
 * 1. User uploads a CSV file with mapping information
 * 2. parseCSVMapping() reads the file line by line
 * 3. Each line is analyzed to extract source→target relationships
 * 4. Field data types are inferred from field names
 * 5. Results are validated and returned as a structured document
 * 
 * SUPPORTED FORMATS:
 * - CSV: source_table,source_field,target_table,target_field,data_type
 * - Arrow: source_table.field -> target_table.field
 * - Pipe: target_table | target_field | source_table | source_field
 * =============================================================================
 */

import { ProductLayer } from "../types";

// Interface defining a single field mapping (one column to another)
export interface FieldMapping {
    sourceField: string;        // Column name in source table
    targetField: string;        // Column name in target table
    sourceType: string;         // Data type in source (STRING, NUMERIC, etc.)
    targetType: string;         // Data type in target
    transformation?: string;    // SQL transformation if needed (e.g., CAST, UPPER)
    isRequired: boolean;        // Whether this field is mandatory
    sampleValues?: string[];    // Optional sample data values
}

// Interface defining a complete table mapping (all fields for one table)
export interface TableMapping {
    id?: string;                // Optional ID
    sourceTable: string;        // Name of the source table
    targetTable: string;        // Name of the target table
    layer: ProductLayer;        // Which data layer (ODP/FDP/CDP)
    fields: FieldMapping[];     // Array of all field mappings
    businessRules?: string[];   // Optional business logic descriptions
    primaryKeys?: string[];     // Primary key column names
}

// Interface defining the complete mapping document
export interface MappingDocument {
    id: string;                 // Unique identifier for this document
    name: string;               // User-friendly name
    uploadedAt: Date;           // When it was uploaded
    tables: TableMapping[];     // Array of all table mappings
    status: 'parsed' | 'validated' | 'imported';  // Processing status
}

export class MappingAnalyzer {
    // Regular expressions to detect data types from field names or type hints
    // These patterns help automatically determine if a field is a string, number, date, etc.
    private dataTypePatterns = {
        string: /^(string|varchar|text|char|name|description|code)/i,
        number: /^(int|integer|number|numeric|decimal|float|double|bigint)/i,
        timestamp: /^(timestamp|datetime|date|time)/i,
        boolean: /^(bool|boolean|flag|is_|has_)/i,
    };

    /**
     * Parse CSV-like mapping content
     */
    parseCSVMapping(content: string): MappingDocument {
        const lines = content.split('\n').filter(l => l.trim());
        const tables = new Map<string, TableMapping>();

        // Detect format and parse accordingly
        const hasHeaders = this.detectHeaders(lines[0]);
        const startIndex = hasHeaders ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const mapping = this.parseMappingLine(line);

            if (mapping) {
                const key = `${mapping.sourceTable}_${mapping.targetTable}`;

                if (!tables.has(key)) {
                    tables.set(key, {
                        sourceTable: mapping.sourceTable,
                        targetTable: mapping.targetTable,
                        layer: this.inferLayer(mapping.targetTable),
                        fields: [],
                        primaryKeys: [],
                    });
                }

                tables.get(key)!.fields.push(mapping.field);
            }
        }

        return {
            id: `mapping_${Date.now()}`,
            name: 'Uploaded Mapping',
            uploadedAt: new Date(),
            tables: Array.from(tables.values()),
            status: 'parsed',
        };
    }

    /**
     * Parse a single mapping line with intelligent detection
     */
    private parseMappingLine(line: string): {
        sourceTable: string;
        targetTable: string;
        field: FieldMapping;
    } | null {
        // Support multiple formats:
        // Format 1: source_table,source_field,target_table,target_field,type
        // Format 2: source_table.source_field -> target_table.target_field (type)
        // Format 3: target_table | target_field | source_table | source_field

        const parts = line.split(/[,|\t]/).map(p => p.trim());

        if (parts.length >= 4) {
            // CSV format
            const [sourceTable, sourceField, targetTable, targetField, dataType] = parts;

            return {
                sourceTable: this.cleanTableName(sourceTable),
                targetTable: this.cleanTableName(targetTable),
                field: {
                    sourceField: this.cleanFieldName(sourceField),
                    targetField: this.cleanFieldName(targetField),
                    sourceType: this.inferDataType(sourceField, dataType),
                    targetType: this.inferDataType(targetField, dataType),
                    isRequired: this.isRequiredField(targetField),
                    transformation: this.detectTransformation(sourceField, targetField),
                },
            };
        }

        // Arrow format: source_table.field -> target_table.field
        const arrowMatch = line.match(/(\w+)\.(\w+)\s*->\s*(\w+)\.(\w+)/);
        if (arrowMatch) {
            const [, sourceTable, sourceField, targetTable, targetField] = arrowMatch;
            return {
                sourceTable: this.cleanTableName(sourceTable),
                targetTable: this.cleanTableName(targetTable),
                field: {
                    sourceField: this.cleanFieldName(sourceField),
                    targetField: this.cleanFieldName(targetField),
                    sourceType: this.inferDataType(sourceField),
                    targetType: this.inferDataType(targetField),
                    isRequired: this.isRequiredField(targetField),
                    transformation: this.detectTransformation(sourceField, targetField),
                },
            };
        }

        return null;
    }

    /**
     * Detect if first line contains headers
     */
    private detectHeaders(line: string): boolean {
        const lowerLine = line.toLowerCase();
        return (
            lowerLine.includes('source') &&
            lowerLine.includes('target') &&
            (lowerLine.includes('field') || lowerLine.includes('column'))
        );
    }

    /**
     * Infer data layer from table name
     */
    private inferLayer(tableName: string): ProductLayer {
        const lower = tableName.toLowerCase();
        if (lower.includes('odp') || lower.includes('raw') || lower.includes('landing')) {
            return ProductLayer.ODP;
        }
        if (lower.includes('cdp') || lower.includes('mart') || lower.includes('consumption')) {
            return ProductLayer.CDP;
        }
        return ProductLayer.FDP;
    }

    /**
     * Infer data type from field name and optional type hint
     */
    private inferDataType(fieldName: string, typeHint?: string): string {
        if (typeHint) {
            for (const [type, pattern] of Object.entries(this.dataTypePatterns)) {
                if (pattern.test(typeHint)) {
                    return type.toUpperCase();
                }
            }
        }

        // Infer from field name
        const lower = fieldName.toLowerCase();

        if (/_at$|_date$|_time$|timestamp/.test(lower)) return 'TIMESTAMP';
        if (/_id$|^id$|_key$/.test(lower)) return 'STRING';
        if (/amount|price|cost|total|sum|count|quantity/.test(lower)) return 'NUMERIC';
        if (/^is_|^has_|_flag$/.test(lower)) return 'BOOLEAN';
        if (/name|description|text|comment|note/.test(lower)) return 'STRING';

        return 'STRING';
    }

    /**
     * Detect if field is required (primary key, not null)
     */
    private isRequiredField(fieldName: string): boolean {
        const lower = fieldName.toLowerCase();
        return (
            lower === 'id' ||
            lower.endsWith('_id') ||
            lower === 'created_at' ||
            lower === 'updated_at'
        );
    }

    /**
     * Detect transformation logic from field name differences
     */
    private detectTransformation(sourceField: string, targetField: string): string | undefined {
        if (sourceField === targetField) return undefined;

        const sourceLower = sourceField.toLowerCase();
        const targetLower = targetField.toLowerCase();

        // Common transformations
        if (sourceLower.includes('date') && targetLower.includes('timestamp')) {
            return 'CAST(${source} AS TIMESTAMP)';
        }
        if (sourceLower.includes('string') && targetLower.includes('int')) {
            return 'CAST(${source} AS INT64)';
        }
        if (targetLower.includes('upper')) {
            return 'UPPER(${source})';
        }
        if (targetLower.includes('lower')) {
            return 'LOWER(${source})';
        }
        if (targetLower.includes('trim')) {
            return 'TRIM(${source})';
        }

        return `${sourceField} AS ${targetField}`;
    }

    /**
     * Clean table name
     */
    private cleanTableName(name: string): string {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Clean field name
     */
    private cleanFieldName(name: string): string {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Validate mapping document
     */
    validateMapping(doc: MappingDocument): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const table of doc.tables) {
            // Check for required fields
            if (!table.sourceTable) {
                errors.push(`Missing source table for target: ${table.targetTable}`);
            }
            if (!table.targetTable) {
                errors.push('Missing target table name');
            }
            if (table.fields.length === 0) {
                errors.push(`No field mappings for table: ${table.targetTable}`);
            }

            // Check for duplicate field mappings
            const targetFields = new Set<string>();
            for (const field of table.fields) {
                if (targetFields.has(field.targetField)) {
                    errors.push(`Duplicate target field: ${field.targetField} in ${table.targetTable}`);
                }
                targetFields.add(field.targetField);
            }

            // Check for required system fields
            const hasId = table.fields.some(f => f.targetField === 'id');
            const hasUpdatedAt = table.fields.some(f => f.targetField === 'updated_at');

            if (!hasId) {
                errors.push(`Missing required field 'id' in ${table.targetTable}`);
            }
            if (!hasUpdatedAt && table.layer !== ProductLayer.ODP) {
                errors.push(`Missing recommended field 'updated_at' in ${table.targetTable}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Generate sample mapping template
     */
    generateTemplate(): string {
        return `# Mapping Template
# Format: source_table,source_field,target_table,target_field,data_type

# Example ODP Layer
raw_customers,customer_id,odp_customer,id,STRING
raw_customers,customer_name,odp_customer,name,STRING
raw_customers,created_date,odp_customer,created_at,TIMESTAMP
raw_customers,modified_date,odp_customer,updated_at,TIMESTAMP

# Example FDP Layer
odp_customer,id,fdp_customer_master,customer_id,STRING
odp_customer,name,fdp_customer_master,customer_name,STRING
odp_customer,created_at,fdp_customer_master,created_at,TIMESTAMP
odp_customer,updated_at,fdp_customer_master,updated_at,TIMESTAMP

# Example CDP Layer
fdp_customer_master,customer_id,cdp_customer_analytics,customer_key,STRING
fdp_customer_master,customer_name,cdp_customer_analytics,customer_full_name,STRING
fdp_order_summary,total_orders,cdp_customer_analytics,order_count,NUMERIC
fdp_order_summary,total_amount,cdp_customer_analytics,lifetime_value,NUMERIC
`;
    }
}
