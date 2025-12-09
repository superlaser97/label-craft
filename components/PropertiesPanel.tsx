import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { DataField } from '../types';
import { updateObjectDataKey } from '../services/fabricHelper';
import { Settings, Trash2, AlignLeft, AlignCenter, AlignRight, Layers, Type, Image as ImageIcon, Box, Hash, QrCode, X } from 'lucide-react';
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
  
  useEffect(() => {
    if (activeObject) {
      setDataKey((activeObject as any).dataKey || '');
      if (activeObject.type === 'i-text' || activeObject.type === 'text') {
        const textObj = activeObject as fabric.IText;
        setFontSize(textObj.fontSize || 14);
        setTextAlign(textObj.textAlign || 'left');
        setFontFamily(textObj.fontFamily || 'Arial');
      }
    }
  }, [activeObject]);

  // If no object selected, show Layer List
  if (!activeObject) {
    return (
      <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl lg:shadow-none">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
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
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {layers.length === 0 ? (
             <div className="text-center p-8 text-slate-400 text-sm">
               No elements on canvas.
             </div>
           ) : (
             [...layers].reverse().map((obj, idx) => ( // Reverse to show top on top
               <button
                 key={idx}
                 onClick={() => {
                    onSelectLayer(obj);
                    // Do not auto-close here, user might want to edit it immediately
                 }}
                 className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
               >
                 <div className="p-2 bg-slate-100 rounded-md group-hover:bg-white border border-slate-200">
                    {getIconForType(obj)}
                 </div>
                 <span className="text-sm font-medium text-slate-700 truncate flex-1">
                   {getNameForType(obj)}
                 </span>
               </button>
             ))
           )}
        </div>
      </div>
    );
  }

  // Properties View
  const handleDataKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKey = e.target.value;
    setDataKey(newKey);
    updateObjectDataKey(activeObject, newKey);
    activeObject.canvas?.requestRenderAll();
    onUpdate();
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    setFontSize(size);
    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      (activeObject as fabric.IText).set('fontSize', size);
      activeObject.canvas?.requestRenderAll();
      onUpdate();
    }
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    setFontFamily(font);
    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      (activeObject as fabric.IText).set('fontFamily', font);
      activeObject.canvas?.requestRenderAll();
      onUpdate();
    }
  };

  const handleAlign = (align: string) => {
    setTextAlign(align);
    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      (activeObject as fabric.IText).set('textAlign', align);
      activeObject.canvas?.requestRenderAll();
      onUpdate();
    }
  };

  const isVariable = !!(activeObject as any).dataKey;
  const isText = activeObject.type === 'i-text' || activeObject.type === 'text';

  return (
    <div className="w-72 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl lg:shadow-none">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-700">Properties</h2>
          <p className="text-xs text-slate-500 mt-1 capitalize truncate">{getNameForType(activeObject)}</p>
        </div>
        {onClose && (
            <button onClick={onClose} className="lg:hidden ml-2 p-1 hover:bg-slate-200 rounded text-slate-500">
              <X size={20} />
            </button>
        )}
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        
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
              No data binding available for this static object.
            </div>
          )}
        </div>

        {/* Text Styling */}
        {isText && (
          <div className="space-y-4">
            
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
                  className="flex-1"
                />
                <span className="text-sm font-mono w-8 text-right text-slate-700">{fontSize}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Alignment</label>
              <div className="flex bg-slate-100 rounded-md p-1 gap-1">
                <button 
                   onClick={() => handleAlign('left')}
                   className={`flex-1 py-1 rounded flex justify-center ${textAlign === 'left' ? 'bg-white shadow text-slate-900' : 'hover:bg-slate-200 text-slate-600'}`}
                >
                  <AlignLeft size={16} />
                </button>
                <button 
                   onClick={() => handleAlign('center')}
                   className={`flex-1 py-1 rounded flex justify-center ${textAlign === 'center' ? 'bg-white shadow text-slate-900' : 'hover:bg-slate-200 text-slate-600'}`}
                >
                  <AlignCenter size={16} />
                </button>
                <button 
                   onClick={() => handleAlign('right')}
                   className={`flex-1 py-1 rounded flex justify-center ${textAlign === 'right' ? 'bg-white shadow text-slate-900' : 'hover:bg-slate-200 text-slate-600'}`}
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
             <div className="bg-slate-50 p-2 rounded text-slate-700">
               <span className="text-slate-400 mr-2">X:</span> 
               {Math.round(activeObject.left || 0)}
             </div>
             <div className="bg-slate-50 p-2 rounded text-slate-700">
               <span className="text-slate-400 mr-2">Y:</span> 
               {Math.round(activeObject.top || 0)}
             </div>
           </div>
        </div>

      </div>

      <div className="p-4 border-t border-slate-200">
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
    </div>
  );
};

export default PropertiesPanel;