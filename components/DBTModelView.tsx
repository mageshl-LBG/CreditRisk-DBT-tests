import React, { useState } from 'react';
import { TableMetadata, ProductLayer, TestType } from '../types';
import { TemplateService } from '../services/templateService';

interface DBTModelViewProps {
    tables: TableMetadata[];
    theme: string;
    globalConfig: any;
}

const VALIDATION_PROTOCOLS = [
    { id: 1, title: 'Unique Primary Key', desc: 'Ensures PK uniqueness', type: TestType.UNIQUE_PK },
    { id: 2, title: 'Zero-Null Integrity', desc: 'Critical columns cannot be null', type: TestType.NOT_NULL },
    { id: 3, title: 'Row Count Recon', desc: 'Source vs Target count match', type: TestType.RECON_TOTAL },
    { id: 4, title: 'Schema Match', desc: 'Column counts and names align', type: TestType.SCHEMA_VALID },
    { id: 5, title: 'Volume Variance', desc: 'Detects significant data volume shifts', type: TestType.VOLUME_THRESHOLD },
    { id: 6, title: 'Data Type Check', desc: 'Timestamp and numeric consistency', type: TestType.DATA_TYPE_MATCH },
    { id: 7, title: 'Referential Integrity', desc: 'Foreign keys map to valid parents', type: TestType.RELATIONSHIP_FK },
    { id: 8, title: 'Statistical Range', desc: 'Values fall within expected distribution', type: TestType.STAT_RANGE },
    { id: 9, title: 'Accepted Values', desc: 'Enum fields contain valid codes', type: TestType.ACCEPTED_VALUES },
    { id: 10, title: 'SCD Integrity', desc: 'Type 2 history timeline validity', type: TestType.SCD_INTEGRITY },
    { id: 11, title: 'Metric Recon', desc: 'Cross-layer sum/amount verification', type: TestType.CROSS_LAYER_METRIC },
    { id: 12, title: 'Freshness SLA', desc: 'Data arrival within SLA limits', type: TestType.FRESHNESS_SLA },
];

export const DBTModelView: React.FC<DBTModelViewProps> = ({ tables, theme, globalConfig }) => {
    const [selectedLayer, setSelectedLayer] = useState<ProductLayer>(ProductLayer.FDP);
    const [generatedContent, setGeneratedContent] = useState<{ title: string; content: string } | null>(null);

    const filteredTables = tables.filter(t => t.layer === selectedLayer);
    const templateService = new TemplateService(globalConfig);

    const generateSingleConfig = (table: TableMetadata) => {
        const yaml = templateService.generateDBTYaml([table]);
        setGeneratedContent({
            title: `${table.targetName} - Validation Logic (YAML)`,
            content: yaml
        });
    };

    const generateSingleModel = (table: TableMetadata) => {
        const sql = templateService.generateDBTModelSQL(table);
        setGeneratedContent({
            title: `${table.targetName} - DBT Model (SQL)`,
            content: sql
        });
    };

    const copyToClipboard = () => {
        if (generatedContent) {
            navigator.clipboard.writeText(generatedContent.content);
            alert('Copied to clipboard!');
        }
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-black uppercase italic text-[#FFB81C]">DBT Transformation & Validation</h2>
                    <p className="text-sm text-white/40 mt-1">Generate 12-point regression tests and SQL models</p>
                </div>
            </div>

            {/* 12 Validations Grid */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">12-Point Data Trust Protocol</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {VALIDATION_PROTOCOLS.map(p => (
                        <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex-shrink-0 w-6 h-6 rounded bg-[#00d4aa]/20 text-[#00d4aa] flex items-center justify-center font-bold text-xs">
                                {p.id}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">{p.title}</div>
                                <div className="text-[10px] text-white/50 leading-tight mt-0.5">{p.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Layer Selection & Content */}
            <div className="flex flex-col lg:flex-row gap-6 h-[600px]">

                {/* Left: Asset List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    {/* Layer Tabs */}
                    <div className="flex p-1 bg-slate-800 rounded-xl">
                        {[ProductLayer.ODP, ProductLayer.FDP, ProductLayer.CDP].map(layer => (
                            <button
                                key={layer}
                                onClick={() => setSelectedLayer(layer)}
                                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${selectedLayer === layer
                                        ? 'bg-[#00d4aa] text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {layer.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Asset Cards */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {filteredTables.length === 0 ? (
                            <div className="text-center py-10 text-white/30 text-xs italic">
                                No assets in {selectedLayer}
                            </div>
                        ) : (
                            filteredTables.map(table => (
                                <div key={table.id} className="bg-slate-800 border border-white/10 p-4 rounded-xl hover:border-[#00d4aa]/50 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm text-white">{table.targetName}</h4>
                                        <div className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">{table.columns.length} cols</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        <button
                                            onClick={() => generateSingleConfig(table)}
                                            className="px-3 py-2 bg-[#006A4D]/20 border border-[#006A4D]/50 rounded-lg text-[#00d4aa] text-[10px] font-bold uppercase hover:bg-[#006A4D]/40 transition-all flex items-center justify-center gap-2"
                                        >
                                            🛡️ Validations
                                        </button>
                                        <button
                                            onClick={() => generateSingleModel(table)}
                                            className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-[10px] font-bold uppercase hover:bg-blue-500/40 transition-all flex items-center justify-center gap-2"
                                        >
                                            ⚡ SQL Model
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Code Preview */}
                <div className="flex-1 bg-[#0a0f0d] border-2 border-white/10 rounded-2xl overflow-hidden flex flex-col">
                    {generatedContent ? (
                        <>
                            <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                                <span className="font-mono text-xs text-[#FFB81C]">{generatedContent.title}</span>
                                <button onClick={copyToClipboard} className="text-xs text-white/60 hover:text-white uppercase font-bold">
                                    Copy Code
                                </button>
                            </div>
                            <pre className="flex-1 p-6 overflow-auto font-mono text-xs text-slate-300 leading-relaxed custom-scrollbar">
                                {generatedContent.content}
                            </pre>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                            <div className="text-4xl mb-4">￩</div>
                            <p className="text-sm uppercase font-bold">Select an asset to generate code</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
