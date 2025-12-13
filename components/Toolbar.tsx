import React, { useRef, useState } from 'react';
import { Type, Variable, Barcode, QrCode, Image as ImageIcon, Box, Upload, Database, ChevronDown, ChevronRight, Info, Table, X, Square, Circle, Triangle, Minus } from 'lucide-react';
import { DataField } from '../types';

interface ToolbarProps {
  onAddText: () => void;
  onAddVariable: (key: string) => void;
  onAddBarcode: (key: string) => void;
  onAddQrCode: (key: string) => void;
  onAddImage: (url: string) => void;
  onAddShape: (type: 'rect' | 'circle' | 'triangle' | 'line') => void;
  onImportCsv: (file: File) => void;
  onOpenDataEditor: () => void;
  availableFields: DataField[];
  onClose?: () => void; // New prop for mobile
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddText, 
  onAddVariable, 
  onAddBarcode, 
  onAddQrCode,
  onAddImage,
  onAddShape,
  onImportCsv,
  onOpenDataEditor,
  availableFields,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // State to track which accordion section is open
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportCsv(e.target.files[0]);
    }
    if (e.target.value) e.target.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        const dataUrl = f.target?.result as string;
        if (dataUrl) {
           onAddImage(dataUrl);
           if (onClose) onClose(); // Close drawer on mobile after selection
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target.value) e.target.value = '';
  };

  const wrapAction = (action: () => void) => {
    action();
    if (onClose) onClose();
  };

  return (
    <div className="w-64 bg-zinc-900 text-zinc-100 flex flex-col border-r border-zinc-800 h-full shadow-xl lg:shadow-none">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2 text-zinc-100">
          <Box size={24} className="text-blue-500" />
          Label Maker
        </h1>
        {/* Mobile Close Button */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700">
        
        {/* Data Source */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Data Source</h3>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all text-sm font-medium text-zinc-200 shadow-sm"
          >
            <Upload size={18} className="text-blue-400" />
            Import CSV Data
          </button>

          {/* Manage Data Button - Only shows if data exists */}
          {availableFields.length > 0 && (
             <button
                onClick={() => wrapAction(onOpenDataEditor)}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors text-xs font-medium text-zinc-300"
             >
                <Table size={14} />
                Manage Data ({availableFields.length} Cols)
             </button>
          )}
          
          <div className="mt-3">
             <button 
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
             >
                <div className="flex items-center gap-1.5">
                   <Info size={12} />
                   <span>CSV Format Info</span>
                </div>
                {showHelp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
             </button>

             {showHelp && (
               <div className="mt-2 p-3 bg-zinc-800 rounded-md border border-zinc-700 animate-in slide-in-from-top-1 fade-in duration-200">
                  <div className="text-xs text-zinc-400">
                     <p className="font-semibold text-zinc-300 mb-1">Required Structure:</p>
                     <ul className="list-disc pl-3 space-y-1 leading-relaxed">
                        <li>Row 1: <strong>Headers</strong> (e.g. Name, SKU).</li>
                        <li>Headers become data variables.</li>
                     </ul>
                  </div>
               </div>
             )}
          </div>

          {availableFields.length > 0 && (
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1 px-1">
              <Database size={12} />
              {availableFields.length} fields loaded
            </div>
          )}
        </div>

        {/* Basic Elements */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Basic Elements</h3>
          <div className="space-y-2">
            <button
              onClick={() => wrapAction(onAddText)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium text-zinc-200 shadow-sm"
            >
              <Type size={18} className="text-zinc-400" />
              Add Static Text
            </button>
            
            <input 
              type="file" 
              accept="image/*" 
              ref={imageInputRef} 
              className="hidden" 
              onChange={handleImageUpload}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium text-zinc-200 shadow-sm"
            >
              <ImageIcon size={18} className="text-zinc-400" />
              Add Image
            </button>
          </div>
        </div>

        {/* Shapes & Lines */}
        <div>
           <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Shapes & Lines</h3>
           <div className="grid grid-cols-4 gap-2">
             <button
               onClick={() => wrapAction(() => onAddShape('rect'))}
               className="flex flex-col items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors aspect-square text-zinc-300"
               title="Rectangle"
             >
               <Square size={20} />
             </button>
             <button
               onClick={() => wrapAction(() => onAddShape('circle'))}
               className="flex flex-col items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors aspect-square text-zinc-300"
               title="Circle"
             >
               <Circle size={20} />
             </button>
             <button
               onClick={() => wrapAction(() => onAddShape('triangle'))}
               className="flex flex-col items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors aspect-square text-zinc-300"
               title="Triangle"
             >
               <Triangle size={20} />
             </button>
             <button
               onClick={() => wrapAction(() => onAddShape('line'))}
               className="flex flex-col items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors aspect-square text-zinc-300"
               title="Line"
             >
               <Minus size={20} />
             </button>
           </div>
        </div>

        {/* Data Binding Elements */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Data Bindings</h3>
          <div className="space-y-2">
             
             {/* Variable Text Accordion */}
             <div>
                <button 
                  onClick={() => toggleSection('variable')}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors text-sm font-medium ${availableFields.length === 0 ? 'bg-zinc-800/50 border-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-blue-900/20 hover:bg-blue-900/30 border-blue-900/50 text-blue-300'}`}
                  disabled={availableFields.length === 0}
                >
                   <div className="flex items-center gap-3">
                     <Variable size={18} />
                     Add Variable
                   </div>
                   {availableFields.length > 0 && (
                     expandedSection === 'variable' ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                   )}
                </button>
                {expandedSection === 'variable' && availableFields.length > 0 && (
                  <div className="mt-1 ml-3 border-l-2 border-zinc-700 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                     {availableFields.map(field => (
                       <button
                         key={field.value}
                         onClick={() => wrapAction(() => onAddVariable(field.value))}
                         className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors flex items-center gap-2 group"
                       >
                         <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-blue-400"></span>
                         <span className="truncate">{field.label}</span>
                       </button>
                     ))}
                  </div>
                )}
             </div>

             {/* Barcode Accordion */}
             <div>
                <button 
                  onClick={() => toggleSection('barcode')}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors text-sm font-medium ${availableFields.length === 0 ? 'bg-zinc-800/50 border-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-emerald-900/20 hover:bg-emerald-900/30 border-emerald-900/50 text-emerald-300'}`}
                  disabled={availableFields.length === 0}
                >
                   <div className="flex items-center gap-3">
                     <Barcode size={18} />
                     Add Barcode
                   </div>
                   {availableFields.length > 0 && (
                     expandedSection === 'barcode' ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                   )}
                </button>
                {expandedSection === 'barcode' && availableFields.length > 0 && (
                  <div className="mt-1 ml-3 border-l-2 border-zinc-700 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                     {availableFields.map(field => (
                       <button
                         key={field.value}
                         onClick={() => wrapAction(() => onAddBarcode(field.value))}
                         className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors flex items-center gap-2 group"
                       >
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400"></span>
                         <span className="truncate">{field.label}</span>
                       </button>
                     ))}
                  </div>
                )}
             </div>

             {/* QR Code Accordion */}
             <div>
                <button 
                  onClick={() => toggleSection('qr')}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors text-sm font-medium ${availableFields.length === 0 ? 'bg-zinc-800/50 border-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-purple-900/20 hover:bg-purple-900/30 border-purple-900/50 text-purple-300'}`}
                  disabled={availableFields.length === 0}
                >
                   <div className="flex items-center gap-3">
                     <QrCode size={18} />
                     Add QR Code
                   </div>
                   {availableFields.length > 0 && (
                     expandedSection === 'qr' ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                   )}
                </button>
                {expandedSection === 'qr' && availableFields.length > 0 && (
                  <div className="mt-1 ml-3 border-l-2 border-zinc-700 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                     {availableFields.map(field => (
                       <button
                         key={field.value}
                         onClick={() => wrapAction(() => onAddQrCode(field.value))}
                         className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors flex items-center gap-2 group"
                       >
                         <span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:bg-purple-400"></span>
                         <span className="truncate">{field.label}</span>
                       </button>
                     ))}
                  </div>
                )}
             </div>

          </div>
          {availableFields.length === 0 && (
            <p className="text-[10px] text-zinc-500 mt-2 text-center">Import CSV to enable bindings</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-600 text-center">
        v1.3.1
      </div>
    </div>
  );
};

export default Toolbar;