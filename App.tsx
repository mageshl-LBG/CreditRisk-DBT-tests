
// Core React imports for handling application state and lifecycle
import React, { useState, useEffect, useMemo } from 'react';
// JSZip library for creating downloadable .zip files of generated code
import JSZip from 'jszip';
// Type definitions for data consistency throughout the React app
import { TestType, TableMetadata, Theme, ProductLayer, MappingDocument } from './types';
// Service responsible for converting metadata into physical SQL and dbt artifacts
import { TemplateService } from './services/templateService';
// New simplified UI components
import { SimpleTabs } from './components/SimpleTabs';
import { DataInventoryView } from './components/DataInventoryView';
import { TestDashboard } from './components/TestDashboard';
import { DBTModelView } from './components/DBTModelView';
import { GCPDeploymentView } from './components/GCPDeploymentView';
import { ExecutionConsole } from './components/ExecutionConsole';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState('inventory');
  const [tables, setTables] = useState<TableMetadata[]>(() => {
    // Try to load from legacy key first (where user data is likely stored)
    const savedLegacy = localStorage.getItem('knowledge_base_tables');
    const savedNew = localStorage.getItem('datatrust_tables');

    // Prefer legacy data if it exists and has more/different items, otherwise fall back or merge
    // For now, let's prioritize the one that has data.
    if (savedLegacy && savedLegacy !== '[]') return JSON.parse(savedLegacy);
    if (savedNew && savedNew !== '[]') return JSON.parse(savedNew);

    return [];
  });
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [showTestDashboard, setShowTestDashboard] = useState(false);

  useEffect(() => {
    // Save to BOTH keys for safety during migration, or just revert to the legacy one.
    // Let's stick to the legacy key 'knowledge_base_tables' as primary for now to ensure consistency.
    localStorage.setItem('knowledge_base_tables', JSON.stringify(tables));
    localStorage.setItem('datatrust_tables', JSON.stringify(tables));
  }, [tables]);

  const globalConfig = useMemo(() => ({
    defaultSourceProject: 'bh-odp-prj',
    defaultSourceDataset: 'orig_raw',
    defaultTargetProject: 'bh-fdp-prj',
    defaultTargetDataset: 'found_gold'
  }), []);

  const coreProtocolTests = useMemo(() => [
    TestType.NOT_NULL,
    TestType.UNIQUE_PK,
    TestType.ACCEPTED_VALUES,
    TestType.RELATIONSHIP_FK
  ], []);

  const tabs = [
    { id: 'inventory', label: 'Data Inventory', icon: '📊' },
    { id: 'dbt', label: 'DBT Models', icon: '🔧' },
    { id: 'gcp', label: 'GCP Deployment', icon: '☁️' },
    { id: 'tests', label: 'Test Dashboard', icon: '📋' },
    { id: 'execution', label: 'Execution Console', icon: '🚀' }
  ];

  const handleDownloadPack = async (layer?: ProductLayer) => {
    const zip = new JSZip();
    const templateService = new TemplateService(globalConfig);

    // Filter tables based on requested layer (or all if undefined)
    const tablesToProcess = layer ? tables.filter(t => t.layer === layer) : tables;

    if (tablesToProcess.length === 0) {
      alert(`No assets found for ${layer || 'Full Pack'}`);
      return;
    }

    const packName = layer ? `${layer.split(' ')[0].toLowerCase()}_pack` : 'full_audit_pack';

    // Generate SQL Models
    const modelsFolder = zip.folder('models');
    tablesToProcess.forEach(table => {
      const code = templateService.generateDBTModelSQL(table);
      modelsFolder?.file(`${table.targetName}.sql`, code);
    });

    // Generate Regression Tests (schema.yml)
    const yaml = templateService.generateDBTYaml(tablesToProcess);
    modelsFolder?.file('schema.yml', yaml);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datatrust_${packName}.zip`;
    a.click();
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans transition-all duration-500 ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#0a0f0d] via-[#0d1410] to-[#0a0f0d] text-slate-100'
      : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900'
      }`}>

      {/* HEADER */}
      <header className={`h-20 flex items-center justify-between px-8 shrink-0 z-10 border-b ${theme === 'dark'
        ? 'bg-[#0f1715]/60 backdrop-blur-2xl border-white/10'
        : 'bg-white/70 backdrop-blur-2xl border-slate-200'
        }`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#00d4aa] to-[#006A4D] rounded-2xl shadow-xl shadow-[#00d4aa]/40">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter uppercase italic leading-none bg-gradient-to-r from-white to-[#00d4aa] bg-clip-text text-transparent">
              DataTrust
            </h1>
            <p className="text-[9px] text-[#00d4aa] font-black uppercase tracking-[0.4em]">SQL Automation Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">Total Assets</p>
            <p className="text-2xl font-black text-[#FFB81C]">{tables.length}</p>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 hover:from-[#FFB81C]/30 hover:to-[#FF8C00]/30 transition-all duration-300 font-black uppercase text-[10px] tracking-widest border border-white/10 hover:border-[#FFB81C]/50"
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>

      {/* TABS */}
      <SimpleTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
      />

      {/* MAIN CONTENT */}
      <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {activeTab === 'inventory' && (
          <DataInventoryView
            tables={tables}
            onTablesChange={setTables}
            theme={theme}
          />
        )}

        {activeTab === 'dbt' && (
          <>
            <div className="p-8 flex justify-end">
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPack()}
                  className="px-4 py-3 bg-gradient-to-r from-[#00d4aa] to-[#006A4D] rounded-xl font-bold uppercase text-[10px] hover:scale-105 transition-all shadow-lg shadow-[#00d4aa]/20 border border-white/10"
                >
                  📥 Full Audit Pack (All)
                </button>
                <div className="w-px bg-white/20 mx-2"></div>
                <button
                  onClick={() => handleDownloadPack(ProductLayer.ODP)}
                  className="px-4 py-3 bg-blue-600/30 border border-blue-500/50 rounded-xl font-bold uppercase text-[10px] hover:bg-blue-600/50 transition-all text-blue-200"
                >
                  📥 ODP Pack
                </button>
                <button
                  onClick={() => handleDownloadPack(ProductLayer.FDP)}
                  className="px-4 py-3 bg-emerald-600/30 border border-emerald-500/50 rounded-xl font-bold uppercase text-[10px] hover:bg-emerald-600/50 transition-all text-emerald-200"
                >
                  📥 FDP Pack
                </button>
                <button
                  onClick={() => handleDownloadPack(ProductLayer.CDP)}
                  className="px-4 py-3 bg-yellow-600/30 border border-yellow-500/50 rounded-xl font-bold uppercase text-[10px] hover:bg-yellow-600/50 transition-all text-yellow-200"
                >
                  📥 CDP Pack
                </button>
              </div>
            </div>
            <DBTModelView
              tables={tables}
              theme={theme}
              globalConfig={globalConfig}
            />
          </>
        )}

        {activeTab === 'gcp' && (
          <GCPDeploymentView
            tables={tables}
            theme={theme}
            globalConfig={globalConfig}
          />
        )}

        {activeTab === 'tests' && (
          <TestDashboard
            theme={theme}
            tables={tables}
            selectedLayer={ProductLayer.FDP}
            onClose={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'execution' && (
          <ExecutionConsole
            tables={tables}
            theme={theme}
            globalConfig={globalConfig}
          />
        )}

      </main>

      {/* Test Dashboard Modal */}
      {showTestDashboard && (
        <TestDashboard
          theme={theme}
          tables={tables}
          selectedLayer={ProductLayer.FDP}
          onClose={() => setShowTestDashboard(false)}
        />
      )}
    </div>
  );
};

export default App;
