import React, { useRef, useState } from 'react';
import { Type, Variable, Barcode, QrCode, Image as ImageIcon, Box, Upload, Database, ChevronDown, ChevronRight, Info, Table, X, Sparkles } from 'lucide-react';
import { DataField } from '../types';

interface ToolbarProps {
  onAddText: () => void;
  onAddVariable: (key: string) => void;
  onAddBarcode: (key: string) => void;
  onAddQrCode: (key: string) => void;
  onAddImage: (url: string) => void;
  onImportCsv: (file: File) => void;
  onOpenDataEditor: () => void;
  onGenerateLayout?: () => void; // New prop for AI generation
  availableFields: DataField[];
  onClose?: () => void; 
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddText, 
  onAddVariable, 
  onAddBarcode, 
  onAddQrCode,
  onAddImage,
  onImportCsv,
  onOpenDataEditor,
  onGenerateLayout,
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
    <div className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-700 h-full shadow-xl lg:shadow-none">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Box size={24} className="text-blue-400" />
          LabelCraft
        </h1>
        {/* Mobile Close Button */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        
        {/* Data Source */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Data Source</h3>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-800 rounded-lg transition-colors text-sm font-medium text-indigo-100"
          >
            <Upload size={18} />
            Import CSV Data
          </button>

          {/* Manage Data & AI Generate Buttons - Only shows if data exists */}
          {availableFields.length > 0 && (
            <div className="space-y-2 mt-2">
              <button
                onClick={() => wrapAction(onOpenDataEditor)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-xs font-medium text-slate-200"
              >
                <Table size={14} />
                Manage Data ({availableFields.length} Cols)
              </button>

              {onGenerateLayout && (
                <button
                  onClick={() => wrapAction(onGenerateLayout)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border border-transparent rounded-lg transition-all text-sm font-bold text-white shadow-lg shadow-purple-900/20 group"
                >
                  <Sparkles size={16} className="group-hover:animate-pulse" />
                  Auto-Layout with AI
                </button>
              )}
            </div>
          )}
          
          <div className="mt-3">
             <button 
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
             >
                <div className="flex items-center gap-1.5">
                   <Info size={12} />
                   <span>CSV Format Info</span>
                </div>
                {showHelp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
             </button>

             {showHelp && (
               <div className="mt-2 p-3 bg-slate-800 rounded-md border border-slate-700 animate-in slide-in-from-top-1 fade-in duration-200">
                  <div className="text-xs text-slate-400">
                     <p className="font-semibold text-slate-300 mb-1">Required Structure:</p>
                     <ul className="list-disc pl-3 space-y-1 leading-relaxed">
                        <li>Row 1: <strong>Headers</strong> (e.g. Name, SKU).</li>
                        <li>Headers become data variables.</li>
                     </ul>
                  </div>
               </div>
             )}
          </div>

          {availableFields.length > 0 && (
            <div className="mt-3 text-xs text-green-400 flex items-center gap-1 px-1">
              <Database size={12} />
              {availableFields.length} fields loaded
            </div>
          )}
        </div>

        {/* Basic Elements */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Basic Elements</h3>
          <div className="space-y-2">
            <button
              onClick={() => wrapAction(onAddText)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Type size={18} />
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
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              <ImageIcon size={18} />
              Add Image
            </button>
          </div>
        </div>

        {/* Data Binding Elements */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Data Bindings</h3>
          <div className="space-y-2">
             
             {/* Variable Text Accordion */}
             <div>
                <button 
                  onClick={() => toggleSection('variable')}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors text-sm font-medium ${availableFields.length === 0 ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-900/40 hover:bg-blue-900/60 border-blue-800 text-blue-100'}`}
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
                  <div className="mt-1 ml-3 border-l-2 border-slate-700 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                     {availableFields.map(field => (
                       <button
                         key={field.value}
                         onClick={() => wrapAction(() => onAddVariable(field.value))}
                         className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-2 group"
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
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors text-sm font-medium ${availableFields.length === 0 ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-900/40 hover:bg-emerald-900/60 border-emerald-800 text-emerald-100'}`}
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
                  <div className="mt-1 ml-3 border-l-2 border-slate-700 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                     {availableFields.map(field => (
                       <button
                         key={field.value}
                         onClick={() => wrapAction(() => onAddBarcode(field.value))}
                         className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-2 group"
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
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors text-sm font-medium ${availableFields.length === 0 ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-purple-900/40 hover:bg-purple-900/60 border-purple-800 text-purple-100'}`}
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
                  <div className="mt-1 ml-3 border-l-2 border-slate-700 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                     {availableFields.map(field => (
                       <button
                         key={field.value}
                         onClick={() => wrapAction(() => onAddQrCode(field.value))}
                         className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-2 group"
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
            <p className="text-[10px] text-slate-500 mt-2 text-center">Import CSV to enable bindings</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
        v1.3.1
      </div>
    </div>
  );
};

export default Toolbar;