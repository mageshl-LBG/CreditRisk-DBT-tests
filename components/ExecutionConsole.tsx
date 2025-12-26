
import React, { useState } from 'react';
import { TableMetadata, ProductLayer, TestType } from '../types';
import { TemplateService } from '../services/templateService';

interface ExecutionConsoleProps {
    tables: TableMetadata[];
    theme: string;
    globalConfig: any;
}

const REGIONS = [
    { id: 'US', name: 'United States (US Multi-region)' },
    { id: 'EU', name: 'European Union (EU Multi-region)' },
    { id: 'us-central1', name: 'us-central1 (Iowa)' },
    { id: 'us-east1', name: 'us-east1 (South Carolina)' },
    { id: 'europe-west1', name: 'europe-west1 (Belgium)' },
    { id: 'asia-south1', name: 'asia-south1 (Mumbai)' },
    { id: 'asia-east1', name: 'asia-east1 (Taiwan)' }
];

const ENVIRONMENTS = ['BLD', 'INT', 'PRE', 'PROD'];

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ tables, theme, globalConfig }) => {
    const [selectedLayer, setSelectedLayer] = useState<ProductLayer>(ProductLayer.FDP);
    const [selectedEnv, setSelectedEnv] = useState('BLD');
    const [selectedRegion, setSelectedRegion] = useState('US');
    const [selectedAsset, setSelectedAsset] = useState<TableMetadata | null>(null);
    const [selectedTest, setSelectedTest] = useState<TestType>(TestType.NOT_NULL);

    const [generatedSQL, setGeneratedSQL] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [executionResult, setExecutionResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filteredTables = tables.filter(t => t.layer === selectedLayer);
    const templateService = new TemplateService(globalConfig);

    const handleGenerateSQL = () => {
        if (!selectedAsset) return;
        const sql = templateService.getSQLForTest(selectedTest, selectedAsset);
        setGeneratedSQL(sql);
        setExecutionResult(null);
        setError(null);
    };

    const handleRunTest = async () => {
        if (!generatedSQL) return;

        setIsRunning(true);
        setExecutionResult(null);
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/bigquery/execute-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'x-api-key': 'your-secret-key' // Should come from env or user input in real app
                },
                body: JSON.stringify({
                    query: generatedSQL,
                    environment: selectedEnv,
                    location: selectedRegion
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to execute query');
            }

            setExecutionResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown execution error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start shrink-0">
                <div>
                    <h2 className="text-3xl font-black uppercase italic text-[#FFB81C]">GCP Execution Console</h2>
                    <p className="text-sm text-white/40 mt-1">Direct query execution against BigQuery environments</p>
                </div>

                {/* Env & Region Selectors */}
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">Environment</label>
                        <select
                            value={selectedEnv}
                            onChange={(e) => setSelectedEnv(e.target.value)}
                            className="bg-slate-800 border-2 border-slate-600 rounded-lg px-3 py-2 text-white font-bold text-sm outline-none focus:border-[#FFB81C]"
                        >
                            {ENVIRONMENTS.map(env => (
                                <option key={env} value={env}>{env}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">Region</label>
                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="bg-slate-800 border-2 border-slate-600 rounded-lg px-3 py-2 text-white font-bold text-sm outline-none focus:border-[#FFB81C]"
                        >
                            {REGIONS.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left Sidebar: Asset Selection */}
                <div className="w-1/4 flex flex-col gap-4 bg-slate-900/50 border border-white/10 rounded-2xl p-4 overflow-hidden">
                    <div className="flex gap-2 mb-2 p-1 bg-slate-800 rounded-lg shrink-0">
                        {[ProductLayer.ODP, ProductLayer.FDP, ProductLayer.CDP].map(layer => (
                            <button
                                key={layer}
                                onClick={() => { setSelectedLayer(layer); setSelectedAsset(null); }}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${selectedLayer === layer
                                    ? 'bg-[#FFB81C] text-black shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {layer.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {filteredTables.map(table => (
                            <div
                                key={table.id}
                                onClick={() => {
                                    setSelectedAsset(table);
                                    // Auto-generate SQL when selecting a new asset if test type is ready
                                    // But user needs to click button to be explicit
                                }}
                                className={`p-3 rounded-xl border border-transparent cursor-pointer transition-all ${selectedAsset?.id === table.id
                                        ? 'bg-[#FFB81C]/20 border-[#FFB81C]/50'
                                        : 'bg-slate-800 hover:bg-slate-700'
                                    }`}
                            >
                                <p className="font-bold text-sm text-white truncate">{table.targetName}</p>
                                <p className="text-[10px] text-white/40 mt-1">{table.columns.length} columns</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle: Configuration & SQL */}
                <div className="w-2/5 flex flex-col gap-4">
                    {/* Test Type Selector */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 shrink-0">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2 block">Test Protocol</label>
                        <div className="flex gap-2">
                            <select
                                value={selectedTest}
                                onChange={(e) => setSelectedTest(e.target.value as TestType)}
                                className="flex-1 bg-slate-800 border-2 border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#FFB81C]"
                            >
                                {Object.values(TestType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleGenerateSQL}
                                disabled={!selectedAsset}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs uppercase"
                            >
                                Generate SQL
                            </button>
                        </div>
                    </div>

                    {/* SQL Editor / Preview */}
                    <div className="flex-1 bg-[#0a0f0d] border border-white/10 rounded-2xl p-4 flex flex-col overflow-hidden relative group">
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00d4aa]">Generated SQL</span>
                            <button
                                onClick={handleRunTest}
                                disabled={!generatedSQL || isRunning}
                                className="px-6 py-2 bg-[#00d4aa] hover:bg-[#00b395] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg font-black text-xs uppercase shadow-lg shadow-[#00d4aa]/20 transition-all flex items-center gap-2"
                            >
                                {isRunning ? (
                                    <>
                                        <span className="animate-spin text-lg">⚙️</span> Running...
                                    </>
                                ) : (
                                    <>
                                        <span>▶️</span> Run Test
                                    </>
                                )}
                            </button>
                        </div>
                        <textarea
                            value={generatedSQL}
                            onChange={(e) => setGeneratedSQL(e.target.value)}
                            className="flex-1 bg-transparent text-slate-300 font-mono text-xs resize-none outline-none custom-scrollbar leading-relaxed"
                            placeholder="Select an asset and generate SQL to start..."
                        />
                    </div>
                </div>

                {/* Right: Results */}
                <div className="flex-1 flex flex-col bg-[#0a0f0d] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Execution Result</span>
                        {executionResult && (
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${executionResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {executionResult.success ? 'SUCCESS' : 'FAILED'}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-xs font-mono">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {executionResult ? (
                            <div className="space-y-4">
                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-[10px] uppercase text-slate-500">Duration</p>
                                        <p className="text-lg font-mono text-white">{executionResult.executionTime}ms</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-[10px] uppercase text-slate-500">Bytes Processed</p>
                                        <p className="text-lg font-mono text-white">{(parseInt(executionResult.bytesProcessed) / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>

                                {/* Data Rows */}
                                {executionResult.rows.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs font-mono">
                                            <thead className="text-slate-500 border-b border-white/10">
                                                <tr>
                                                    {Object.keys(executionResult.rows[0]).map(key => (
                                                        <th key={key} className="p-2 truncate max-w-[150px]">{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10 text-slate-300">
                                                {executionResult.rows.map((row: any, i: number) => (
                                                    <tr key={i} className="hover:bg-white/5">
                                                        {Object.values(row).map((val: any, j: number) => (
                                                            <td key={j} className="p-2 truncate max-w-[150px]">
                                                                {val === null ? <span className="text-slate-600">NULL</span> : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 italic text-xs">
                                        No rows returned
                                    </div>
                                )}
                            </div>
                        ) : !error && (
                            <div className="flex flex-col items-center justify-center h-full text-white/20">
                                <span className="text-4xl mb-4">⚡</span>
                                <p className="text-sm uppercase font-bold">Ready to Execute</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
