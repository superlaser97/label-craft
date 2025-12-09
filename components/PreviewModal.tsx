import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { LabelTemplate, CsvData } from '../types';
import { generateLabelImage } from '../services/fabricHelper';
import { X, Grid3X3, Database, Printer, AlertTriangle, Settings2, ArrowRightLeft, ArrowUpDown, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateData: LabelTemplate;
  previewImage: string; 
  csvData: CsvData | null;
  tilingSettings: { rows: number; cols: number };
  onTilingChange: (rows: number, cols: number) => void;
}

type PaperSize = 'letter' | 'a4';
type Orientation = 'portrait' | 'landscape';

const PAGE_DIMENSIONS: Record<PaperSize, { w: number, h: number }> = {
  letter: { w: 215.9, h: 279.4 }, // mm
  a4: { w: 210, h: 297 } // mm
};

// Helper to convert arbitrary unit to mm for PDF generation
const getMm = (val: number, unit: string) => {
    if (unit === 'inch') return val * 25.4;
    if (unit === 'cm') return val * 10;
    if (unit === 'mm') return val;
    return val; // Fallback
};

const PreviewModal: React.FC<PreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  templateData, 
  previewImage,
  csvData,
  tilingSettings,
  onTilingChange
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
  
  // Paper Settings
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  const [paperOrientation, setPaperOrientation] = useState<Orientation>('portrait');
  
  // Layout Settings
  const [gapX, setGapX] = useState<number>(0.125); // inches
  const [gapY, setGapY] = useState<number>(0.125); // inches
  const [autoScale, setAutoScale] = useState<boolean>(true);

  // View Settings (Pan/Zoom)
  const [viewZoom, setViewZoom] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  // Reset view when tab opens
  useEffect(() => {
    if (isOpen) {
      setViewZoom(1);
      setViewPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalLabels = tilingSettings.rows * tilingSettings.cols;

  // --- Calculations ---
  const effectivePageW = paperOrientation === 'portrait' ? PAGE_DIMENSIONS[paperSize].w : PAGE_DIMENSIONS[paperSize].h;
  const effectivePageH = paperOrientation === 'portrait' ? PAGE_DIMENSIONS[paperSize].h : PAGE_DIMENSIONS[paperSize].w;

  // Normalize all dimensions to mm
  const labelW_mm = getMm(templateData.dimensions.width, templateData.dimensions.unit);
  const labelH_mm = getMm(templateData.dimensions.height, templateData.dimensions.unit);
  
  // Gaps are currently always inches in the UI, so convert inches to mm
  const gapX_mm = gapX * 25.4;
  const gapY_mm = gapY * 25.4;

  const rawGridW = (labelW_mm * tilingSettings.cols) + (gapX_mm * Math.max(0, tilingSettings.cols - 1));
  const rawGridH = (labelH_mm * tilingSettings.rows) + (gapY_mm * Math.max(0, tilingSettings.rows - 1));

  let scaleFactor = 1;
  const fitsNaturally = rawGridW <= effectivePageW && rawGridH <= effectivePageH;
  
  if (autoScale && !fitsNaturally) {
     const scaleX = effectivePageW / rawGridW;
     const scaleY = effectivePageH / rawGridH;
     scaleFactor = Math.min(scaleX, scaleY) * 0.98;
  }

  const finalLabelW = labelW_mm * scaleFactor;
  const finalLabelH = labelH_mm * scaleFactor;
  const finalGapX = gapX_mm * scaleFactor;
  const finalGapY = gapY_mm * scaleFactor;
  
  const finalGridW = (finalLabelW * tilingSettings.cols) + (finalGapX * Math.max(0, tilingSettings.cols - 1));
  const finalGridH = (finalLabelH * tilingSettings.rows) + (finalGapY * Math.max(0, tilingSettings.rows - 1));

  // The base height of the preview paper in pixels (when zoom is 100%)
  const BASE_PREVIEW_HEIGHT_PX = 600;
  const pxPerMm = BASE_PREVIEW_HEIGHT_PX / effectivePageH;

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    startPanRef.current = { x: e.clientX - viewPan.x, y: e.clientY - viewPan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setViewPan({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
       const delta = e.deltaY > 0 ? 0.9 : 1.1;
       setViewZoom(z => Math.max(0.2, Math.min(z * delta, 5)));
    }
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setTimeout(async () => {
      try {
        const doc = new jsPDF({
          orientation: paperOrientation,
          unit: 'mm',
          format: paperSize
        });

        const rows = tilingSettings.rows;
        const cols = tilingSettings.cols;
        const labelsPerPage = rows * cols;
        const startX = Math.max(0, (effectivePageW - finalGridW) / 2);
        const startY = Math.max(0, (effectivePageH - finalGridH) / 2);
        const dataRows = csvData && csvData.rows.length > 0 ? csvData.rows : [null]; 
        
        for (let i = 0; i < dataRows.length; i++) {
          const rowIndex = i;
          const dataRow = dataRows[rowIndex];

          if (i > 0 && i % labelsPerPage === 0) {
            doc.addPage();
          }

          const posOnPage = i % labelsPerPage;
          const c = posOnPage % cols;
          const r = Math.floor(posOnPage / cols);

          const x = startX + (c * (finalLabelW + finalGapX));
          const y = startY + (r * (finalLabelH + finalGapY));

          const imgData = await generateLabelImage(templateData, dataRow);
          doc.addImage(imgData, 'PNG', x, y, finalLabelW, finalLabelH);
          
          if (scaleFactor < 0.5) doc.setLineWidth(0.05); 
          doc.setDrawColor(240, 240, 240);
          doc.rect(x, y, finalLabelW, finalLabelH);
        }
        doc.save(`${templateData.templateName}.pdf`);
      } catch (e) {
        console.error(e);
        alert('Error generating PDF');
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Printer size={20} className="text-blue-600" />
            Print & Export PDF
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-4 md:px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'preview' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Grid3X3 size={16} />
            <span className="hidden md:inline">Page Layout</span>
            <span className="md:hidden">Layout</span>
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`px-4 md:px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Database size={16} />
            <span className="hidden md:inline">Data Validation</span>
            <span className="md:hidden">Data</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 flex relative flex-col md:flex-row">
          {activeTab === 'preview' && (
            <>
              {/* Left Settings Panel - Scrollable independently */}
              <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-6 space-y-6 flex-shrink-0 z-10 shadow-lg h-1/3 md:h-full">
                
                {/* Paper Settings */}
                <div>
                   <h4 className="font-semibold text-sm mb-4 text-slate-700 border-b pb-2 flex items-center gap-2">
                      <Settings2 size={16} /> Paper Settings
                   </h4>
                   <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                         <label className="block text-xs font-medium text-slate-500 mb-1">Format</label>
                         <select 
                            value={paperSize} 
                            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                         >
                            <option value="letter">Letter (US)</option>
                            <option value="a4">A4 (Intl)</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-slate-500 mb-1">Orientation</label>
                         <select 
                            value={paperOrientation} 
                            onChange={(e) => setPaperOrientation(e.target.value as Orientation)}
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                         >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                         </select>
                      </div>
                   </div>
                </div>

                {/* Grid Settings */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Rows</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="20"
                        value={tilingSettings.rows}
                        onChange={(e) => onTilingChange(parseInt(e.target.value) || 1, tilingSettings.cols)}
                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                     </div>
                     <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Columns</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="10"
                        value={tilingSettings.cols}
                        onChange={(e) => onTilingChange(tilingSettings.rows, parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                     </div>
                </div>
                
                {/* Auto Scale */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                      <Maximize2 size={14} />
                      Auto-fit to Page
                    </label>
                    <div 
                      onClick={() => setAutoScale(!autoScale)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${autoScale ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${autoScale ? 'left-6' : 'left-1'}`}></div>
                    </div>
                </div>
                
                {/* Validation Status (Simplified for mobile) */}
                 <div className={`mt-4 p-3 rounded text-xs border ${fitsNaturally ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (autoScale ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700')}`}>
                   {(!fitsNaturally && !autoScale) ? (
                      <div className="flex items-center gap-2 font-bold"><AlertTriangle size={14}/> Will be cropped!</div>
                   ) : (
                      <div className="font-bold">Fits on page {autoScale && !fitsNaturally && '(Scaled)'}</div>
                   )}
                </div>

              </div>

              {/* Viewport Area */}
              <div className="flex-1 relative overflow-hidden bg-slate-200/50 cursor-grab active:cursor-grabbing h-2/3 md:h-full"
                   onMouseDown={handleMouseDown}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   onMouseLeave={handleMouseUp}
                   onWheel={handleWheel}
              >
                 {/* Zoom Controls */}
                 <div className="absolute top-4 right-4 z-20 flex flex-col bg-white rounded-lg shadow-md border border-slate-200">
                    <button onClick={() => setViewZoom(z => Math.min(z + 0.1, 5))} className="p-2 hover:bg-slate-50 text-slate-600 border-b border-slate-100"><ZoomIn size={18} /></button>
                    <button onClick={() => { setViewZoom(1); setViewPan({x:0,y:0}) }} className="p-2 hover:bg-slate-50 text-slate-600 border-b border-slate-100"><Maximize2 size={16} /></button>
                    <button onClick={() => setViewZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 hover:bg-slate-50 text-slate-600"><ZoomOut size={18} /></button>
                 </div>

                 {/* Pan Container */}
                 <div 
                    className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-linear"
                    style={{
                       transform: `translate(${viewPan.x}px, ${viewPan.y}px)`
                    }}
                 >
                    {/* Scalable Content */}
                    <div 
                        ref={previewContainerRef}
                        className="bg-white shadow-2xl relative transition-all duration-300" 
                        style={{ 
                          height: `${BASE_PREVIEW_HEIGHT_PX}px`, 
                          width: `${BASE_PREVIEW_HEIGHT_PX * (effectivePageW / effectivePageH)}px`,
                          transform: `scale(${viewZoom})`,
                          transformOrigin: 'center center'
                        }}
                    >
                        <div className="absolute -top-8 left-0 text-xs text-slate-400 font-mono whitespace-nowrap bg-slate-200/50 px-2 py-1 rounded">
                          {paperSize.toUpperCase()} ({paperOrientation})
                        </div>
                        
                        {/* Grid Container */}
                        <div 
                          className="w-full h-full relative"
                          style={{
                            display: 'grid',
                            placeContent: 'center',
                            gridTemplateColumns: `repeat(${tilingSettings.cols}, auto)`,
                            gridTemplateRows: `repeat(${tilingSettings.rows}, auto)`,
                            gap: `${finalGapY * pxPerMm}px ${finalGapX * pxPerMm}px`, 
                          }}
                        >
                          {Array.from({ length: totalLabels }).map((_, i) => (
                            <div 
                              key={i} 
                              className="relative group border border-slate-100 hover:border-blue-400 overflow-hidden bg-white"
                              style={{
                                width: `${finalLabelW * pxPerMm}px`,
                                height: `${finalLabelH * pxPerMm}px`,
                              }}
                            >
                              <img 
                                src={previewImage} 
                                alt={`Label`}
                                className="w-full h-full object-contain opacity-80"
                              />
                            </div>
                          ))}
                        </div>
                    </div>
                 </div>
              </div>
            </>
          )}

          {activeTab === 'data' && (
            <div className="bg-white rounded-lg w-full h-full flex flex-col p-6">
               {csvData ? (
                 <div className="overflow-auto flex-1 border border-slate-200 rounded-lg">
                   <table className="w-full text-sm text-left text-slate-500">
                     <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200 sticky top-0">
                       <tr>
                         <th className="px-6 py-3 w-10">#</th>
                         {csvData.headers.map((header) => (
                           <th key={header} className="px-6 py-3">{header}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                       {csvData.rows.slice(0, 100).map((row, idx) => (
                         <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                           <td className="px-6 py-4 font-mono text-xs text-slate-400">{idx + 1}</td>
                           {csvData.headers.map((header) => (
                             <td key={header} className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                               {row[header]}
                             </td>
                           ))}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                   <Database size={48} className="mb-4 opacity-20" />
                   <p className="text-lg font-medium text-slate-600">No Data Loaded</p>
                   <p className="text-sm mt-1">Import a CSV file to preview data here.</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between md:justify-end gap-3 items-center z-20">
          
          {csvData && (
             <span className="text-xs text-slate-500 mr-auto hidden md:inline">
                Will generate <strong>{Math.ceil(csvData.rows.length / totalLabels)}</strong> pages.
             </span>
          )}

          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium text-sm transition-colors">
            Close
          </button>
          
          <button 
             onClick={handleDownloadPdf}
             disabled={isGenerating || (!fitsNaturally && !autoScale)}
             className={`px-6 py-2 text-white rounded-md font-medium text-sm shadow-sm transition-colors flex items-center gap-2 ${isGenerating || (!fitsNaturally && !autoScale) ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isGenerating ? 'Generating...' : (
               <>
                  <Printer size={16} />
                  Download PDF
               </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PreviewModal;