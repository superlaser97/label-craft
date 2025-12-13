import React, { useEffect, useState, useRef } from 'react';
import * as fabric from 'fabric';
import { DataField } from '../types';
import { updateObjectDataKey, updateObjectColor } from '../services/fabricHelper';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Layers, Type, Image as ImageIcon, Box, Hash, QrCode, X, Palette, List } from 'lucide-react';
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
  if (obj.isBarcode) return <Hash size={14} className="text-emerald-600" />;
  if (obj.isQrCode) return <QrCode size={14} className="text-purple-600" />;
  if (obj.type === 'i-text' || obj.type === 'text') {
      return <Type size={14} className={obj.dataKey ? "text-blue-600" : "text-slate-600"} />;
  }
  if (obj.type === 'image') return <ImageIcon size={14} className="text-orange-600" />;
  return <Box size={14} className="text-slate-600" />;
};

const getNameForType = (obj: any) => {
  if (obj.isBarcode) return `Barcode: ${obj.dataKey}`;
  if (obj.isQrCode) return `QR: ${obj.dataKey}`;
  if (obj.dataKey) return `Var: ${obj.dataKey}`;
  if (obj.text) return `Text: ${obj.text.substring(0, 10)}...`;
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
  
  // View State
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('layers');
  const selectedLayerRef = useRef<HTMLButtonElement>(null);

  // Sync state with activeObject
  useEffect(() => {
    if (activeObject) {
      // Sync Property States
      setDataKey((activeObject as any).dataKey || '');
      setColor((activeObject.fill as string) || '#000000');
      
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
  const isColorableImage = activeObject && ((activeObject as any).isBarcode || (activeObject as any).isQrCode);
  const showColorPicker = isText || isColorableImage;

  return (
    <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl lg:shadow-none">
      
      {/* Header & Tabs */}
      <div className="border-b border-slate-200 bg-slate-50">
        {activeObject ? (
          <div className="flex">
             <button 
                onClick={() => setActiveTab('properties')}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'properties' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
                <Box size={14} /> Properties
             </button>
             <button 
                onClick={() => setActiveTab('layers')}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'layers' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
             >
                <List size={14} /> Layers
             </button>
             {onClose && (
                <button onClick={onClose} className="lg:hidden px-3 border-l border-slate-200 text-slate-500">
                  <X size={18} />
                </button>
             )}
          </div>
        ) : (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-700">Layers</h2>
            </div>
            {onClose && (
              <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-200 rounded text-slate-500">
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
               <div className="text-center p-8 text-slate-400 text-sm">
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
                        ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100 z-10' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200'
                     }`}
                   >
                     <div className={`p-2 rounded-md border shrink-0 ${isSelected ? 'bg-white border-blue-100' : 'bg-slate-100 border-slate-200 group-hover:bg-white'}`}>
                        {getIconForType(obj)}
                     </div>
                     <span className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
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
            <div className="pb-2 border-b border-slate-100">
               <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Type</p>
               <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                   {getIconForType(activeObject)}
                   <span className="truncate font-medium">{getNameForType(activeObject)}</span>
               </div>
            </div>

            {/* Data Binding Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Data Binding</label>
              {isVariable ? (
                availableFields.length > 0 ? (
                  <select 
                    value={dataKey} 
                    onChange={handleDataKeyChange}
                    className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  >
                    <option value="" disabled>Select Field</option>
                    {availableFields.map(field => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
                    No CSV data loaded. Please import a CSV file to bind fields.
                  </div>
                )
              ) : (
                <div className="text-sm text-slate-400 italic bg-slate-50 p-2 rounded border border-slate-100">
                  No data binding available.
                </div>
              )}
            </div>

            {/* Color Picker */}
            {showColorPicker && (
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                     <Palette size={12} /> Color
                  </label>
                  <div className="flex items-center gap-3">
                     <div className="relative border border-slate-300 bg-white rounded-md overflow-hidden w-10 h-8 shadow-sm cursor-pointer hover:border-slate-400">
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
                        className="flex-1 text-xs font-mono p-1.5 border border-slate-300 rounded text-slate-600 uppercase focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        placeholder="#000000"
                     />
                  </div>
               </div>
            )}

            {/* Text Styling */}
            {isText && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={handleFontFamilyChange}
                    className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  >
                    {AVAILABLE_FONTS.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Font Size</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="8" 
                      max="72" 
                      value={fontSize} 
                      onChange={handleFontSizeChange}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-mono w-8 text-right text-slate-700">{fontSize}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Alignment</label>
                  <div className="flex bg-slate-100 rounded-md p-1 gap-1">
                    <button 
                       onClick={() => handleAlign('left')}
                       className={`flex-1 py-1 rounded flex justify-center transition-all ${textAlign === 'left' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200 text-slate-500'}`}
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button 
                       onClick={() => handleAlign('center')}
                       className={`flex-1 py-1 rounded flex justify-center transition-all ${textAlign === 'center' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200 text-slate-500'}`}
                    >
                      <AlignCenter size={16} />
                    </button>
                    <button 
                       onClick={() => handleAlign('right')}
                       className={`flex-1 py-1 rounded flex justify-center transition-all ${textAlign === 'right' ? 'bg-white shadow text-blue-600' : 'hover:bg-slate-200 text-slate-500'}`}
                    >
                      <AlignRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Position Info (Read Only) */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
               <label className="text-xs font-semibold text-slate-500 uppercase">Position</label>
               <div className="grid grid-cols-2 gap-2 text-sm">
                 <div className="bg-slate-50 p-2 rounded text-slate-700 flex justify-between">
                   <span className="text-slate-400">X</span> 
                   <span className="font-mono">{Math.round(activeObject.left || 0)}</span>
                 </div>
                 <div className="bg-slate-50 p-2 rounded text-slate-700 flex justify-between">
                   <span className="text-slate-400">Y</span> 
                   <span className="font-mono">{Math.round(activeObject.top || 0)}</span>
                 </div>
               </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer Actions (Only for Properties) */}
      {activeTab === 'properties' && activeObject && (
        <div className="p-4 border-t border-slate-200 bg-white">
          <button 
            onClick={() => {
              onDelete();
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-sm font-medium"
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