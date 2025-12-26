# Codebase Map

This document describes the purpose of every active file in the project, helping you understand the architecture of the Data Automation Framework.

## Core Component Structure

### Root
- **`App.tsx`**: The main application container. Manages global state (`tables`, `theme`), handles routing (Tabs: Inventory, DBT Models, GCP, Tests), and coordinates the main views.
- **`types.ts`**: Defines the core data structures (`TableMetadata`, `ProductLayer`, `FieldMapping`) used throughout the app.
- **`constants.tsx`**: Holds global constants or config values (if any).
- **`index.tsx` / `main.tsx`**: The entry point rendering the React app.

### Components (`/components`)

#### Views (Main Tabs)
- **`DataInventoryView.tsx`**: The primary dashboard for managing data assets. Displays assets by layer (ODP/FDP/CDP), allows adding/deleting assets, and triggers the mapping modals.
- **`DBTModelView.tsx`**: The UI for the DBT Models tab. Displays the 12-point protocol, lists assets, and handles generation/download of SQL and YAML artifacts.
- **`GCPDeploymentView.tsx`**: The UI for the GCP Deployment tab. Allows selecting layers and generating Airflow DAGs for Cloud Composer.
- **`TestDashboard.tsx`**: A dashboard for viewing mock test results (pass/fail status of data quality checks).
- **`SimpleTabs.tsx`**: A reusable tab navigation component used in various modals.

#### Modals & Editors
- **`VisualFieldLineageModal.tsx`**: The core "Asset Editor". Handles field definitions, source-to-target mapping, target schema editing, and auto-mapping logic.
- **`MappingUpload.tsx`**: The "Smart Map" modal. Accepts CSV uploads or Images, parses them using `IntelligentMappingAnalyzer`, and creates new assets in bulk.
- **`ImageDiagramBuilder.tsx`**: A visual tool invoked by `MappingUpload` to manually draw/tag tables on an uploaded lineage diagram image if OCR fails.

### Services (`/services`)

- **`templateService.ts`**: The code generation engine. functionality:
    - Generates DBT SQL models with custom properties.
    - Generates DBT YAML with the 12-point regression tests.
    - Generates GCP Airflow DAGs with sensors and operator logic.
- **`intelligentMappingAnalyzer.ts`**: The parsing engine.
    - Parses CSV mapping files.
    - Parses text output from OCR/markdown.
    - Uses heuristics to detect multi-column table layouts and infer layers (ODP/FDP/CDP).
- **`mappingAnalyzer.ts`**: Defines the `MappingDocument` interface and provides basic mapping utilities.
- **`clientSideImageAnalyzer.ts`**: (Optional) Service for client-side image processing.

### Backend (`/backend`)

- **`server.ts`**: Express server handling API requests (mocked or real GCP connections).
- **`.env`**: Configuration for GCP project IDs and credentials (see `GCP_CONNECTIVITY.md`).
