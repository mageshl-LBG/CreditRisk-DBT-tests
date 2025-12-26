import React, { useState } from 'react';
import { TableMetadata, ProductLayer, Theme, TestType, TestResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { TemplateService } from '../services/templateService';

interface TestDashboardProps {
    theme: Theme;
    tables: TableMetadata[];
    selectedLayer: ProductLayer;
    onClose: () => void;
}

export const TestDashboard: React.FC<TestDashboardProps> = ({ theme, tables, selectedLayer, onClose }) => {
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

    // Mock Test Suite Configuration
    const testSuite = {
        name: 'Data Trust Protocol Suite',
        tests: Object.values(TestType).map(t => ({ type: t, enabled: true }))
    };

    const runTests = async () => {
        setIsRunning(true);
        setTestResults([]);

        const layerTables = tables.filter(t => t.layer === selectedLayer);
        const results: TestResult[] = [];
        const templateService = new TemplateService({
            defaultSourceProject: 'src', defaultSourceDataset: 'src',
            defaultTargetProject: 'tgt', defaultTargetDataset: 'tgt'
        });

        for (const table of layerTables) {
            // Pick a subset of tests to run based on table columns
            const applicableTests = testSuite.tests.slice(0, 5); // Just run first 5 for demo

            for (const test of applicableTests) {
                // Simulate test execution with delay
                await new Promise(resolve => setTimeout(resolve, 100));

                const status = Math.random() > 0.2 ? 'pass' : (Math.random() > 0.5 ? 'warning' : 'fail');

                const result: TestResult = {
                    testId: `${table.id}-${test.type}`,
                    testType: test.type,
                    table: table.targetName,
                    layer: table.layer,
                    status: status as any,
                    message: status === 'pass' ? 'Validation successful' : 'Architectural constraint violation detected',
                    executedAt: new Date(),
                    sqlQuery: templateService.getSQLForTest(test.type, table)
                };

                results.push(result);
                setTestResults([...results]);
            }
        }

        setIsRunning(false);
    };

    const stats = {
        total: testResults.length,
        passed: testResults.filter(r => r.status === 'pass').length,
        failed: testResults.filter(r => r.status === 'fail').length,
        warnings: testResults.filter(r => r.status === 'warning').length,
    };

    const chartData = [
        { name: 'Passed', value: stats.passed, color: '#00d4aa' },
        { name: 'Failed', value: stats.failed, color: '#ef4444' },
        { name: 'Warnings', value: stats.warnings, color: '#FFB81C' },
    ];

    const testsByType = Object.values(TestType).map(type => ({
        type: type.split(' ')[0],
        count: testResults.filter(r => r.testType === type).length,
        passed: testResults.filter(r => r.testType === type && r.status === 'pass').length,
    }));

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/95 p-8 animate-in zoom-in-95 duration-300">
            <div className={`rounded-[48px] max-w-7xl w-full h-[90vh] p-12 flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-[#0f1715] to-[#0a0f0d]' : 'bg-white'} border-4 border-[#FFB81C]/30 shadow-2xl shadow-[#FFB81C]/20`}>

                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-[#FFB81C] to-white bg-clip-text text-transparent">
                            🧪 Data Quality Test Dashboard
                        </h2>
                        <p className="text-sm opacity-60 mt-2">{testSuite.name} - {selectedLayer}</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={runTests}
                            disabled={isRunning}
                            className={`px-8 py-3 bg-gradient-to-r from-[#FFB81C] to-[#FF8C00] rounded-2xl font-black uppercase tracking-wider transition-all shadow-xl ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                                }`}
                        >
                            {isRunning ? '⏳ Running...' : '▶️ Run All Tests'}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-14 h-14 bg-white/10 rounded-full text-2xl hover:bg-red-500 transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="p-6 bg-gradient-to-br from-white/5 to-white/10 rounded-3xl border border-white/10">
                        <p className="text-xs opacity-60 uppercase tracking-wider mb-2">Total Tests</p>
                        <p className="text-4xl font-black">{stats.total}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-[#00d4aa]/20 to-[#00d4aa]/10 rounded-3xl border border-[#00d4aa]/30">
                        <p className="text-xs opacity-60 uppercase tracking-wider mb-2">✅ Passed</p>
                        <p className="text-4xl font-black text-[#00d4aa]">{stats.passed}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-3xl border border-red-500/30">
                        <p className="text-xs opacity-60 uppercase tracking-wider mb-2">❌ Failed</p>
                        <p className="text-4xl font-black text-red-400">{stats.failed}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-[#FFB81C]/20 to-[#FFB81C]/10 rounded-3xl border border-[#FFB81C]/30">
                        <p className="text-xs opacity-60 uppercase tracking-wider mb-2">⚠️ Warnings</p>
                        <p className="text-4xl font-black text-[#FFB81C]">{stats.warnings}</p>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
                    {/* Left: Charts */}
                    <div className="flex flex-col gap-6">
                        <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">Test Results Distribution</h3>
                            {testResults.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: '#000',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '11px'
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full opacity-40">
                                    <p>Run tests to see results</p>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">Tests by Type</h3>
                            {testResults.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={testsByType.slice(0, 6)}>
                                        <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#000',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '11px'
                                            }}
                                        />
                                        <Bar dataKey="passed" fill="#00d4aa" />
                                        <Bar dataKey="count" fill="#475569" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full opacity-40">
                                    <p>No data yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Test Results List */}
                    <div className="flex flex-col bg-white/5 rounded-3xl border border-white/10 p-6 overflow-hidden">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">Test Results</h3>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {testResults.map((result) => (
                                <div
                                    key={result.testId}
                                    onClick={() => setSelectedTest(result)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${result.status === 'pass'
                                        ? 'bg-[#00d4aa]/10 border-[#00d4aa]/30'
                                        : result.status === 'fail'
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-[#FFB81C]/10 border-[#FFB81C]/30'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p className="text-xs opacity-60">{result.table}</p>
                                            <p className="font-bold text-sm">{result.testType}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${result.status === 'pass'
                                            ? 'bg-[#00d4aa] text-black'
                                            : result.status === 'fail'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-[#FFB81C] text-black'
                                            }`}>
                                            {result.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-xs opacity-60">{result.message}</p>
                                </div>
                            ))}

                            {testResults.length === 0 && !isRunning && (
                                <div className="flex items-center justify-center h-full opacity-40">
                                    <p className="text-center">
                                        Click <strong className="text-[#FFB81C]">Run All Tests</strong><br />
                                        to start quality validation
                                    </p>
                                </div>
                            )}

                            {isRunning && (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin text-6xl mb-4">⚙️</div>
                                        <p className="text-[#FFB81C] font-bold">Running tests...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SQL Preview Modal */}
                {selectedTest && (
                    <div
                        className="fixed inset-0 z-[9100] flex items-center justify-center bg-black/80 p-8"
                        onClick={() => setSelectedTest(null)}
                    >
                        <div
                            className="bg-[#0a0f0d] rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-black mb-4">{selectedTest.testType}</h3>
                            <p className="text-sm opacity-60 mb-6">{selectedTest.table}</p>

                            <div className="bg-black/60 rounded-2xl p-6 font-mono text-xs overflow-x-auto custom-scrollbar">
                                <pre className="text-[#00d4aa]">{selectedTest.sqlQuery}</pre>
                            </div>

                            <button
                                onClick={() => setSelectedTest(null)}
                                className="mt-6 px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
