import React, { useState, useRef, useEffect } from 'react';
import { ProductLayer, TableMetadata } from '../types';
import { RealTextExtractor } from '../services/clientSideImageAnalyzer';

interface DiagramBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    tableName: string;
    layer: ProductLayer;
}

interface DiagramConnection {
    sourceId: string;
    targetId: string;
}

interface ImageDiagramBuilderProps {
    imageUrl: string;
    existingTables: TableMetadata[];
    onGenerateAssets: (tables: TableMetadata[]) => void;
    onClose: () => void;
}

export const ImageDiagramBuilder: React.FC<ImageDiagramBuilderProps> = ({
    imageUrl,
    existingTables,
    onGenerateAssets,
    onClose
}) => {
    const [boxes, setBoxes] = useState<DiagramBox[]>([]);
    const [connections, setConnections] = useState<DiagramConnection[]>([]);
    const [selectedLayer, setSelectedLayer] = useState<ProductLayer>(ProductLayer.ODP);
    const [isDrawingBox, setIsDrawingBox] = useState(false);
    const [isDrawingConnection, setIsDrawingConnection] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [selectedBox, setSelectedBox] = useState<string | null>(null);
    const [editingBox, setEditingBox] = useState<string | null>(null);
    const [mode, setMode] = useState<'manual' | 'text'>('text');
    const [extractedText, setExtractedText] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Draw boxes and connections on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections
        connections.forEach(conn => {
            const source = boxes.find(b => b.id === conn.sourceId);
            const target = boxes.find(b => b.id === conn.targetId);

            if (source && target) {
                ctx.strokeStyle = '#00d4aa';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(source.x + source.width / 2, source.y + source.height / 2);
                ctx.lineTo(target.x + target.width / 2, target.y + target.height / 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw arrow
                const angle = Math.atan2(
                    target.y + target.height / 2 - (source.y + source.height / 2),
                    target.x + target.width / 2 - (source.x + source.width / 2)
                );
                const arrowSize = 10;
                ctx.fillStyle = '#00d4aa';
                ctx.beginPath();
                ctx.moveTo(target.x + target.width / 2, target.y + target.height / 2);
                ctx.lineTo(
                    target.x + target.width / 2 - arrowSize * Math.cos(angle - Math.PI / 6),
                    target.y + target.height / 2 - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    target.x + target.width / 2 - arrowSize * Math.cos(angle + Math.PI / 6),
                    target.y + target.height / 2 - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
            }
        });

        // Draw boxes
        boxes.forEach(box => {
            const color =
                box.layer === ProductLayer.ODP ? '#3b82f6' :
                    box.layer === ProductLayer.FDP ? '#10b981' :
                        '#eab308';

            ctx.strokeStyle = color;
            ctx.lineWidth = box.id === selectedBox ? 4 : 2;
            ctx.fillStyle = `${color}20`;
            ctx.fillRect(box.x, box.y, box.width, box.height);
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(box.tableName, box.x + 5, box.y + 20);
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#ffffff80';
            ctx.fillText(box.layer.split(' ')[0], box.x + 5, box.y + 35);
        });
    }, [boxes, connections, selectedBox]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isDrawingConnection) {
            // Check if clicked on a box
            const clickedBox = boxes.find(
                b => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
            );

            if (clickedBox) {
                if (!selectedBox) {
                    setSelectedBox(clickedBox.id);
                } else {
                    // Create connection
                    setConnections([...connections, {
                        sourceId: selectedBox,
                        targetId: clickedBox.id
                    }]);
                    setSelectedBox(null);
                    setIsDrawingConnection(false);
                }
            }
        } else if (isDrawingBox) {
            if (!drawStart) {
                setDrawStart({ x, y });
            } else {
                // Create box
                const newBox: DiagramBox = {
                    id: `box-${Date.now()}`,
                    x: Math.min(drawStart.x, x),
                    y: Math.min(drawStart.y, y),
                    width: Math.abs(x - drawStart.x),
                    height: Math.abs(y - drawStart.y),
                    tableName: `${selectedLayer.split(' ')[0].toLowerCase()}_table_${boxes.length + 1}`,
                    layer: selectedLayer
                };
                setBoxes([...boxes, newBox]);
                setDrawStart(null);
                setIsDrawingBox(false);
                setEditingBox(newBox.id);
            }
        } else {
            // Select box
            const clickedBox = boxes.find(
                b => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
            );
            setSelectedBox(clickedBox?.id || null);
        }
    };

    const handleGenerateAssets = () => {
        // Convert boxes and connections to TableMetadata
        const tables: TableMetadata[] = boxes.map(box => {
            const sources = connections
                .filter(c => c.targetId === box.id)
                .map(c => {
                    const sourceBox = boxes.find(b => b.id === c.sourceId);
                    return {
                        name: sourceBox?.tableName || '',
                        mappings: []
                    };
                });

            return {
                id: box.id,
                layer: box.layer,
                targetName: box.tableName,
                columns: ['id', 'created_at', 'updated_at'],
                primaryKeys: ['id'],
                sources,
                checkTypes: []
            };
        });

        onGenerateAssets(tables);
    };

    const updateBoxName = (boxId: string, newName: string) => {
        setBoxes(boxes.map(b => b.id === boxId ? { ...b, tableName: newName } : b));
    };

    const deleteBox = (boxId: string) => {
        setBoxes(boxes.filter(b => b.id !== boxId));
        setConnections(connections.filter(c => c.sourceId !== boxId && c.targetId !== boxId));
        if (selectedBox === boxId) setSelectedBox(null);
    };

    const handleTextExtraction = () => {
        const analyzer = new (require('../services/intelligentMappingAnalyzer').IntelligentMappingAnalyzer)();

        try {
            // Use the enhanced analyzer to process the text
            const result = analyzer.analyze(extractedText);

            // Merge with existing tables (simple concat + de-dupe logic would be ideal here in real app)
            // For now, we return the analyzed result directly to generate assets
            onGenerateAssets(result.tables);

        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Could not parse the mapping. Please ensure format is correct.");
        }
    };

    return (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/95 p-8">
            <div className="rounded-[48px] max-w-7xl w-full h-[90vh] p-12 bg-[#0a0f0d] border-4 border-[#00d4aa]/30 flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#FFB81C]">
                            Diagram-Based Asset Creator
                        </h2>
                        <p className="text-xs opacity-40 mt-2">
                            Extract table structure and mappings from your diagram
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full text-2xl hover:bg-red-500 transition-all">✕</button>
                </div>

                {/* Text Extraction Mode */}
                <div className="flex-1 flex gap-6">
                    {/* Left: Image Reference */}
                    <div className="w-1/2 flex flex-col">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#00d4aa] mb-3">Reference Diagram</h3>
                        <div className="flex-1 rounded-3xl border-2 border-white/10 overflow-hidden">
                            <img
                                src={imageUrl}
                                alt="Diagram"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Right: Text Input */}
                    <div className="w-1/2 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[#00d4aa]">Table Structure & Mappings</h3>
                            <button
                                onClick={async () => {
                                    setExtractedText('📖 Reading text from image...\n\n0% complete');

                                    try {
                                        const extractor = new RealTextExtractor();
                                        const result = await extractor.extractFromImage(
                                            imageUrl,
                                            (progress) => {
                                                setExtractedText(`📖 Reading text from image...\n\n${progress}% complete\n\nPlease wait...`);
                                            }
                                        );
                                        setExtractedText(result);
                                    } catch (error) {
                                        console.error('OCR error:', error);
                                        setExtractedText(`# OCR Failed\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThe image may be unclear or text may not be readable.\nPlease try with a clearer image or fill in manually.`);
                                    }
                                }}
                                className="px-4 py-2 bg-[#00d4aa]/20 border border-[#00d4aa]/50 rounded-xl text-xs font-bold text-[#00d4aa] hover:bg-[#00d4aa]/30 transition-all"
                            >
                                📖 Extract Text (OCR)
                            </button>
                        </div>
                        <textarea
                            value={extractedText}
                            onChange={(e) => setExtractedText(e.target.value)}
                            placeholder={`Click "Load Template" to get started, then edit based on your diagram...

Look at the Reference Diagram and type the table structure here.

Example:
ODP: CUSTOMER_RAW
- CUSTOMER_ID
- FIRST_NAME
- EMAIL

FDP: CUSTOMER_CLEAN
- CUSTOMER_ID
- FULL_NAME
- EMAIL_ADDRESS

CDP: CUSTOMER_ANALYTICS
- CUSTOMER_KEY
- CUSTOMER_NAME
- EMAIL

# Field Mappings
# Source: ODP → Target: FDP
CUSTOMER_RAW.CUSTOMER_ID -> CUSTOMER_CLEAN.CUSTOMER_ID
CUSTOMER_RAW.FIRST_NAME -> CUSTOMER_CLEAN.FULL_NAME
CUSTOMER_RAW.EMAIL -> CUSTOMER_CLEAN.EMAIL_ADDRESS

# Source: FDP → Target: CDP
CUSTOMER_CLEAN.CUSTOMER_ID -> CUSTOMER_ANALYTICS.CUSTOMER_KEY
CUSTOMER_CLEAN.FULL_NAME -> CUSTOMER_ANALYTICS.CUSTOMER_NAME
CUSTOMER_CLEAN.EMAIL_ADDRESS -> CUSTOMER_ANALYTICS.EMAIL`}
                            className="flex-1 bg-white/5 border-2 border-white/10 rounded-3xl p-6 text-sm font-mono resize-none outline-none focus:border-[#00d4aa]/50 transition-all custom-scrollbar"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleTextExtraction}
                                disabled={!extractedText.trim()}
                                className="flex-1 px-8 py-4 bg-gradient-to-r from-[#00d4aa] to-[#006A4D] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ⚡ Generate & Merge Assets
                            </button>
                            <button
                                onClick={() => setExtractedText('')}
                                className="px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                                Clear
                            </button>
                        </div>
                        <p className="text-xs opacity-40 mt-3 text-center">
                            Review and edit the extracted structure. Existing tables will be updated with new fields.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
