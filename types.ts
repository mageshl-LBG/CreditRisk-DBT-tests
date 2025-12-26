
// Import React to allow use of JSX-based types
import React from 'react';

// Enum defining the three main architectural layers of the data ecosystem
export enum ProductLayer {
  ODP = 'ODP (Origination)',
  FDP = 'FDP (Foundational)',
  CDP = 'CDP (Common/Consumption)'
}

// Interface for defining foreign key constraints between tables
export interface ForeignKeyRelationship {
  column: string;
  parentTable: string;
  parentColumn: string;
}

// Interface for mapping a source column to a target column
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  sourceType?: string;
  targetType?: string;
  transformation?: string;
  isRequired?: boolean;
  sampleValues?: string[];
}

// Interface representing a source dependency for a data asset
export interface SourceAsset {
  name: string;
  project?: string;
  dataset?: string;
  mappings?: FieldMapping[];
}

// The core model for a Data Table Asset containing all metadata
export interface TableMetadata {
  id: string; // Unique internal identifier
  layer: ProductLayer; // Which architectural layer it belongs to
  sources: SourceAsset[]; // List of upstream dependencies
  targetProject?: string; // GCP Project ID
  targetDataset?: string; // BQ Dataset ID
  targetName: string; // Physical table name
  columns: string[]; // List of field names
  primaryKeys: string[]; // Key(s) used for uniqueness checks
  foreignKeys?: ForeignKeyRelationship[]; // Optional relational links
  metricColumns?: string[]; // Columns identified for quantitative analysis
  dimensionColumns?: string[]; // Columns identified for filtering
  checkTypes: TestType[]; // Array of tests applied to this table
  slaThresholdMinutes?: number; // Freshness requirements
  fieldMappings?: FieldMapping[]; // Detailed field-level mappings
}

// Enumeration of all supported dbt-style and reconciliation test types
export enum TestType {
  UNIQUE_PK = 'Unique Primary Key Protocol',
  NOT_NULL = 'Zero-Null Integrity',
  RECON_TOTAL = 'Row Count Reconciliation',
  SCHEMA_VALID = 'Schema Definition Match',
  VOLUME_THRESHOLD = 'Volume Variance Check',
  DATA_TYPE_MATCH = 'Data Type Consistency',
  RELATIONSHIP_FK = 'Referential FK Integrity',
  STAT_RANGE = 'Statistical Range/Outliers',
  ACCEPTED_VALUES = 'Enumerated Accepted Values',
  SCD_INTEGRITY = 'SCD Type 2 Timeline Integrity',
  CROSS_LAYER_METRIC = 'Cross-Layer Metric Recon',
  FRESHNESS_SLA = 'Freshness & SLA Audit',
  DAY1_BASE_LOAD = 'Day 1: Base Load Initialization',
  DAY2_DELTA_VALIDATION = 'Day 2: Delta & Incremental Sync'
}

// Interface for application navigation steps
export interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// Global configuration constants for the environment
export interface GlobalConfig {
  defaultSourceProject: string;
  defaultSourceDataset: string;
  defaultTargetProject: string;
  defaultTargetDataset: string;
}

// Standard UI theme options
export type Theme = 'dark' | 'light';

// Structure returned by the local parsing logic
export interface SmartMappingResponse {
  mappings: Array<{
    targetName: string;
    sources: string[];
    primaryKeys?: string[];
    logicSummary?: string;
  }>;
}

// Test result interface
export interface TestResult {
  testId: string;
  testType: TestType;
  table: string;
  layer: ProductLayer;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  executedAt: Date;
  details?: any;
  sqlQuery?: string;
}

// Mapping document interface
export interface MappingDocument {
  id: string;
  name: string;
  uploadedAt: Date;
  tables: any[];
  status: 'parsed' | 'validated' | 'imported';
}
