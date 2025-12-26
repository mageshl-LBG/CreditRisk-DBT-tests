import React, { useState } from 'react';
import { TableMetadata } from '../types';

interface FieldMapping {
    sourceField: string;
    targetField: string;
    transformation?: string;
}

interface SourceTableMapping {
    sourceTableName: string;
    mappings: FieldMapping[];
}

interface VisualFieldLineageModalProps {
    theme: string;
    targetTable: TableMetadata;
    availableSourceTables: TableMetadata[];
    onClose: () => void;
    onSave: (updatedTable: TableMetadata) => void;
}

export const VisualFieldLineageModal: React.FC<VisualFieldLineageModalProps> = ({
    theme,
    targetTable,
    availableSourceTables,
    onClose,
    onSave
}) => {
    const [tableName, setTableName] = useState(targetTable.targetName);
    const [dataset, setDataset] = useState(targetTable.targetDataset || '');
    const [primaryKeys, setPrimaryKeys] = useState(targetTable.primaryKeys.join(', '));
    const [columns, setColumns] = useState<string[]>(targetTable.columns);
    const [newField, setNewField] = useState('');

    const [sourceMappings, setSourceMappings] = useState<SourceTableMapping[]>(
        targetTable.sources?.map(s => ({
            sourceTableName: s.name,
            mappings: s.mappings?.map(m => ({
                sourceField: m.sourceField,
                targetField: m.targetField,
                transformation: m.transformation
            })) || []
        })) || []
    );

    const [warningModal, setWarningModal] = useState<{
        isOpen: boolean;
        field: string;
        sourceTableName: string;
        index: number;
        value: string;
    } | null>(null);

    const addColumn = () => {
        if (newField && !columns.includes(newField)) {
            setColumns([...columns, newField]);
            setNewField('');
        }
    };

    const removeColumn = (colToRemove: string) => {
        setColumns(columns.filter(c => c !== colToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addColumn();
        }
    };

    const addSourceTable = (sourceTableName: string) => {
        if (!sourceTableName || sourceMappings.some(s => s.sourceTableName === sourceTableName)) return;
        setSourceMappings([...sourceMappings, { sourceTableName, mappings: [] }]);
    };

    const removeSourceTable = (sourceTableName: string) => {
        setSourceMappings(sourceMappings.filter(s => s.sourceTableName !== sourceTableName));
    };

    const addFieldMapping = (sourceTableName: string) => {
        setSourceMappings(sourceMappings.map(s =>
            s.sourceTableName === sourceTableName
                ? { ...s, mappings: [...s.mappings, { sourceField: '', targetField: '', transformation: '' }] }
                : s
        ));
    };

    const performMappingUpdate = (sourceTableName: string, index: number, field: keyof FieldMapping, value: string) => {
        setSourceMappings(current => current.map(s =>
            s.sourceTableName === sourceTableName
                ? {
                    ...s,
                    mappings: s.mappings.map((m, i) =>
                        i === index ? { ...m, [field]: value } : m
                    )
                }
                : s
        ));
    };

    const updateFieldMapping = (sourceTableName: string, index: number, field: keyof FieldMapping, value: string) => {
        // Intercept targetField changes to check for duplicates
        if (field === 'targetField' && value) {
            const isDuplicate = sourceMappings.some(s =>
                s.mappings.some((m, i) =>
                    m.targetField === value &&
                    // Exclude the current mapping being edited (to allow re-selecting same value without warning)
                    !(s.sourceTableName === sourceTableName && i === index)
                )
            );

            if (isDuplicate) {
                setWarningModal({
                    isOpen: true,
                    field: value,
                    sourceTableName,
                    index,
                    value
                });
                return;
            }
        }
        performMappingUpdate(sourceTableName, index, field, value);
    };

    const confirmWarning = () => {
        if (warningModal) {
            performMappingUpdate(warningModal.sourceTableName, warningModal.index, 'targetField', warningModal.value);
            setWarningModal(null);
        }
    };

    const removeFieldMapping = (sourceTableName: string, index: number) => {
        setSourceMappings(sourceMappings.map(s =>
            s.sourceTableName === sourceTableName
                ? { ...s, mappings: s.mappings.filter((_, i) => i !== index) }
                : s
        ));
    };

    const getSourceTable = (name: string) => availableSourceTables.find(t => t.targetName === name);

    const handleSave = () => {
        const updatedTable: TableMetadata = {
            ...targetTable,
            targetName: tableName.toUpperCase(),
            targetDataset: dataset || undefined,
            columns: columns,
            primaryKeys: primaryKeys.split(',').map(k => k.trim()),
            sources: sourceMappings.map(s => ({
                name: s.sourceTableName,
                mappings: s.mappings.filter(m => m.sourceField && m.targetField).map(m => ({
                    sourceField: m.sourceField,
                    targetField: m.targetField,
                    transformation: m.transformation
                }))
            }))
        };
        onSave(updatedTable);
        onClose();
    };

    const totalMappings = sourceMappings.reduce((sum, s) => sum + s.mappings.length, 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/50 rounded-3xl shadow-2xl shadow-emerald-500/20 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col relative">

                {/* Duplicate Mapping Warning Modal */}
                {warningModal && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center">
                        <div className="bg-slate-900 border-2 border-yellow-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="text-4xl mb-4 text-center">⚠️</div>
                            <h3 className="text-xl font-bold text-white mb-2 text-center">Duplicate Mapping Detected</h3>
                            <p className="text-slate-300 mb-6 text-center">
                                The field <span className="text-yellow-400 font-bold font-mono">{warningModal.field}</span> is already mapped.
                                <br /><br />
                                Do you want to add transformation logic?
                            </p>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setWarningModal(null)}
                                    className="px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white font-bold hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmWarning}
                                    className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 border-2 border-yellow-500 rounded-xl text-white font-bold transition-all"
                                >
                                    Yes, Add Logic
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b-2 border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-3xl font-black uppercase italic text-white">Field-Level Data Lineage</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white text-2xl transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Target Table Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-800/50 border-2 border-slate-700 rounded-xl p-4">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Dataset</label>
                            <input
                                type="text"
                                value={dataset}
                                onChange={(e) => setDataset(e.target.value)}
                                placeholder="Default"
                                className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-2 text-white font-bold outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex-[2] bg-slate-800/50 border-2 border-slate-700 rounded-xl p-4">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Table Name</label>
                            <input
                                type="text"
                                value={tableName}
                                onChange={(e) => setTableName(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-2 text-white font-bold text-lg outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex-[2] bg-slate-800/50 border-2 border-slate-700 rounded-xl p-4">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Primary Keys</label>
                            <input
                                type="text"
                                value={primaryKeys}
                                onChange={(e) => setPrimaryKeys(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-2 text-white font-mono outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-4 text-center min-w-[100px]">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Total Fields</label>
                            <div className="text-2xl font-black text-emerald-400">{columns.length}</div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Target Schema Section */}
                    <div className="bg-slate-800/30 border-2 border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                            <span>📋</span> Target Table Schema
                        </h3>

                        <div className="flex gap-4 mb-4">
                            <input
                                type="text"
                                value={newField}
                                onChange={(e) => setNewField(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter field name (e.g. customer_id) and press Enter"
                                className="flex-1 bg-slate-900 border-2 border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"
                            />
                            <button
                                onClick={addColumn}
                                disabled={!newField}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 border-2 border-emerald-500 disabled:border-slate-600 rounded-xl text-white font-bold uppercase transition-all"
                            >
                                + Add Field
                            </button>
                        </div>

                        {columns.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {columns.map(col => (
                                    <div key={col} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1 flex items-center gap-2 group hover:border-emerald-500 transition-all">
                                        <span className="text-sm font-mono text-emerald-400">{col}</span>
                                        <button
                                            onClick={() => removeColumn(col)}
                                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 border-2 border-dashed border-slate-700 rounded-xl">
                                <p className="text-slate-500 text-sm">No fields defined yet. Add fields to map data to them.</p>
                            </div>
                        )}
                    </div>

                    {/* Source Tables and Mappings */}
                    {sourceMappings.map((sourceMapping) => {
                        const sourceTable = getSourceTable(sourceMapping.sourceTableName);
                        if (!sourceTable) return null;

                        return (
                            <div key={sourceMapping.sourceTableName} className="bg-slate-800/30 border-2 border-slate-700 rounded-2xl p-6">
                                {/* Source Table Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/20 border-2 border-blue-500/50 rounded-lg flex items-center justify-center">
                                            📦
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white">{sourceMapping.sourceTableName}</h3>
                                            <p className="text-xs text-emerald-400 font-bold">{sourceMapping.mappings.length} mappings</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeSourceTable(sourceMapping.sourceTableName)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-all"
                                    >
                                        ✕ Remove
                                    </button>
                                </div>

                                {/* Field Mappings */}
                                <div className="space-y-3">
                                    {sourceMapping.mappings.map((mapping, index) => (
                                        <div key={index} className="bg-slate-900/50 border-2 border-slate-700 rounded-xl p-4">
                                            <div className="grid grid-cols-12 gap-4 items-center">
                                                {/* Source Field */}
                                                <div className="col-span-4">
                                                    <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Source Field</label>
                                                    <select
                                                        value={mapping.sourceField}
                                                        onChange={(e) => updateFieldMapping(sourceMapping.sourceTableName, index, 'sourceField', e.target.value)}
                                                        className="w-full bg-blue-500/10 border-2 border-blue-500/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-400"
                                                    >
                                                        <option value="">Select field...</option>
                                                        {sourceTable.columns.map(col => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Arrow */}
                                                <div className="col-span-1 flex justify-center">
                                                    <div className="text-2xl text-emerald-400">→</div>
                                                </div>

                                                {/* Target Field */}
                                                <div className="col-span-4">
                                                    <label className="text-[10px] font-bold text-emerald-400 uppercase mb-1 block">Target Field</label>
                                                    <select
                                                        value={mapping.targetField}
                                                        onChange={(e) => updateFieldMapping(sourceMapping.sourceTableName, index, 'targetField', e.target.value)}
                                                        className="w-full bg-emerald-500/10 border-2 border-emerald-500/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-400"
                                                    >
                                                        <option value="">Select field...</option>
                                                        {columns.map(col => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Transformation */}
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-purple-400 uppercase mb-1 block">Transform</label>
                                                    <input
                                                        type="text"
                                                        value={mapping.transformation || ''}
                                                        onChange={(e) => updateFieldMapping(sourceMapping.sourceTableName, index, 'transformation', e.target.value)}
                                                        placeholder="Optional"
                                                        className="w-full bg-purple-500/10 border-2 border-purple-500/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-400 font-mono"
                                                    />
                                                </div>

                                                {/* Delete Button */}
                                                <div className="col-span-1 flex justify-center">
                                                    <button
                                                        onClick={() => removeFieldMapping(sourceMapping.sourceTableName, index)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-lg transition-all"
                                                    >
                                                        ⊗
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Mapping Button */}
                                    <button
                                        onClick={() => addFieldMapping(sourceMapping.sourceTableName)}
                                        className="w-full border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl py-3 text-slate-400 hover:text-emerald-400 transition-all font-bold uppercase text-sm"
                                    >
                                        + Add Mapping
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Source Table */}
                    <div className="border-2 border-dashed border-slate-600 rounded-2xl p-6">
                        <select
                            onChange={(e) => {
                                addSourceTable(e.target.value);
                                e.target.value = '';
                            }}
                            className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">+ Add Source Table</option>
                            {availableSourceTables
                                .filter(t => !sourceMappings.some(s => s.sourceTableName === t.targetName))
                                .map(t => (
                                    <option key={t.id} value={t.targetName}>{t.targetName}</option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-800 border-t-2 border-slate-700 p-6 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        Total Mappings: <span className="font-bold text-emerald-400">{totalMappings}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 border-2 border-emerald-500 rounded-xl text-white font-black uppercase hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-500/30"
                        >
                            💾 Save Changes
                        </button>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-white font-bold hover:bg-slate-600 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
