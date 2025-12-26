# DataTrust Platform - Beginner's Implementation Guide

## 📚 Table of Contents
1. [Getting Started](#getting-started)
2. [Understanding the 6 Phases](#understanding-the-6-phases)
3. [Phase-by-Phase Guide](#phase-by-phase-guide)
4. [Button Reference](#button-reference)
5. [Common Workflows](#common-workflows)

---

## 🚀 Getting Started

### What is DataTrust?
DataTrust is a **SQL automation platform** that helps you:
- Manage data pipelines across ODP (Origination), FDP (Foundational), and CDP (Consumption) layers
- Generate dbt (data build tool) models automatically
- Run comprehensive data quality tests
- Track data lineage and transformations

### Accessing the Application
Open your web browser and navigate to: **http://localhost:3000/**

---

## 🎯 Understanding the 6 Phases

The application is organized into 6 phases, each serving a specific purpose:

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | **Mapping Upload** | Import your data mapping documents |
| 2 | **Data Products** | View and manage your data assets |
| 3 | **dbt Regression** | Generate SQL models and tests |
| 4 | **Test Dashboard** | Run quality validation tests |
| 5 | **Execution Console** | Monitor real-time execution |
| 6 | **GCP DAG Generator** | Export orchestration workflows |

---

## 📖 Phase-by-Phase Guide

### Phase 1: Mapping Upload

**What it does**: Allows you to upload CSV or Excel files that describe how data flows from source tables to target tables.

#### Step-by-Step Instructions:

1. **Click on "Phase 01: Mapping Upload"** in the left sidebar
   - You'll see a landing page with an upload icon

2. **Click the "📊 Upload Mapping Document" button**
   - A modal window will open

3. **Prepare your mapping file** in this format:
   ```csv
   source_table,source_field,target_table,target_field,data_type
   raw_customers,customer_id,fdp_customer,id,STRING
   raw_customers,name,fdp_customer,customer_name,STRING
   raw_customers,created_date,fdp_customer,created_at,TIMESTAMP
   ```

4. **Upload your file** by either:
   - **Drag and drop** the CSV file into the upload area
   - **Paste the text** directly into the text box

5. **Click "📝 Load Template"** (optional)
   - This loads an example mapping to help you understand the format

6. **Click "🔍 Parse Mapping"**
   - The system will analyze your mapping and show:
     - Number of tables found
     - Source and target table names
     - Field mappings for each table
     - Data layer assignment (ODP/FDP/CDP)

7. **Review the parsed results** in the right panel
   - Check for any validation errors (shown in red)
   - Verify table names and field counts

8. **Click "✅ Import X Tables"** to add them to your inventory
   - The tables will now appear in Phase 2

#### Buttons in this Phase:
- **📝 Load Template**: Loads a sample mapping format
- **🔍 Parse Mapping**: Analyzes your uploaded mapping
- **✅ Import**: Adds parsed tables to your data inventory
- **✕ (Close)**: Closes the upload modal

---

### Phase 2: Data Products

**What it does**: Displays all your data assets organized by layer (ODP, FDP, or CDP).

#### Step-by-Step Instructions:

1. **Click on "Phase 02: Data Products"** in the left sidebar

2. **Select a data layer** from the dropdown at the top:
   - **ODP (Origination)**: Raw data from source systems
   - **FDP (Foundational)**: Cleaned and transformed data
   - **CDP (Consumption)**: Business-ready data for analytics

3. **View your data assets** displayed as cards
   - Each card shows:
     - Table name
     - Data layer (tier)
     - Source tables (lineage)

4. **Click "+ New Data Product"** (top right) to manually add a table:
   - Enter table name
   - Enter field names (comma-separated)
   - Click "Commit Asset"

5. **For each asset card**, you can:
   - **Click "Lineage"**: Edit source table connections
   - **Click "Model"**: Generate SQL code for this table

#### Buttons in this Phase:
- **+ New Data Product**: Manually create a new table
- **Lineage**: Configure which source tables feed into this table
- **Model**: Generate dbt SQL model for this specific table

---

### Phase 3: dbt Regression

**What it does**: Generates dbt project files including SQL models and test configurations.

#### Step-by-Step Instructions:

1. **Click on "Phase 03: dbt Regression"** in the left sidebar

2. **Choose what to generate**:

   **Option A: Preview YAML for current layer**
   - Click "Preview layer YAML"
   - View the schema.yml file with all test configurations
   - This shows data quality tests for the selected layer

   **Option B: Download layer-specific package**
   - Click "Zip ODP" for Origination layer files
   - Click "Zip FDP" for Foundational layer files
   - Click "Zip CDP" for Consumption layer files
   - Downloads a .zip file with models and tests

   **Option C: Download complete package**
   - Click "⚡ Full Automation Pack" (sidebar or top)
   - Downloads all layers in one .zip file

3. **Preview individual models** (left panel):
   - Each table is listed with a "Preview SQL" button
   - Click to see the generated SQL code

#### What you get in the download:
```
Full_DataTrust_Pack.zip
├── models/
│   ├── odp/
│   │   ├── schema.yml          # Tests for ODP tables
│   │   └── *.sql               # SQL models for each table
│   ├── fdp/
│   │   ├── schema.yml          # Tests for FDP tables
│   │   └── *.sql               # SQL models for each table
│   └── cdp/
│       ├── schema.yml          # Tests for CDP tables
│       └── *.sql               # SQL models for each table
└── dbt_project.yml             # dbt configuration
```

#### Buttons in this Phase:
- **Preview layer YAML**: Show test configuration for current layer
- **Zip ODP/FDP/CDP**: Download specific layer package
- **Download Full Pack**: Download all layers together
- **Preview SQL**: View SQL for individual table

---

### Phase 4: Test Dashboard

**What it does**: Runs data quality tests on your tables and shows results visually.

#### Step-by-Step Instructions:

1. **Click on "Phase 04: Test Dashboard"** in the left sidebar

2. **Click "🧪 Open Test Dashboard"**
   - A comprehensive testing interface opens

3. **Select the layer to test** using the header dropdown:
   - ODP: Tests data ingestion quality
   - FDP: Tests transformation accuracy
   - CDP: Tests business logic

4. **Click "▶️ Run All Tests"**
   - Tests will execute one by one
   - Watch the progress in real-time

5. **View test results**:
   - **Stats cards** (top): Total, Passed, Failed, Warnings
   - **Pie chart** (left): Visual distribution of results
   - **Bar chart** (left): Tests by type
   - **Results list** (right): Detailed test outcomes

6. **Click on any test result** to see:
   - SQL query that was run
   - Detailed error messages (if failed)

#### Test Types by Layer:

**ODP Tests**:
- ✅ Schema validation (correct columns exist)
- ⏰ Freshness checks (data is recent)
- 📊 Volume validation (expected row counts)
- 🚫 Null checks (required fields not empty)
- 🔍 Duplicate detection (no duplicate IDs)

**FDP Tests**:
- 🔄 Row count reconciliation (source = target)
- 🔑 Primary key uniqueness
- 🚫 Not null validation
- 📏 Data type consistency
- 🔗 Foreign key integrity
- 📈 SCD Type 2 validation

**CDP Tests**:
- 💰 Metric reconciliation (sums match)
- 📊 Statistical range checks
- ✅ Accepted values validation
- 🚫 Not null checks
- 🔑 Unique keys

#### Buttons in this Phase:
- **🧪 Open Test Dashboard**: Opens the testing interface
- **▶️ Run All Tests**: Executes all tests for selected layer
- **Test result cards**: Click to view SQL query
- **✕ (Close)**: Closes the test dashboard

---

### Phase 5: Execution Console

**What it does**: Provides real-time monitoring of test execution with visual feedback.

#### Step-by-Step Instructions:

1. **Click on "Phase 05: Execution Console"** in the left sidebar

2. **Click "Run Global Verification"**
   - Simulates running all tests across the selected layer
   - Shows progress in real-time

3. **Monitor execution**:
   - **Pie chart** (left): Visual status distribution
   - **Console logs** (right): Detailed execution messages

4. **Interpret the pie chart**:
   - **Green**: Tests passed successfully
   - **Red**: Tests failed
   - **Yellow**: Warnings detected
   - **Gray**: Tests pending

#### Buttons in this Phase:
- **Run Global Verification**: Starts test execution
- **Architectural Tier dropdown**: Select ODP/FDP/CDP layer

---

### Phase 6: GCP DAG Generator

**What it does**: Prepares orchestration templates for Google Cloud Platform's Cloud Composer (Airflow).

#### Current Status:
This phase is ready for Cloud Composer template generation. Templates will be generated on demand when needed.

---

## 🎮 Button Reference

### Global Buttons (Available on All Pages)

| Button | Location | Function |
|--------|----------|----------|
| **🌙 Dark Mode** / **☀️ Light Mode** | Top right header | Toggles between dark and light themes |
| **Architectural Tier dropdown** | Top center header | Switches between ODP, FDP, CDP layers |
| **⚡ Full Automation Pack** | Left sidebar (bottom) | Downloads complete dbt package |
| **📚 Setup Guide** | Left sidebar (bottom) | Opens implementation instructions |

### Phase-Specific Buttons

#### Phase 1 - Mapping Upload
- **📊 Upload Mapping Document**: Opens upload modal
- **📝 Load Template**: Loads example mapping format
- **🔍 Parse Mapping**: Analyzes uploaded mapping
- **✅ Import X Tables**: Adds tables to inventory

#### Phase 2 - Data Products
- **+ New Data Product**: Creates new table manually
- **Lineage**: Edits source table connections
- **Model**: Generates SQL for specific table

#### Phase 3 - dbt Regression
- **Preview layer YAML**: Shows test configuration
- **Zip ODP/FDP/CDP**: Downloads layer-specific package
- **Download Full Pack**: Downloads all layers
- **Preview SQL**: Views individual table SQL

#### Phase 4 - Test Dashboard
- **🧪 Open Test Dashboard**: Opens testing interface
- **▶️ Run All Tests**: Executes all tests
- **Test cards**: Click to view SQL details

#### Phase 5 - Execution Console
- **Run Global Verification**: Starts test execution

---

## 🔄 Common Workflows

### Workflow 1: Import Mappings and Generate dbt Package

1. Go to **Phase 1** → Click "Upload Mapping Document"
2. Upload your CSV mapping file
3. Click "Parse Mapping" → Review results
4. Click "Import" to add tables
5. Go to **Phase 3** → Click "Download Full Pack"
6. Extract the .zip file to your dbt project

### Workflow 2: Run Quality Tests

1. Go to **Phase 2** → Verify your tables are listed
2. Select the layer (ODP/FDP/CDP) from header dropdown
3. Go to **Phase 4** → Click "Open Test Dashboard"
4. Click "Run All Tests"
5. Review results and click failed tests to see details

### Workflow 3: Add a New Table Manually

1. Go to **Phase 2** → Click "+ New Data Product"
2. Enter table name (e.g., `fdp_customer_master`)
3. Enter fields (e.g., `id, name, email, created_at`)
4. Click "Commit Asset"
5. Click "Lineage" to add source tables
6. Select source from dropdown → Click to attach

### Workflow 4: Generate SQL for Specific Table

1. Go to **Phase 2** → Find your table card
2. Click "Model" button on the card
3. View the generated SQL in the modal
4. Click "Copy to Clipboard" to copy the code
5. Paste into your dbt project

---

## 💡 Tips for Beginners

### Understanding Data Layers

- **ODP (Origination Data Platform)**: Think of this as your "raw data inbox"
  - Data comes directly from source systems
  - Minimal transformation
  - Example: `odp_raw_customers`

- **FDP (Foundational Data Platform)**: Your "cleaned and organized data"
  - Data is standardized and validated
  - Business rules applied
  - Example: `fdp_customer_master`

- **CDP (Common Data Platform)**: Your "analytics-ready data"
  - Aggregated and summarized
  - Ready for reporting
  - Example: `cdp_customer_analytics`

### Mapping File Format

Your CSV should have these columns:
1. **source_table**: Where data comes from
2. **source_field**: Column name in source
3. **target_table**: Where data goes to
4. **target_field**: Column name in target
5. **data_type**: STRING, NUMERIC, TIMESTAMP, etc.

### Test Results

- **Green (Pass)**: Everything is good! ✅
- **Yellow (Warning)**: Minor issues, review recommended ⚠️
- **Red (Fail)**: Critical issues, must fix ❌

---

## 🆘 Troubleshooting

### Problem: "No tables found after import"
**Solution**: Check your CSV format. Ensure columns are: `source_table,source_field,target_table,target_field,data_type`

### Problem: "Validation errors when parsing"
**Solution**: 
- Ensure all required fields (id, updated_at) are mapped
- Check for duplicate target field names
- Verify data types are valid (STRING, NUMERIC, TIMESTAMP, BOOLEAN)

### Problem: "Tests failing"
**Solution**:
- Click on the failed test to see the SQL query
- Check if source and target tables exist
- Verify primary keys are correctly defined

---

## 📞 Next Steps

1. **Start with Phase 1**: Upload a simple mapping file
2. **Check Phase 2**: Verify tables were imported
3. **Try Phase 4**: Run tests to validate data quality
4. **Generate in Phase 3**: Download your dbt package

**Remember**: You can always click "📚 Setup Guide" in the sidebar to return to this guide!

---

*Last Updated: December 2025*
*Version: 2.0*
