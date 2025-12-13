import React, { useEffect, useState, useRef } from 'react';
import * as fabric from 'fabric';
import { DataField } from '../types';
import { updateObjectDataKey, updateObjectColor, updateObjectStroke, updateObjectStrokeWidth } from '../services/fabricHelper';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Layers, Type, Image as ImageIcon, Box, Hash, QrCode, X, Palette, List, PenTool, Minus, Square, Circle, Triangle } from 'lucide-react';
import { AVAILABLE_FONTS } from '../constants';

interface PropertiesPanelProps {
  activeObject: fabric.Object | null;
  layers: fabric.Object[];
  onSelectLayer: (obj: fabric.Object) => void;
  onDelete: () => void;
  onUpdate: () => void; // Trigger canvas render
  availableFields: DataField[];
  onClose?: () => void; // New prop for mobile
}

const getIconForType = (obj: any) => {
  if (obj.isBarcode) return <Hash size={14} className="text-emerald-500" />;
  if (obj.isQrCode) return <QrCode size={14} className="text-purple-500" />;
  if (obj.type === 'i-text' || obj.type === 'text') {
      return <Type size={14} className={obj.dataKey ? "text-blue-500" : "text-zinc-400"} />;
  }
  if (obj.type === 'image') return <ImageIcon size={14} className="text-orange-500" />;
  if (obj.type === 'rect') return <Square size={14} className="text-zinc-400" />;
  if (obj.type === 'circle') return <Circle size={14} className="text-zinc-400" />;
  if (obj.type === 'triangle') return <Triangle size={14} className="text-zinc-400" />;
  if (obj.type === 'line') return <Minus size={14} className="text-zinc-400" />;
  return <Box size={14} className="text-zinc-400" />;
};

const getNameForType = (obj: any) => {
  if (obj.isBarcode) return `Barcode: ${obj.dataKey}`;
  if (obj.isQrCode) return `QR: ${obj.dataKey}`;
  if (obj.dataKey) return `Var: ${obj.dataKey}`;
  if (obj.text) return `Text: ${obj.text.substring(0, 10)}...`;
  if (obj.type === 'rect') return 'Rectangle';
  if (obj.type === 'circle') return 'Circle';
  if (obj.type === 'triangle') return 'Triangle';
  if (obj.type === 'line') return 'Line';
  return obj.type;
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  activeObject, 
  layers,
  onSelectLayer,
  onDelete, 
  onUpdate, 
  availableFields,
  onClose
}) => {
  const [dataKey, setDataKey] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(14);
  const [textAlign, setTextAlign] = useState<string>('left');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [color, setColor] = useState<string>('#000000');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(1);
  
  // View State
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('layers');
  const selectedLayerRef = useRef<HTMLButtonElement>(null);

  // Sync state with activeObject
  useEffect(() => {
    if (activeObject) {
      // Sync Property States
      setDataKey((activeObject as any).dataKey || '');
      setColor((activeObject.fill as string) || '#000000');
      setStrokeColor((activeObject.stroke as string) || '#000000');
      setStrokeWidth(activeObject.strokeWidth || 0);
      
      if (activeObject.type === 'i-text' || activeObject.type === 'text') {
        const textObj = activeObject as fabric.IText;
        setFontSize(textObj.fontSize || 14);
        setTextAlign(textObj.textAlign || 'left');
        setFontFamily(textObj.fontFamily || 'Arial');
      }

      // Switch to properties tab when object is selected
      setActiveTab('properties');
    } else {
      // Switch to layers if selection is cleared
      setActiveTab('layers');
    }
  }, [activeObject]);

  // Scroll to selected layer when visible
  useEffect(() => {
    if (activeTab === 'layers' && activeObject && selectedLayerRef.current) {
        selectedLayerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTab, activeObject]);

  // Properties View Handlers
  const handleDataKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeObject) return;
    const newKey = e.target.value;
    setDataKey(newKey);
    updateObjectDataKey(activeObject, newKey);
    activeObject.canvas?.requestRenderAll();
    onUpdate();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeObject) return;
    const newColor = e.target.value;
    setColor(newColor);
    updateObjectColor(activeObject, newColor);
    onUpdate();
  };

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeObject) return;
    const newColor = e.target.value;
    setStrokeColor(newColor);
    updateObjectStroke(activeObject, newColor);
    onUpdate();
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeObject) return;
    const width = parseInt(e.target.value, 10);
    setStrokeWidth(width);
    updateObjectStrokeWidth(activeObject, width);
    onUpdate();
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeObject) return;
    const size = parseInt(e.target.value, 10);
    setFontSize(size);
    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      (activeObject as fabric.IText).set('fontSize', size);
      activeObject.canvas?.requestRenderAll();
      onUpdate();
    }
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeObject) return;
    const font = e.target.value;
    setFontFamily(font);
    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      (activeObject as fabric.IText).set('fontFamily', font);
      activeObject.canvas?.requestRenderAll();
      onUpdate();
    }
  };

  const handleAlign = (align: string) => {
    if (!activeObject) return;
    setTextAlign(align);
    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      (activeObject as fabric.IText).set('textAlign', align);
      activeObject.canvas?.requestRenderAll();
      onUpdate();
    }
  };

  // Helper booleans for property rendering
  const isVariable = activeObject && !!(activeObject as any).dataKey;
  const isText = activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text');
  const isImage = activeObject && activeObject.type === 'image';
  const isShape = activeObject && ['rect', 'circle', 'triangle', 'line', 'polygon'].includes(activeObject.type || '');
  const isLine = activeObject && activeObject.type === 'line';

  const isColorableImage = activeObject && ((activeObject as any).isBarcode || (activeObject as any).isQrCode);
  
  // Logic for what properties to show
  const showFillPicker = isText || isColorableImage || (isShape && !isLine);
  const showStrokeControls = isShape;

  return (
    <div className="w-72 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-xl lg:shadow-none text-zinc-100">
      
      {/* Header & Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900">
        {activeObject ? (
          <div className="flex">
             <button 
                onClick={() => setActiveTab('properties')}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'properties' ? 'border-blue-500 text-blue-400 bg-zinc-800/50' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
             >
                <Box size={14} /> Properties
             </button>
             <button 
                onClick={() => setActiveTab('layers')}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'layers' ? 'border-blue-500 text-blue-400 bg-zinc-800/50' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
             >
                <List size={14} /> Layers
             </button>
             {onClose && (
                <button onClick={onClose} className="lg:hidden px-3 border-l border-zinc-700 text-zinc-500">
                  <X size={18} />
                </button>
             )}
          </div>
        ) : (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-zinc-400" />
              <h2 className="font-semibold text-zinc-200">Layers</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="lg:hidden p-1 hover:bg-zinc-800 rounded text-zinc-500">
                <X size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        
        {/* LAYERS VIEW */}
        {activeTab === 'layers' && (
           <div className="p-2 space-y-1">
             {layers.length === 0 ? (
               <div className="text-center p-8 text-zinc-500 text-sm">
                 No elements on canvas.
               </div>
             ) : (
               [...layers].reverse().map((obj, idx) => {
                 const isSelected = obj === activeObject;
                 return (
                   <button
                     key={idx}
                     ref={isSelected ? selectedLayerRef : null}
                     onClick={() => onSelectLayer(obj)}
                     className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group border ${
                        isSelected 
                        ? 'bg-blue-900/30 border-blue-500/50 shadow-sm z-10' 
                        : 'bg-transparent border-transparent hover:bg-zinc-800 hover:border-zinc-700'
                     }`}
                   >
                     <div className={`p-2 rounded-md border shrink-0 ${isSelected ? 'bg-zinc-800 border-blue-500/30' : 'bg-zinc-800 border-zinc-700 group-hover:bg-zinc-700'}`}>
                        {getIconForType(obj)}
                     </div>
                     <span className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-blue-300' : 'text-zinc-300'}`}>
                       {getNameForType(obj)}
                     </span>
                     {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>}
                   </button>
                 );
               })
             )}
           </div>
        )}

        {/* PROPERTIES VIEW */}
        {activeTab === 'properties' && activeObject && (
          <div className="p-4 space-y-6">
            
            {/* Header info */}
            <div className="pb-2 border-b border-zinc-800">
               <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Type</p>
               <div className="flex items-center gap-2 text-sm text-zinc-200 bg-zinc-800/50 p-2 rounded border border-zinc-800">
                   {getIconForType(activeObject)}
                   <span className="truncate font-medium">{getNameForType(activeObject)}</span>
               </div>
            </div>

            {/* Data Binding Section (Only if applicable) */}
            {(isText || isColorableImage) && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Data Binding</label>
                {isVariable || isColorableImage ? (
                  availableFields.length > 0 ? (
                    <select 
                      value={dataKey} 
                      onChange={handleDataKeyChange}
                      className="w-full p-2 text-sm border border-zinc-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-zinc-950 text-zinc-200"
                    >
                      <option value="" disabled>Select Field</option>
                      {availableFields.map(field => (
                        <option key={field.value} value={field.value}>{field.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-900/30">
                      No CSV data loaded. Please import a CSV file to bind fields.
                    </div>
                  )
                ) : (
                  <div className="text-sm text-zinc-500 italic bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    No data binding available.
                  </div>
                )}
              </div>
            )}

            {/* Fill Color Picker */}
            {showFillPicker && (
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                     <Palette size={12} /> Fill Color
                  </label>
                  <div className="flex items-center gap-3">
                     <div className="relative border border-zinc-700 bg-zinc-950 rounded-md overflow-hidden w-10 h-8 shadow-sm cursor-pointer hover:border-zinc-500">
                         <input 
                            type="color" 
                            value={color}
                            onChange={handleColorChange}
                            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 border-0 cursor-pointer"
                            title="Choose Color"
                         />
                     </div>
                     <input 
                        type="text" 
                        value={color}
                        onChange={(e) => { setColor(e.target.value); if(activeObject) updateObjectColor(activeObject, e.target.value); onUpdate(); }}
                        className="flex-1 text-xs font-mono p-1.5 border border-zinc-700 rounded text-zinc-300 uppercase focus:ring-2 focus:ring-blue-500 outline-none bg-zinc-950"
                        placeholder="#000000"
                     />
                  </div>
               </div>
            )}

            {/* Stroke Controls */}
            {showStrokeControls && (
               <div className="space-y-4 pt-4 border-t border-zinc-800">
                  {/* Stroke Color */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                       <PenTool size={12} /> Stroke Color
                    </label>
                    <div className="flex items-center gap-3">
                       <div className="relative border border-zinc-700 bg-zinc-950 rounded-md overflow-hidden w-10 h-8 shadow-sm cursor-pointer hover:border-zinc-500">
                           <input 
                              type="color" 
                              value={strokeColor}
                              onChange={handleStrokeColorChange}
                              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 border-0 cursor-pointer"
                              title="Choose Stroke Color"
                           />
                       </div>
                       <input 
                          type="text" 
                          value={strokeColor}
                          onChange={(e) => { setStrokeColor(e.target.value); if(activeObject) updateObjectStroke(activeObject, e.target.value); onUpdate(); }}
                          className="flex-1 text-xs font-mono p-1.5 border border-zinc-700 rounded text-zinc-300 uppercase focus:ring-2 focus:ring-blue-500 outline-none bg-zinc-950"
                          placeholder="#000000"
                       />
                    </div>
                  </div>

                  {/* Stroke Width */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Stroke Width</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="20" 
                        value={strokeWidth} 
                        onChange={handleStrokeWidthChange}
                        className="flex-1 accent-blue-600 bg-zinc-800"
                      />
                      <span className="text-sm font-mono w-8 text-right text-zinc-300">{strokeWidth}</span>
                    </div>
                  </div>
               </div>
            )}

            {/* Text Styling */}
            {isText && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={handleFontFamilyChange}
                    className="w-full p-2 text-sm border border-zinc-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-zinc-950 text-zinc-200"
                  >
                    {AVAILABLE_FONTS.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Font Size</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="8" 
                      max="72" 
                      value={fontSize} 
                      onChange={handleFontSizeChange}
                      className="flex-1 accent-blue-600 bg-zinc-800"
                    />
                    <span className="text-sm font-mono w-8 text-right text-zinc-300">{fontSize}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Alignment</label>
                  <div className="flex bg-zinc-800 rounded-md p-1 gap-1">
                    <button 
                       onClick={() => handleAlign('left')}
                       className={`flex-1 py-1 rounded flex justify-center transition-all ${textAlign === 'left' ? 'bg-zinc-700 shadow text-blue-400' : 'hover:bg-zinc-700 text-zinc-500'}`}
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button 
                       onClick={() => handleAlign('center')}
                       className={`flex-1 py-1 rounded flex justify-center transition-all ${textAlign === 'center' ? 'bg-zinc-700 shadow text-blue-400' : 'hover:bg-zinc-700 text-zinc-500'}`}
                    >
                      <AlignCenter size={16} />
                    </button>
                    <button 
                       onClick={() => handleAlign('right')}
                       className={`flex-1 py-1 rounded flex justify-center transition-all ${textAlign === 'right' ? 'bg-zinc-700 shadow text-blue-400' : 'hover:bg-zinc-700 text-zinc-500'}`}
                    >
                      <AlignRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Position Info (Read Only) */}
            <div className="space-y-2 pt-4 border-t border-zinc-800">
               <label className="text-xs font-semibold text-zinc-500 uppercase">Position</label>
               <div className="grid grid-cols-2 gap-2 text-sm">
                 <div className="bg-zinc-800/50 p-2 rounded text-zinc-300 flex justify-between">
                   <span className="text-zinc-500">X</span> 
                   <span className="font-mono">{Math.round(activeObject.left || 0)}</span>
                 </div>
                 <div className="bg-zinc-800/50 p-2 rounded text-zinc-300 flex justify-between">
                   <span className="text-zinc-500">Y</span> 
                   <span className="font-mono">{Math.round(activeObject.top || 0)}</span>
                 </div>
               </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer Actions (Only for Properties) */}
      {activeTab === 'properties' && activeObject && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <button 
            onClick={() => {
              onDelete();
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-md transition-colors text-sm font-medium border border-red-900/30"
          >
            <Trash2 size={16} />
            Delete Element
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;