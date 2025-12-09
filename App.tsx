import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import PreviewModal from './components/PreviewModal';
import DataEditorModal from './components/DataEditorModal';
import ConfirmationModal from './components/ConfirmationModal';
import { 
  createFabricCanvas, 
  resizeCanvas,
  addStaticText, 
  addVariableText, 
  addBarcode,
  addQrCode,
  serializeCanvas 
} from './services/fabricHelper';
import { DEFAULT_LABEL_SIZE, AVAILABLE_FIELDS as DEFAULT_FIELDS } from './constants';
import { LabelTemplate, DataField, CsvData } from './types';
import { ZoomIn, ZoomOut, RefreshCcw, LayoutTemplate, Undo, Redo, Printer, FileJson, FolderOpen, Menu, Settings } from 'lucide-react';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  
  // App State
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [templateName, setTemplateName] = useState('New Label Template');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDataEditorOpen, setIsDataEditorOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [jsonOutput, setJsonOutput] = useState<LabelTemplate | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  // Mobile Drawer States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobilePropsOpen, setIsMobilePropsOpen] = useState(false);

  // Undo/Redo State
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isHistoryLocked = useRef(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  // Document Config State
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_SIZE.width);
  const [labelHeight, setLabelHeight] = useState(DEFAULT_LABEL_SIZE.height);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [tilingSettings, setTilingSettings] = useState({ rows: 2, cols: 2 });

  // Data State
  const [availableFields, setAvailableFields] = useState<DataField[]>(DEFAULT_FIELDS);
  const [csvData, setCsvData] = useState<CsvData | null>(null);

  // Helper to update layers list
  const updateLayers = useCallback(() => {
    if (fabricRef.current) {
      setLayers([...fabricRef.current.getObjects()]);
    }
  }, []);

  // --- Actions ---

  const handleDeleteActive = useCallback(() => {
    if (fabricRef.current) {
      const active = fabricRef.current.getActiveObject();
      if (active) {
        // If it's a text object currently being edited, do not delete
        if ((active.type === 'i-text' || active.type === 'textbox') && (active as any).isEditing) {
           return;
        }

        fabricRef.current.remove(active);
        fabricRef.current.discardActiveObject();
        fabricRef.current.requestRenderAll();
        setActiveObject(null);
      }
    }
  }, []);

  // --- Undo/Redo Logic ---

  const updateHistoryState = useCallback(() => {
    setHistoryState({
        canUndo: historyIndexRef.current > 0,
        canRedo: historyIndexRef.current < historyRef.current.length - 1
    });
  }, []);

  const saveHistory = useCallback(() => {
    if (!fabricRef.current || isHistoryLocked.current) return;
    
    // Properties to include in the snapshot
    const includeProps = ['dataKey', 'isBarcode', 'isQrCode', 'id', 'lockScalingX', 'lockScalingY', 'strokeWidth', 'selectable', 'evented'];
    const json = JSON.stringify(fabricRef.current.toObject(includeProps));

    // Dedup: Don't push if same as current top state to avoid spam
    if (historyIndexRef.current >= 0 && historyRef.current[historyIndexRef.current] === json) return;

    // Truncate redo history if we are in the middle of the stack
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(json);
    
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    updateHistoryState();
  }, [updateHistoryState]);

  const handleUndo = useCallback(async () => {
    if (historyIndexRef.current <= 0 || isHistoryLocked.current || !fabricRef.current) return;
    
    isHistoryLocked.current = true;
    historyIndexRef.current -= 1;
    const json = historyRef.current[historyIndexRef.current];
    
    try {
      await fabricRef.current.loadFromJSON(JSON.parse(json));
      fabricRef.current.requestRenderAll();
      updateLayers();
    } finally {
      isHistoryLocked.current = false;
      updateHistoryState();
    }
  }, [updateLayers, updateHistoryState]);

  const handleRedo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || isHistoryLocked.current || !fabricRef.current) return;
    
    isHistoryLocked.current = true;
    historyIndexRef.current += 1;
    const json = historyRef.current[historyIndexRef.current];
    
    try {
      await fabricRef.current.loadFromJSON(JSON.parse(json));
      fabricRef.current.requestRenderAll();
      updateLayers();
    } finally {
      isHistoryLocked.current = false;
      updateHistoryState();
    }
  }, [updateLayers, updateHistoryState]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement;
        const tagName = activeElement.tagName;

        // Check for active inputs to avoid triggering when typing
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return;

        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
             e.preventDefault();
             handleRedo();
        }

        // Delete Object
        if (e.key === 'Delete' || e.key === 'Backspace') {
            handleDeleteActive();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteActive]);


  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      const canvas = createFabricCanvas(
        'label-canvas', 
        labelWidth, 
        labelHeight
      );
      
      fabricRef.current = canvas;

      // Event Listeners
      const handleSelection = (e: any) => {
          const selected = e.selected ? e.selected[0] : null;
          setActiveObject(selected);
      };
      
      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', () => setActiveObject(null));
      
      // Update layers and History
      canvas.on('object:added', () => { updateLayers(); saveHistory(); });
      canvas.on('object:removed', () => { updateLayers(); saveHistory(); });
      
      // On modified, we must update the UI (coordinates) and save history.
      // IMPORTANT: Do NOT spread the active object into a new object state (e.g. {...activeObject})
      // because that creates a plain object and disconnects it from the Fabric prototype chain,
      // causing methods like .set() to fail and properties to be lost in the PropertiesPanel.
      // Instead, we call updateLayers() which triggers a re-render of App via setLayers,
      // ensuring PropertiesPanel gets the updated activeObject reference.
      canvas.on('object:modified', () => { 
        updateLayers(); 
        saveHistory(); 
      });

      // Save initial state
      saveHistory();

      // Cleanup
      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }
  }, [updateLayers, saveHistory]); 

  // Handle Dimensions or Zoom Change
  useEffect(() => {
    if (fabricRef.current) {
      // Resize canvas to physical pixels * zoom to ensure sharpness
      resizeCanvas(fabricRef.current, labelWidth, labelHeight, zoomLevel);
    }
  }, [labelWidth, labelHeight, zoomLevel]);

  // CSV Parsing
  const handleImportCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((acc, header, index) => {
          acc[header] = values[index]?.trim() || '';
          return acc;
        }, {} as Record<string, string>);
      });

      // Update State
      const newFields = headers.map(h => ({ label: h, value: h }));
      setAvailableFields(newFields);
      setCsvData({ headers, rows });
      
      alert(`Imported ${rows.length} rows with columns: ${headers.join(', ')}`);
    };
    reader.readAsText(file);
  };

  const handleUpdateData = (newData: CsvData) => {
      setCsvData(newData);
      const newFields = newData.headers.map(h => ({ label: h, value: h }));
      setAvailableFields(newFields);
  };

  const handleOrientationToggle = () => {
    const newOrientation = orientation === 'portrait' ? 'landscape' : 'portrait';
    setOrientation(newOrientation);
    // Swap width and height
    const w = labelWidth;
    const h = labelHeight;
    setLabelWidth(h);
    setLabelHeight(w);
  };

  // Canvas Handlers
  const handleAddText = useCallback(() => {
    if (fabricRef.current) addStaticText(fabricRef.current);
  }, []);

  const handleAddVariable = useCallback((key: string) => {
    if (fabricRef.current) addVariableText(fabricRef.current, key);
  }, []);

  const handleAddBarcode = useCallback((key: string) => {
    if (fabricRef.current) addBarcode(fabricRef.current, key);
  }, []);

  const handleAddQrCode = useCallback((key: string) => {
    if (fabricRef.current) addQrCode(fabricRef.current, key);
  }, []);

  const handleAddImage = useCallback((url: string) => {
    if (fabricRef.current) {
        fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
            img.set({
                left: 50,
                top: 50,
                scaleX: 0.5,
                scaleY: 0.5
            });
            fabricRef.current?.add(img);
            fabricRef.current?.setActiveObject(img);
            fabricRef.current?.requestRenderAll();
        });
    }
  }, []);
  
  const handleSelectLayer = useCallback((obj: fabric.Object) => {
    if (fabricRef.current) {
        fabricRef.current.setActiveObject(obj);
        fabricRef.current.requestRenderAll();
        setActiveObject(obj);
    }
  }, []);

  const prepareTemplateData = () => {
    if (!fabricRef.current) return null;
    fabricRef.current.discardActiveObject();
    fabricRef.current.requestRenderAll();
    const objects = serializeCanvas(fabricRef.current);
    
    return {
      templateName,
      dimensions: {
        width: labelWidth,
        height: labelHeight,
        unit: 'inch' as const
      },
      objects: objects
    };
  };

  const handleOpenExportModal = () => {
    if (!fabricRef.current) return;
    
    // Generate Preview Image
    const dataUrl = fabricRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
    });
    setPreviewImage(dataUrl);

    const template = prepareTemplateData();
    if (template) {
        setJsonOutput(template);
        setIsPreviewOpen(true);
    }
  };

  const handleSaveJson = () => {
     const template = prepareTemplateData();
     if (!template) return;

     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
     const downloadAnchorNode = document.createElement('a');
     downloadAnchorNode.setAttribute("href", dataStr);
     downloadAnchorNode.setAttribute("download", `${templateName.replace(/\s+/g, '_')}.json`);
     document.body.appendChild(downloadAnchorNode);
     downloadAnchorNode.click();
     downloadAnchorNode.remove();
  };

  const handleLoadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const data = JSON.parse(jsonStr) as LabelTemplate;

        // Basic Validation
        if (!data.objects || !data.dimensions) {
          alert("Invalid template file format.");
          return;
        }

        if (fabricRef.current) {
           // 1. Update Metadata
           setTemplateName(data.templateName);
           setLabelWidth(data.dimensions.width);
           setLabelHeight(data.dimensions.height);
           // Simple heuristic for orientation
           setOrientation(data.dimensions.width > data.dimensions.height ? 'landscape' : 'portrait');

           // 2. Clear current
           fabricRef.current.clear();
           fabricRef.current.backgroundColor = '#ffffff';

           // 3. Load Objects into Canvas
           await fabricRef.current.loadFromJSON({ objects: data.objects });

           // 4. Update UI State
           fabricRef.current.requestRenderAll();
           updateLayers();
           
           // Reset history to this new state
           historyRef.current = [];
           historyIndexRef.current = -1;
           saveHistory();
           
           alert("Template loaded successfully!");
        }

      } catch (err) {
        console.error(err);
        alert("Failed to load template. Ensure it is a valid LabelCraft JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // The actual logic that clears the canvas
  const handleExecuteReset = () => {
    if (!fabricRef.current) return;
    
    const canvas = fabricRef.current;
    
    // Temporarily lock history to avoid spamming the history stack with individual removals
    isHistoryLocked.current = true;
    
    try {
        // 1. Discard Active Object first
        canvas.discardActiveObject();
        setActiveObject(null);
        
        // 2. Iterate and remove every object individually
        const objects = [...canvas.getObjects()];
        objects.forEach((obj) => {
            canvas.remove(obj);
        });
        
        // 3. Restore Canvas Defaults
        canvas.backgroundColor = '#ffffff';
        resizeCanvas(canvas, labelWidth, labelHeight, zoomLevel);
        canvas.requestRenderAll();
        
        // 4. Update React State
        setLayers([]);
        
        // 5. Hard Reset History
        historyRef.current = [];
        historyIndexRef.current = -1;
        
        // Unlock history and save the fresh blank state
        isHistoryLocked.current = false;
        saveHistory();
        
    } catch (err) {
        console.error("Error clearing canvas:", err);
        // Ensure history is unlocked even if something fails
        isHistoryLocked.current = false; 
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    let newZoom = zoomLevel + (direction === 'in' ? 0.25 : -0.25);
    newZoom = Math.max(0.5, Math.min(newZoom, 3)); 
    setZoomLevel(newZoom);
    // Note: The resizing logic is handled by the useEffect dependent on zoomLevel
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {(isMobileMenuOpen || isMobilePropsOpen) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" 
          onClick={() => { setIsMobileMenuOpen(false); setIsMobilePropsOpen(false); }}
        />
      )}

      {/* Sidebar / Mobile Menu */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:static lg:transform-none lg:z-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Toolbar 
          onAddText={handleAddText}
          onAddVariable={handleAddVariable}
          onAddBarcode={handleAddBarcode}
          onAddQrCode={handleAddQrCode}
          onAddImage={handleAddImage}
          onImportCsv={handleImportCsv}
          onOpenDataEditor={() => setIsDataEditorOpen(true)}
          availableFields={availableFields}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 shadow-sm z-10">
          
          <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
             {/* Mobile Menu Toggle */}
             <button 
               className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"
               onClick={() => setIsMobileMenuOpen(true)}
             >
                <Menu size={20} />
             </button>

             <input 
               type="text" 
               value={templateName} 
               onChange={(e) => setTemplateName(e.target.value)}
               className="text-base md:text-lg font-semibold bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none transition-all w-32 md:w-64 truncate"
               placeholder="Template Name"
             />
             
             {/* Document Config Controls */}
             <div className="hidden md:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
               <div className="flex items-center gap-1">
                 <span className="text-xs font-semibold text-slate-400 uppercase">W:</span>
                 <input 
                    type="number" 
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(Number(e.target.value))}
                    className="w-12 text-sm bg-white border border-slate-300 rounded px-1 py-0.5 text-center outline-none focus:border-blue-500"
                 />
               </div>
               <span className="text-slate-300">x</span>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-semibold text-slate-400 uppercase">H:</span>
                 <input 
                    type="number" 
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(Number(e.target.value))}
                    className="w-12 text-sm bg-white border border-slate-300 rounded px-1 py-0.5 text-center outline-none focus:border-blue-500"
                 />
               </div>
               <span className="text-xs text-slate-400 font-mono ml-1">in</span>

               <div className="w-px h-4 bg-slate-300 mx-2"></div>

               <button 
                 onClick={handleOrientationToggle}
                 className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                 title="Toggle Orientation"
               >
                 <LayoutTemplate size={14} className={orientation === 'landscape' ? 'rotate-90' : ''} />
                 <span className="hidden lg:inline">{orientation === 'portrait' ? 'Portrait' : 'Landscape'}</span>
               </button>
             </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-3">
             
             {/* File Actions */}
             <div className="flex items-center gap-1">
                 <input type="file" accept=".json" ref={templateInputRef} className="hidden" onChange={handleLoadTemplate} />
                 
                 {/* Desktop Buttons */}
                 <div className="hidden xl:flex gap-2">
                     <button onClick={() => templateInputRef.current?.click()} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"><FolderOpen size={16} /> Load</button>
                     <button onClick={handleSaveJson} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"><FileJson size={16} /> Save</button>
                     <button onClick={handleOpenExportModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-md transition-all"><Printer size={16} /> Export</button>
                 </div>

                 {/* Mobile/Tablet Condensed Buttons */}
                 <div className="flex xl:hidden gap-1">
                    <button onClick={handleOpenExportModal} className="p-2 bg-blue-600 text-white rounded-lg shadow"><Printer size={20} /></button>
                    <button 
                       className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md relative"
                       onClick={() => setIsMobilePropsOpen(true)}
                    >
                       <Settings size={20} />
                       {activeObject && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>}
                    </button>
                 </div>
             </div>
          </div>
        </header>

        {/* Canvas Area */}
        <main className="flex-1 overflow-auto bg-slate-200/50 flex items-center justify-center p-4 md:p-8 relative">
          
          {/* Canvas Container */}
          <div className="relative shadow-2xl bg-white transition-all duration-300">
            <div className="absolute -top-6 left-0 text-xs font-mono text-slate-400 hidden md:block">
              {labelWidth}" x {labelHeight}" @ 96DPI ({(zoomLevel * 100).toFixed(0)}%)
            </div>
            <canvas id="label-canvas" ref={canvasRef} />
          </div>

        </main>

        {/* FLOATING TOOLBAR - Moved outside main to be relative to workspace container */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 flex items-center gap-1 z-30">
              <button 
                onClick={handleUndo} 
                disabled={!historyState.canUndo}
                className={`p-2 rounded-lg transition-colors ${historyState.canUndo ? 'hover:bg-slate-100 text-slate-700' : 'text-slate-300 cursor-not-allowed'}`}
                title="Undo"
              >
                  <Undo size={18}/>
              </button>
              <button 
                onClick={handleRedo} 
                disabled={!historyState.canRedo}
                className={`p-2 rounded-lg transition-colors ${historyState.canRedo ? 'hover:bg-slate-100 text-slate-700' : 'text-slate-300 cursor-not-allowed'}`}
                title="Redo"
              >
                  <Redo size={18}/>
              </button>
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>
              
              <button onClick={() => handleZoom('out')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Zoom Out"><ZoomOut size={18}/></button>
              <span className="text-xs w-10 text-center font-mono font-medium text-slate-600">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom('in')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Zoom In"><ZoomIn size={18}/></button>
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear Canvas"
              >
                <RefreshCcw size={18} />
              </button>
        </div>

      </div>

      {/* Right Sidebar / Mobile Properties Drawer */}
      <div 
         className={`fixed inset-y-0 right-0 z-50 w-72 transform transition-transform duration-300 lg:static lg:transform-none lg:z-auto ${isMobilePropsOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <PropertiesPanel 
            activeObject={activeObject} 
            layers={layers}
            onSelectLayer={handleSelectLayer}
            onDelete={handleDeleteActive}
            onUpdate={() => saveHistory()} 
            availableFields={availableFields}
            onClose={() => setIsMobilePropsOpen(false)}
        />
      </div>

      {/* Modals */}
      {jsonOutput && (
        <PreviewModal 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
          templateData={jsonOutput}
          previewImage={previewImage}
          csvData={csvData}
          tilingSettings={tilingSettings}
          onTilingChange={(rows, cols) => setTilingSettings({ rows, cols })}
        />
      )}

      <DataEditorModal
        isOpen={isDataEditorOpen}
        onClose={() => setIsDataEditorOpen(false)}
        data={csvData}
        onSave={handleUpdateData}
      />
      
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleExecuteReset}
        title="Clear Canvas"
        message="Are you sure you want to delete all objects? This action cannot be undone."
        confirmLabel="Clear All"
      />
    </div>
  );
};

export default App;