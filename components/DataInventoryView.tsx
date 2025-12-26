import React, { useState } from 'react';
import { TableMetadata, ProductLayer } from '../types';
import { VisualFieldLineageModal } from './VisualFieldLineageModal';
import { MappingUpload } from './MappingUpload';
import { MappingDocument } from '../services/mappingAnalyzer';


interface DataInventoryViewProps {
    tables: TableMetadata[];
    onTablesChange: (tables: TableMetadata[]) => void;
    theme: string;
}

export const DataInventoryView: React.FC<DataInventoryViewProps> = ({
    tables,
    onTablesChange,
    theme
}) => {
    const [isNewAsset, setIsNewAsset] = useState(false);
    const [lineageModalOpen, setLineageModalOpen] = useState(false);
    const [lineageModalTable, setLineageModalTable] = useState<TableMetadata | null>(null);
    const [selectedLayer, setSelectedLayer] = useState<ProductLayer>(ProductLayer.FDP); // Default to FDP
    const [showMappingUpload, setShowMappingUpload] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<TableMetadata | null>(null);

    const odpTables = tables.filter(t => t.layer === ProductLayer.ODP);
    const fdpTables = tables.filter(t => t.layer === ProductLayer.FDP);
    const cdpTables = tables.filter(t => t.layer === ProductLayer.CDP);

    const handleMappingImport = (doc: MappingDocument) => {
        const newTables: TableMetadata[] = doc.tables.map(t => ({
            id: t.id || `imported-${Date.now()}-${Math.random()}`,
            layer: t.layer as ProductLayer,
            targetName: t.targetTable,
            columns: t.fields.map(f => f.targetField),
            primaryKeys: t.primaryKeys,
            sources: t.sourceTable ? [{
                name: t.sourceTable,
                mappings: t.fields.map(f => ({
                    sourceField: f.sourceField,
                    targetField: f.targetField,
                    transformation: ''
                }))
            }] : [],
            checkTypes: []
        }));

        // Merge new tables with existing ones, avoiding duplicates by ID or name
        const currentTableIds = new Set(tables.map(t => t.id));
        const currentTableNames = new Set(tables.map(t => t.targetName.toUpperCase()));

        const tablesToAdd = newTables.filter(t =>
            !currentTableIds.has(t.id) && !currentTableNames.has(t.targetName.toUpperCase())
        );

        if (tablesToAdd.length > 0) {
            onTablesChange([...tables, ...tablesToAdd]);
        }
        setShowMappingUpload(false);
    };

    const handleNewAsset = () => {
        // Create a temporary new asset for the currently selected layer
        const tempAsset: TableMetadata = {
            id: `temp-${Date.now()}`,
            layer: selectedLayer,
            targetName: '',
            columns: [], // Start with no columns
            primaryKeys: [], // Start with no primary keys
            sources: [],
            checkTypes: []
        };
        setLineageModalTable(tempAsset);
        setIsNewAsset(true);
        setLineageModalOpen(true);
    };

    const handleDeleteAsset = (asset: TableMetadata) => {
        setItemToDelete(asset);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            onTablesChange(tables.filter(t => t.id !== itemToDelete.id));
            setItemToDelete(null);
        }
    };

    const getAvailableSourceTables = (layer: ProductLayer) => {
        if (layer === ProductLayer.CDP) return fdpTables;
        if (layer === ProductLayer.FDP) return odpTables;
        return [];
    };

    const handleOpenLineage = (asset: TableMetadata) => {
        setLineageModalTable(asset);
        setLineageModalOpen(true);
    };

    const handleSaveLineage = (updatedTable: TableMetadata) => {
        if (isNewAsset) {
            // Generate a proper ID for the new asset
            const newAsset = {
                ...updatedTable,
                id: `${updatedTable.layer.toLowerCase()}-${Date.now()}`
            };
            onTablesChange([...tables, newAsset]);
            setIsNewAsset(false);
        } else {
            // Update existing asset
            onTablesChange(tables.map(t => t.id === updatedTable.id ? updatedTable : t));
        }
        setLineageModalOpen(false);
        setLineageModalTable(null);
    };

    const renderAssetCard = (asset: TableMetadata) => {
        const layerColor =
            asset.layer === ProductLayer.ODP ? 'from-blue-500/20 to-blue-600/10 border-blue-500/40' :
                asset.layer === ProductLayer.FDP ? 'from-green-500/20 to-green-600/10 border-green-500/40' :
                    'from-yellow-500/20 to-yellow-600/10 border-yellow-500/40';

        return (
            <div
                key={asset.id}
                className={`bg-gradient-to-br ${layerColor} border-2 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer group`}
                onClick={() => handleOpenLineage(asset)}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h4 className="text-lg font-black uppercase italic text-white mb-1">
                            {asset.targetName}
                        </h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">
                            {asset.layer}
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAsset(asset);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-2"
                    >
                        🗑️
                    </button>
                </div>

                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-white/60">
                        <span className="font-bold">Dataset:</span>
                        <span className="font-mono text-emerald-400">{asset.targetDataset || 'Default'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <span className="font-bold">Keys:</span>
                        <span className="font-mono">{asset.primaryKeys.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <span className="font-bold">Columns:</span>
                        <span className="font-mono">{asset.columns.length}</span>
                    </div>
                    {asset.sources && asset.sources.length > 0 && (
                        <div className="flex items-center gap-2 text-white/60">
                            <span className="font-bold">Sources:</span>
                            <span className="font-mono">{asset.sources.length}</span>
                        </div>
                    )}
                </div>

                {/* Data Mapping Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLineage(asset);
                    }}
                    className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 border-2 border-emerald-500 rounded-lg text-white font-bold text-xs uppercase hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                    🔗 Data Mapping
                </button>
            </div>
        );
    };

    const renderLayerSection = (
        title: string,
        icon: string,
        layer: ProductLayer,
        assets: TableMetadata[],
        color: string
    ) => (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic text-white">{title}</h3>
                    <p className="text-xs text-slate-400">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                    <p className="text-white/30 text-sm">No {title.toLowerCase()} assets yet</p>
                    <p className="text-white/20 text-xs mt-1">Click "+ New {title.split(' ')[0]} Asset" to create one</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map(renderAssetCard)}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-8 space-y-8">
            {/* Layer Selector, Smart Map, and Add New Asset */}
            {/* Layer Selector, Smart Map, and Add New Asset */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-slate-300 uppercase">Select Layer:</label>
                    <select
                        value={selectedLayer}
                        onChange={(e) => setSelectedLayer(e.target.value as ProductLayer)}
                        className="px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white font-bold uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value={ProductLayer.ODP}>ODP (Origination)</option>
                        <option value={ProductLayer.FDP}>FDP (Foundational)</option>
                        <option value={ProductLayer.CDP}>CDP (Consumer)</option>
                    </select>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowMappingUpload(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-500 rounded-xl text-white hover:from-blue-500 hover:to-blue-600 transition-all font-black uppercase text-sm shadow-lg shadow-blue-500/30 flex items-center gap-2"
                    >
                        🧠 Smart Map
                    </button>
                    <button
                        onClick={handleNewAsset}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 border-2 border-emerald-500 rounded-xl text-white hover:from-emerald-500 hover:to-emerald-600 transition-all font-black uppercase text-sm shadow-lg shadow-emerald-500/30"
                    >
                        + New {selectedLayer} Asset
                    </button>
                </div>
            </div>

            {/* Filtered Assets Display */}
            {selectedLayer === ProductLayer.ODP && renderLayerSection('ODP Layer', '📥', ProductLayer.ODP, odpTables, 'from-blue-500/20 to-blue-600/10')}
            {selectedLayer === ProductLayer.FDP && renderLayerSection('FDP Layer', '⚙️', ProductLayer.FDP, fdpTables, 'from-green-500/20 to-green-600/10')}
            {selectedLayer === ProductLayer.CDP && renderLayerSection('CDP Layer', '📊', ProductLayer.CDP, cdpTables, 'from-yellow-500/20 to-yellow-600/10')}

            {/* Smart Mapping Upload Modal */}
            {showMappingUpload && (
                <MappingUpload
                    theme={theme as any}
                    onMappingParsed={handleMappingImport}
                    onClose={() => setShowMappingUpload(false)}
                />
            )}

            {/* Visual Field Lineage Modal */}
            {lineageModalOpen && lineageModalTable && (
                <VisualFieldLineageModal
                    theme={theme}
                    targetTable={lineageModalTable}
                    availableSourceTables={getAvailableSourceTables(lineageModalTable.layer)}
                    onClose={() => {
                        setLineageModalOpen(false);
                        setLineageModalTable(null);
                        setIsNewAsset(false);
                    }}
                    onSave={handleSaveLineage}
                />
            )}

            {/* Delete Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="text-4xl mb-4">🗑️</div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Asset?</h3>
                        <p className="text-slate-400 mb-6">Are you sure you want to delete <span className="text-white font-bold">{itemToDelete.targetName}</span>? This action cannot be undone.</p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white font-bold hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-6 py-3 bg-red-600 hover:bg-red-500 border-2 border-red-500 rounded-xl text-white font-bold transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
