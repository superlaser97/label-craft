import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import PreviewModal from './components/PreviewModal';
import DataEditorModal from './components/DataEditorModal';
import ConfirmationModal from './components/ConfirmationModal';
import CalibrationModal from './components/CalibrationModal';
import TemplateManagerModal from './components/TemplateManagerModal';
import { 
  createFabricCanvas, 
  resizeCanvas,
  addStaticText, 
  addVariableText, 
  addBarcode,
  addQrCode,
  addRectangle,
  addCircle,
  addTriangle,
  addLine,
  serializeCanvas 
} from './services/fabricHelper';
import { DEFAULT_LABEL_SIZE, AVAILABLE_FIELDS as DEFAULT_FIELDS, DPI as BASE_DPI } from './constants';
import { LabelTemplate, DataField, CsvData } from './types';
import { ZoomIn, ZoomOut, RefreshCcw, LayoutTemplate, Undo, Redo, Printer, FileJson, FolderOpen, Menu, Settings, Ruler, ScanLine, Library } from 'lucide-react';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  
  // App State
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [templateName, setTemplateName] = useState('New Label Template');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDataEditorOpen, setIsDataEditorOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [screenPpi, setScreenPpi] = useState<number>(() => {
    const saved = localStorage.getItem('labelCraft_ppi');
    return saved ? parseFloat(saved) : 96;
  });

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
  const [unit, setUnit] = useState<'inch' | 'cm'>('cm');
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
    const includeProps = ['dataKey', 'isBarcode', 'isQrCode', 'id', 'lockScalingX', 'lockScalingY', 'strokeWidth', 'stroke', 'strokeUniform', 'selectable', 'evented'];
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

  // --- Actions ---

  const handleDeleteActive = useCallback(() => {
    if (fabricRef.current) {
      const activeObjects = fabricRef.current.getActiveObjects();
      
      if (activeObjects.length > 0) {
        // Check if any active object is text editing
        const activeGroup = fabricRef.current.getActiveObject();
        if (activeGroup && (activeGroup.type === 'i-text' || activeGroup.type === 'textbox') && (activeGroup as any).isEditing) {
           return;
        }

        // Prevent multiple history entries during iteration
        isHistoryLocked.current = true;

        fabricRef.current.discardActiveObject();
        activeObjects.forEach((obj) => {
            fabricRef.current?.remove(obj);
        });
        
        fabricRef.current.requestRenderAll();
        
        // Manual history save after batch operation
        isHistoryLocked.current = false;
        updateLayers();
        saveHistory();

        setActiveObject(null);
      }
    }
  }, [saveHistory, updateLayers]);

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

        // Select All (Ctrl + A)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (fabricRef.current) {
                const objects = fabricRef.current.getObjects();
                if (objects.length > 0) {
                    const activeSelection = new fabric.ActiveSelection(objects, {
                        canvas: fabricRef.current,
                    });
                    fabricRef.current.setActiveObject(activeSelection);
                    fabricRef.current.requestRenderAll();
                    setActiveObject(activeSelection);
                }
            }
            return;
        }

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

  // Workspace Scroll Zoom
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        // Allow propagation if needed, but here we just consume it for zoom
        // Note: Canvas handles its own event and stops propagation, so this only handles outside canvas
        
        setZoomLevel(prevZoom => {
          const delta = e.deltaY;
          const change = delta > 0 ? -0.1 : 0.1;
          let newZoom = prevZoom + change;
          newZoom = Math.round(newZoom * 10) / 10;
          return Math.max(0.1, Math.min(newZoom, 5));
        });
      }
    };

    workspace.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      workspace.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      // Initially create with default size, resize logic handles the rest
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
      
      canvas.on('object:modified', () => { 
        updateLayers(); 
        saveHistory(); 
      });

      // Zoom with Ctrl + Scroll (Canvas Only)
      canvas.on('mouse:wheel', (opt) => {
        if (opt.e.ctrlKey) {
          opt.e.preventDefault();
          opt.e.stopPropagation();
          
          setZoomLevel(prevZoom => {
            const delta = opt.e.deltaY;
            const change = delta > 0 ? -0.1 : 0.1;
            let newZoom = prevZoom + change;
            newZoom = Math.round(newZoom * 10) / 10;
            return Math.max(0.1, Math.min(newZoom, 5));
          });
        }
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
      // Logic: resizeCanvas expects INCHES.
      // If our state is in CM, convert to inches for the canvas engine.
      const wInches = unit === 'cm' ? labelWidth / 2.54 : labelWidth;
      const hInches = unit === 'cm' ? labelHeight / 2.54 : labelHeight;
      
      resizeCanvas(fabricRef.current, wInches, hInches, zoomLevel);
    }
  }, [labelWidth, labelHeight, zoomLevel, unit]);

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

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as 'inch' | 'cm';
    if (newUnit === unit) return;

    // Conversion factor
    // Inch -> CM: * 2.54
    // CM -> Inch: / 2.54
    if (newUnit === 'cm') {
       setLabelWidth(prev => parseFloat((prev * 2.54).toFixed(2)));
       setLabelHeight(prev => parseFloat((prev * 2.54).toFixed(2)));
    } else {
       setLabelWidth(prev => parseFloat((prev / 2.54).toFixed(2)));
       setLabelHeight(prev => parseFloat((prev / 2.54).toFixed(2)));
    }
    setUnit(newUnit);
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

  const handleAddShape = useCallback((type: 'rect' | 'circle' | 'triangle' | 'line') => {
    if (fabricRef.current) {
      if (type === 'rect') addRectangle(fabricRef.current);
      if (type === 'circle') addCircle(fabricRef.current);
      if (type === 'triangle') addTriangle(fabricRef.current);
      if (type === 'line') addLine(fabricRef.current);
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
        unit: unit // Save current unit preference
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

  // Shared Logic for Loading Templates (File or Browser)
  const loadTemplateIntoCanvas = async (data: LabelTemplate) => {
    if (!fabricRef.current) return;

    try {
        // Basic Validation
        if (!data.objects || !data.dimensions) {
          alert("Invalid template format.");
          return;
        }

        // 1. Update Metadata
        setTemplateName(data.templateName);
        
        const loadedUnit = data.dimensions.unit || 'inch';
        
        if (loadedUnit === 'cm') {
            setUnit('cm');
            setLabelWidth(data.dimensions.width);
            setLabelHeight(data.dimensions.height);
        } else {
            setUnit('inch');
            setLabelWidth(data.dimensions.width);
            setLabelHeight(data.dimensions.height);
        }

        setOrientation(data.dimensions.width > data.dimensions.height ? 'landscape' : 'portrait');

        // 2. Clear current
        fabricRef.current.clear();
        fabricRef.current.backgroundColor = '#ffffff';

        // 3. Load Objects into Canvas
        await fabricRef.current.loadFromJSON({ objects: data.objects });

        // 4. Update UI State
        fabricRef.current.requestRenderAll();
        updateLayers();
        
        // Reset history
        historyRef.current = [];
        historyIndexRef.current = -1;
        saveHistory();
        
        // alert("Template loaded successfully!"); 
    } catch (err) {
        console.error(err);
        alert("Failed to load template.");
    }
  };

  const handleLoadJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const data = JSON.parse(jsonStr) as LabelTemplate;
        await loadTemplateIntoCanvas(data);
        alert("Template loaded from file successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to read file.");
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
        // Logic: resizeCanvas expects INCHES
        const wInches = unit === 'cm' ? labelWidth / 2.54 : labelWidth;
        const hInches = unit === 'cm' ? labelHeight / 2.54 : labelHeight;
        resizeCanvas(canvas, wInches, hInches, zoomLevel);
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
    // Finer Step: 0.1 (10%) instead of 0.25 (25%)
    let newZoom = zoomLevel + (direction === 'in' ? 0.1 : -0.1);
    
    // Floating point math fix (e.g. 1.10000000002)
    newZoom = Math.round(newZoom * 10) / 10;
    
    // Expanded range: 10% to 500%
    newZoom = Math.max(0.1, Math.min(newZoom, 5)); 
    
    setZoomLevel(newZoom);
  };

  const handleSavePpi = (newPpi: number) => {
    setScreenPpi(newPpi);
    localStorage.setItem('labelCraft_ppi', newPpi.toString());
  };

  const handleSetOneToOne = () => {
    const realWorldScale = screenPpi / BASE_DPI;
    setZoomLevel(realWorldScale);
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {(isMobileMenuOpen || isMobilePropsOpen) && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm" 
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
          onAddShape={handleAddShape}
          onImportCsv={handleImportCsv}
          onOpenDataEditor={() => setIsDataEditorOpen(true)}
          availableFields={availableFields}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Header */}
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 md:px-6 shadow-md z-10">
          
          <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
             {/* Mobile Menu Toggle */}
             <button 
               className="lg:hidden p-2 text-zinc-400 hover:bg-zinc-800 rounded-md"
               onClick={() => setIsMobileMenuOpen(true)}
             >
                <Menu size={20} />
             </button>

             <input 
               type="text" 
               value={templateName} 
               onChange={(e) => setTemplateName(e.target.value)}
               className="text-base md:text-lg font-semibold bg-transparent hover:bg-zinc-800 border border-transparent hover:border-zinc-700 rounded px-2 py-1 outline-none transition-all w-32 md:w-64 truncate text-zinc-100 placeholder-zinc-600"
               placeholder="Template Name"
             />
             
             {/* Document Config Controls */}
             <div className="hidden md:flex items-center gap-3 bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800 shadow-inner">
               <div className="flex items-center gap-1">
                 <span className="text-xs font-semibold text-zinc-500 uppercase">W:</span>
                 <input 
                    type="number" 
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(Number(e.target.value))}
                    step={unit === 'inch' ? 0.1 : 0.1}
                    className="w-20 text-sm bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-center outline-none focus:border-blue-500 text-zinc-200"
                 />
               </div>
               <span className="text-zinc-600">x</span>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-semibold text-zinc-500 uppercase">H:</span>
                 <input 
                    type="number" 
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(Number(e.target.value))}
                    step={unit === 'inch' ? 0.1 : 0.1}
                    className="w-20 text-sm bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-center outline-none focus:border-blue-500 text-zinc-200"
                 />
               </div>
               
               {/* Unit Selector */}
               <select 
                  value={unit} 
                  onChange={handleUnitChange}
                  className="bg-transparent text-xs font-semibold text-zinc-500 uppercase border-none outline-none cursor-pointer hover:text-blue-400"
               >
                  <option value="inch">IN</option>
                  <option value="cm">CM</option>
               </select>

               <div className="w-px h-4 bg-zinc-700 mx-2"></div>

               <button 
                 onClick={handleOrientationToggle}
                 className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-blue-400 hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
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
                 <input type="file" accept=".json" ref={templateInputRef} className="hidden" onChange={handleLoadJsonFile} />
                 
                 {/* Desktop Buttons */}
                 <div className="hidden xl:flex gap-2">
                     <button onClick={() => setIsTemplateManagerOpen(true)} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"><Library size={16} /> Library</button>
                     <div className="w-px h-8 bg-zinc-800 mx-1"></div>
                     <button onClick={() => templateInputRef.current?.click()} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"><FolderOpen size={16} /> Load JSON</button>
                     <button onClick={handleSaveJson} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"><FileJson size={16} /> Save JSON</button>
                     <button onClick={handleOpenExportModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-md transition-all border border-blue-500"><Printer size={16} /> Export</button>
                 </div>

                 {/* Mobile/Tablet Condensed Buttons */}
                 <div className="flex xl:hidden gap-1">
                    <button onClick={() => setIsTemplateManagerOpen(true)} className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg shadow-sm"><Library size={20} /></button>
                    <button onClick={handleOpenExportModal} className="p-2 bg-blue-600 text-white rounded-lg shadow border border-blue-500"><Printer size={20} /></button>
                    <button 
                       className="lg:hidden p-2 text-zinc-400 hover:bg-zinc-800 rounded-md relative"
                       onClick={() => setIsMobilePropsOpen(true)}
                    >
                       <Settings size={20} />
                       {activeObject && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-zinc-900"></span>}
                    </button>
                 </div>
             </div>
          </div>
        </header>

        {/* Canvas Area */}
        <main 
            ref={workspaceRef}
            className="flex-1 overflow-auto bg-zinc-950 flex items-center justify-center p-4 md:p-8 relative"
            style={{ backgroundImage: 'radial-gradient(circle, #27272a 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        >
          
          {/* Canvas Container */}
          {/* The canvas itself must visually remain white as it represents physical paper/labels */}
          <div className="relative shadow-2xl shadow-black bg-white transition-all duration-300 ring-1 ring-zinc-800">
            <div className="absolute -top-6 left-0 text-xs font-mono text-zinc-500 hidden md:block">
              {labelWidth}{unit === 'inch' ? '"' : 'cm'} x {labelHeight}{unit === 'inch' ? '"' : 'cm'} @ {Math.round(screenPpi)}PPI ({(zoomLevel * 100).toFixed(0)}%)
            </div>
            <canvas id="label-canvas" ref={canvasRef} />
          </div>

        </main>

        {/* FLOATING TOOLBAR - Moved outside main to be relative to workspace container */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-zinc-900 rounded-xl shadow-xl shadow-black/50 border border-zinc-700 p-1.5 flex items-center gap-1 z-30">
              <button 
                onClick={handleUndo} 
                disabled={!historyState.canUndo}
                className={`p-2 rounded-lg transition-colors ${historyState.canUndo ? 'hover:bg-zinc-800 text-zinc-300' : 'text-zinc-600 cursor-not-allowed'}`}
                title="Undo"
              >
                  <Undo size={18}/>
              </button>
              <button 
                onClick={handleRedo} 
                disabled={!historyState.canRedo}
                className={`p-2 rounded-lg transition-colors ${historyState.canRedo ? 'hover:bg-zinc-800 text-zinc-300' : 'text-zinc-600 cursor-not-allowed'}`}
                title="Redo"
              >
                  <Redo size={18}/>
              </button>
              
              <div className="w-px h-6 bg-zinc-700 mx-1"></div>
              
              <button onClick={() => handleZoom('out')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors" title="Zoom Out"><ZoomOut size={18}/></button>
              <span className="text-xs w-10 text-center font-mono font-medium text-zinc-400">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom('in')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors" title="Zoom In"><ZoomIn size={18}/></button>
              
              <div className="w-px h-6 bg-zinc-700 mx-1"></div>

              <button 
                onClick={handleSetOneToOne}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors"
                title="1:1 Real World View"
              >
                <ScanLine size={18} />
              </button>

              <button 
                onClick={() => setIsCalibrationOpen(true)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors"
                title="Calibrate Screen"
              >
                <Ruler size={18} />
              </button>

              <div className="w-px h-6 bg-zinc-700 mx-1"></div>

              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
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

      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        onSave={handleSavePpi}
        currentPpi={screenPpi}
      />

      <TemplateManagerModal 
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        onLoadTemplate={loadTemplateIntoCanvas}
        currentTemplateProvider={prepareTemplateData}
      />
    </div>
  );
};

export default App;