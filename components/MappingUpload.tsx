import React, { useState, useCallback } from 'react';
import { MappingAnalyzer, MappingDocument } from '../services/mappingAnalyzer';
import { IntelligentMappingAnalyzer } from '../services/intelligentMappingAnalyzer';
import { ImageDiagramBuilder } from './ImageDiagramBuilder';
import { Theme, TableMetadata } from '../types';
import * as XLSX from 'xlsx';

interface MappingUploadProps {
    theme: Theme;
    onMappingParsed: (doc: MappingDocument) => void;
    onClose: () => void;
}

export const MappingUpload: React.FC<MappingUploadProps> = ({ theme, onMappingParsed, onClose }) => {
    const [mappingText, setMappingText] = useState('');
    const [parsedDoc, setParsedDoc] = useState<MappingDocument | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [uploadMode, setUploadMode] = useState<'text' | 'image'>('text');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showDiagramBuilder, setShowDiagramBuilder] = useState(false);

    const analyzer = new MappingAnalyzer();
    const intelligentAnalyzer = new IntelligentMappingAnalyzer();

    const handleParse = useCallback(() => {
        try {
            // Use enhanced intelligent analyzer for multi-layer auto-detection
            const result = intelligentAnalyzer.analyze(mappingText);

            // Convert to MappingDocument format for internal UI use
            const doc: MappingDocument = {
                id: `intelligent-${Date.now()}`,
                name: 'Intelligent Mapping Analysis',
                uploadedAt: new Date(),
                status: 'parsed',
                tables: result.tables.map(t => ({
                    id: t.id,
                    layer: t.layer,
                    targetTable: t.targetName,
                    sourceTable: t.sources.length > 0 ? t.sources[0].name : '',
                    fields: t.columns.slice(3).map(col => { // Skip id, created_at, updated_at
                        // Find if this field has a mapping
                        const source = t.sources.find(s => s.mappings.some(m => m.targetField === col));
                        const mapping = source?.mappings.find(m => m.targetField === col);

                        return {
                            sourceField: mapping ? mapping.sourceField : '',
                            targetField: col,
                            sourceType: 'STRING',
                            targetType: 'STRING',
                            required: false,
                            isRequired: false
                        };
                    }),
                    primaryKeys: t.primaryKeys
                }))
            };

            setParsedDoc(doc);
            setErrors([]);
        } catch (error) {
            setErrors([`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        }
    }, [mappingText, intelligentAnalyzer]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const fileName = file.name.toLowerCase();

            // Check if it's an image file
            if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.svg')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageUrl = event.target?.result as string;
                    setUploadedImage(imageUrl);
                    setUploadMode('image');
                };
                reader.readAsDataURL(file);
            }
            // Check if it's an Excel file
            else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = event.target?.result;
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const csvText = XLSX.utils.sheet_to_csv(firstSheet);
                        setMappingText(csvText);
                        setUploadMode('text');
                    } catch (error) {
                        setErrors([`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
                    }
                };
                reader.readAsBinaryString(file);
            } else {
                // Handle CSV/TXT files
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    setMappingText(text);
                    setUploadMode('text');
                };
                reader.readAsText(file);
            }
        }
    }, []);

    const handleImport = () => {
        if (parsedDoc) {
            onMappingParsed(parsedDoc);
            onClose();
        }
    };

    const loadTemplate = () => {
        setMappingText(analyzer.generateTemplate());
    };

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/95 p-8 animate-in zoom-in-95 duration-300">
            <div className={`rounded-[48px] max-w-6xl w-full h-[90vh] p-12 flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-[#0f1715] to-[#0a0f0d]' : 'bg-white'} border-4 border-[#00d4aa]/30 shadow-2xl shadow-[#00d4aa]/20`}>

                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-[#00d4aa] to-white bg-clip-text text-transparent">
                            MAPPING UPLOAD CENTER
                        </h2>
                        <p className="text-xs opacity-40 mt-2">
                            {uploadMode === 'text' ? 'Upload CSV/Excel mappings or paste text format' : 'Upload lineage diagram image'}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        {/* Mode Toggle */}
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setUploadMode('text')}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${uploadMode === 'text' ? 'bg-[#00d4aa] text-black' : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                📄 Text/CSV
                            </button>
                            <button
                                onClick={() => setUploadMode('image')}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${uploadMode === 'image' ? 'bg-[#00d4aa] text-black' : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                🖼️ Diagram
                            </button>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full text-2xl hover:bg-red-500 transition-all">✕</button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
                    {/* Left: Input Area */}
                    <div className="flex flex-col min-h-0">
                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={loadTemplate}
                                className="px-4 py-2 bg-[#00d4aa]/20 border border-[#00d4aa]/50 rounded-xl text-sm font-bold hover:bg-[#00d4aa]/30 transition-all"
                            >
                                📝 Load Template
                            </button>
                            <button
                                onClick={handleParse}
                                className="px-6 py-2 bg-gradient-to-r from-[#00d4aa] to-[#006A4D] rounded-xl text-sm font-black uppercase tracking-wider hover:scale-105 transition-all shadow-lg"
                            >
                                🔍 Parse Mapping
                            </button>
                        </div>

                        {/* Drag & Drop Area */}
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`flex-1 border-2 border-dashed rounded-3xl p-6 transition-all relative ${dragActive
                                ? 'border-[#00d4aa] bg-[#00d4aa]/10'
                                : 'border-white/20 hover:border-white/40'
                                }`}
                        >
                            {/* Hidden file input */}
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.svg,.csv,.txt,.xlsx,.xls"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        const fileName = file.name.toLowerCase();

                                        // Check if it's an image file
                                        if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.svg')) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const imageUrl = event.target?.result as string;
                                                setUploadedImage(imageUrl);
                                                setUploadMode('image');
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                        // Check if it's an Excel file
                                        else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                try {
                                                    const data = event.target?.result;
                                                    const workbook = XLSX.read(data, { type: 'binary' });
                                                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                                    const csvText = XLSX.utils.sheet_to_csv(firstSheet);
                                                    setMappingText(csvText);
                                                    setUploadMode('text');
                                                } catch (error) {
                                                    setErrors([`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
                                                }
                                            };
                                            reader.readAsBinaryString(file);
                                        } else {
                                            // Handle CSV/TXT files
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const text = event.target?.result as string;
                                                setMappingText(text);
                                                setUploadMode('text');
                                            };
                                            reader.readAsText(file);
                                        }
                                    }
                                }}
                                className="hidden"
                                id="file-input"
                            />

                            {/* Upload button overlay */}
                            {!mappingText && !uploadedImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-6xl mb-4">📂</div>
                                    <p className="text-lg font-bold mb-2">Drag & drop files here</p>
                                    <p className="text-sm opacity-60 mb-4">or</p>
                                    <label
                                        htmlFor="file-input"
                                        className="px-6 py-3 bg-gradient-to-r from-[#00d4aa] to-[#006A4D] rounded-xl font-bold cursor-pointer hover:scale-105 transition-all shadow-lg pointer-events-auto"
                                    >
                                        📄 Upload File (Text or Image)
                                    </label>
                                    <p className="text-xs opacity-40 mt-3 text-center max-w-xs">
                                        Supports .csv, .xlsx, .txt for mappings<br />
                                        .png, .jpg, .svg for lineage diagrams
                                    </p>
                                </div>
                            )}

                            {/* Image Preview */}
                            {uploadMode === 'image' && uploadedImage && (
                                <div className="h-full flex flex-col items-center justify-center p-4">
                                    <img
                                        src={uploadedImage}
                                        alt="Lineage Diagram"
                                        className="max-w-full max-h-[400px] object-contain rounded-2xl border-2 border-white/10 mb-4"
                                    />
                                    <button
                                        onClick={() => setShowDiagramBuilder(true)}
                                        className="px-8 py-4 bg-gradient-to-r from-[#00d4aa] to-[#006A4D] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                    >
                                        🎨 Open Diagram Builder
                                    </button>
                                </div>
                            )}

                            <textarea
                                value={mappingText}
                                onChange={(e) => setMappingText(e.target.value)}
                                placeholder="Paste mapping here or drag & drop CSV file...

Format:
source_table,source_field,target_table,target_field,data_type

Example:
raw_customers,customer_id,fdp_customer,id,STRING
raw_customers,name,fdp_customer,customer_name,STRING"
                                className={`w-full h-full bg-transparent border-none outline-none font-mono text-sm resize-none custom-scrollbar ${!mappingText ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            />
                        </div>
                    </div>

                    {/* Right: Preview Area */}
                    <div className="flex flex-col min-h-0">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">
                            📋 Parsed Results
                        </h3>

                        <div className="flex-1 bg-black/40 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
                            {errors.length > 0 && (
                                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
                                    <p className="font-bold text-red-400 mb-2">⚠️ Validation Errors:</p>
                                    {errors.map((err, i) => (
                                        <p key={i} className="text-sm text-red-300">• {err}</p>
                                    ))}
                                </div>
                            )}

                            {parsedDoc && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-2xl">
                                        <p className="text-xs opacity-60">Document ID</p>
                                        <p className="font-mono text-sm">{parsedDoc.id}</p>
                                        <p className="text-xs opacity-60 mt-2">Tables Found</p>
                                        <p className="text-2xl font-black text-[#00d4aa]">{parsedDoc.tables.length}</p>
                                    </div>

                                    {parsedDoc.tables.map((table, idx) => (
                                        <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-xs opacity-40 uppercase tracking-wider">Target Table</p>
                                                    <p className="font-black text-lg text-[#FFB81C]">{table.targetTable}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-[#006A4D] rounded-full text-xs font-bold">
                                                    {table.layer}
                                                </span>
                                            </div>

                                            <p className="text-xs opacity-40 mb-2">Source: {table.sourceTable}</p>
                                            <p className="text-xs opacity-60">Fields: {table.fields.length} mapped</p>

                                            <div className="mt-3 max-h-32 overflow-y-auto custom-scrollbar">
                                                {table.fields.slice(0, 5).map((field: any, fidx: number) => (
                                                    <div key={fidx} className="text-xs py-1 opacity-60">
                                                        {field.sourceField} → {field.targetField} ({field.targetType})
                                                    </div>
                                                ))}
                                                {table.fields.length > 5 && (
                                                    <p className="text-xs opacity-40 italic mt-1">
                                                        +{table.fields.length - 5} more fields...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!parsedDoc && !errors.length && (
                                <div className="flex items-center justify-center h-full opacity-40">
                                    <p className="text-center">
                                        Paste mapping content and click<br />
                                        <strong className="text-[#00d4aa]">Parse Mapping</strong> to analyze
                                    </p>
                                </div>
                            )}
                        </div>

                        {parsedDoc && errors.length === 0 && (
                            <button
                                onClick={handleImport}
                                className="mt-6 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#006A4D] rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#00d4aa]/30"
                            >
                                ✅ Import {parsedDoc.tables.length} Table{parsedDoc.tables.length !== 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Diagram Builder Modal */}
            {showDiagramBuilder && uploadedImage && (
                <ImageDiagramBuilder
                    imageUrl={uploadedImage}
                    existingTables={[]} // TODO: Pass actual existing tables from App.tsx
                    onGenerateAssets={(mergedTables: TableMetadata[]) => {
                        // Convert merged tables to MappingDocument format
                        const doc: MappingDocument = {
                            id: `diagram-${Date.now()}`,
                            name: 'Diagram-Based Mapping (Merged)',
                            uploadedAt: new Date(),
                            status: 'parsed',
                            tables: mergedTables.map(t => ({
                                id: t.id,
                                layer: t.layer,
                                targetTable: t.targetName,
                                sourceTable: t.sources.length > 0 ? t.sources[0].name : '',
                                fields: t.columns.map(col => ({
                                    sourceField: col,
                                    targetField: col,
                                    sourceType: 'STRING',
                                    targetType: 'STRING',
                                    required: false,
                                    isRequired: false
                                })),
                                primaryKeys: t.primaryKeys
                            }))
                        };
                        setParsedDoc(doc);
                        setShowDiagramBuilder(false);
                    }}
                    onClose={() => setShowDiagramBuilder(false)}
                />
            )}
        </div>
    );
};
