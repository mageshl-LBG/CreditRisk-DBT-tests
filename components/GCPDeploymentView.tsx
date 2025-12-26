import React, { useState } from 'react';
import { TableMetadata, ProductLayer } from '../types';
import { TemplateService } from '../services/templateService';

interface GCPDeploymentViewProps {
    tables: TableMetadata[];
    theme: string;
    globalConfig: any;
}

export const GCPDeploymentView: React.FC<GCPDeploymentViewProps> = ({ tables, theme, globalConfig }) => {
    const [selectedLayer, setSelectedLayer] = useState<ProductLayer>(ProductLayer.FDP);
    const [generatedContent, setGeneratedContent] = useState<{ title: string; content: string } | null>(null);

    const filteredTables = tables.filter(t => t.layer === selectedLayer);
    const templateService = new TemplateService(globalConfig);

    const generateDAG = (table: TableMetadata) => {
        const dag = templateService.generateGCPDAG(table, globalConfig.defaultTargetProject);
        setGeneratedContent({
            title: `Composer DAG: ${table.targetName}`,
            content: dag
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
                    <h2 className="text-3xl font-black uppercase italic text-[#FFB81C]">GCP Composer Deployment</h2>
                    <p className="text-sm text-white/40 mt-1">Generate Airflow DAGs for automated orchestration</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[600px]">

                {/* Left: Asset List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    {/* Layer Tabs */}
                    <div className="flex p-1 bg-slate-800 rounded-xl">
                        {[ProductLayer.FDP, ProductLayer.CDP].map(layer => (
                            <button
                                key={layer}
                                onClick={() => setSelectedLayer(layer)}
                                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${selectedLayer === layer
                                        ? 'bg-[#4285F4] text-white shadow-lg'
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
                                <div key={table.id} className="bg-slate-800 border border-white/10 p-4 rounded-xl hover:border-[#4285F4]/50 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm text-white">{table.targetName}</h4>
                                        <div className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">{table.columns.length} cols</div>
                                    </div>

                                    <div className="flex mt-3">
                                        <button
                                            onClick={() => generateDAG(table)}
                                            className="flex-1 px-3 py-2 bg-[#4285F4]/20 border border-[#4285F4]/50 rounded-lg text-[#4285F4] text-[10px] font-bold uppercase hover:bg-[#4285F4]/40 transition-all flex items-center justify-center gap-2"
                                        >
                                            ☁️ Generate DAG
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
                            <div className="text-4xl mb-4 text-[#4285F4]">☁️</div>
                            <p className="text-sm uppercase font-bold">Select an asset to generate Airflow DAG</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
