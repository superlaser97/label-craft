import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, FolderOpen, Clock, File, Library, Search } from 'lucide-react';
import { LabelTemplate, SavedTemplateMetadata } from '../types';
import { getSavedTemplates, saveTemplateToBrowser, deleteTemplateFromBrowser, loadTemplateFromBrowser } from '../services/storage';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (template: LabelTemplate) => void;
  currentTemplateProvider: () => LabelTemplate | null;
}

const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoadTemplate,
  currentTemplateProvider
}) => {
  const [templates, setTemplates] = useState<SavedTemplateMetadata[]>([]);
  const [saveName, setSaveName] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'save'>('library');
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh list when opened
  useEffect(() => {
    if (isOpen) {
      loadList();
      // Pre-fill name from current template if available
      const current = currentTemplateProvider();
      if (current) {
        setSaveName(current.templateName);
      }
    }
  }, [isOpen]);

  const loadList = () => {
    setTemplates(getSavedTemplates());
  };

  const handleSave = () => {
    const current = currentTemplateProvider();
    if (!current) return;
    
    if (!saveName.trim()) {
      alert("Please enter a template name");
      return;
    }

    try {
      const templateToSave = { ...current, templateName: saveName };
      saveTemplateToBrowser(templateToSave);
      setSaveName('');
      loadList();
      setActiveTab('library');
    } catch (e) {
      alert("Failed to save. Storage might be full.");
    }
  };

  const handleLoad = (id: string) => {
    const template = loadTemplateFromBrowser(id);
    if (template) {
      onLoadTemplate(template);
      onClose();
    } else {
      alert("Could not load template data.");
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      deleteTemplateFromBrowser(id);
      loadList();
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-zinc-800">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Library className="text-blue-500" size={24} />
            Template Library
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'library' ? 'border-blue-500 text-blue-400 bg-zinc-800/50' : 'border-transparent text-zinc-500 hover:bg-zinc-800/50'}`}
          >
            <FolderOpen size={16} /> Saved Templates ({templates.length})
          </button>
          <button 
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'save' ? 'border-blue-500 text-blue-400 bg-zinc-800/50' : 'border-transparent text-zinc-500 hover:bg-zinc-800/50'}`}
          >
            <Save size={16} /> Save Current
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-zinc-950 relative">
          
          {/* Library Tab */}
          {activeTab === 'library' && (
            <div className="absolute inset-0 flex flex-col p-4">
               {/* Search */}
               <div className="relative mb-4">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                 <input 
                   type="text"
                   placeholder="Search saved templates..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
                 />
               </div>

               {/* List */}
               <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                 {filteredTemplates.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                     <FolderOpen size={48} className="mb-2 opacity-20" />
                     <p>No templates found.</p>
                     {templates.length === 0 && (
                        <button onClick={() => setActiveTab('save')} className="mt-2 text-blue-400 hover:underline text-sm">Save your first template</button>
                     )}
                   </div>
                 ) : (
                   filteredTemplates.map(template => (
                     <div key={template.id} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 hover:border-blue-500/50 shadow-sm transition-all flex items-center justify-between group">
                       <div className="flex items-center gap-3 overflow-hidden">
                         <div className="p-2 bg-blue-900/20 text-blue-400 rounded-md shrink-0">
                           <File size={20} />
                         </div>
                         <div className="min-w-0">
                           <h4 className="font-medium text-zinc-200 truncate">{template.name}</h4>
                           <div className="flex items-center gap-1 text-xs text-zinc-500">
                             <Clock size={12} />
                             {new Date(template.updatedAt).toLocaleDateString()} {new Date(template.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => handleLoad(template.id)}
                           className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded shadow-sm transition-colors"
                         >
                           Load
                         </button>
                         <button 
                           onClick={() => handleDelete(template.id)}
                           className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                           title="Delete"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          )}

          {/* Save Tab */}
          {activeTab === 'save' && (
            <div className="p-8 flex flex-col items-center justify-center h-full">
              <div className="w-full max-w-md bg-zinc-900 p-6 rounded-xl shadow-lg border border-zinc-800">
                 <h3 className="text-lg font-semibold text-zinc-100 mb-1">Save Template</h3>
                 <p className="text-sm text-zinc-400 mb-4">Save your current workspace to the browser library.</p>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-medium text-zinc-400 mb-1">Template Name</label>
                     <input 
                       type="text" 
                       value={saveName}
                       onChange={(e) => setSaveName(e.target.value)}
                       placeholder="e.g. Product Label 4x6"
                       className="w-full p-2 border border-zinc-700 rounded-lg text-sm bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
                       autoFocus
                     />
                   </div>
                   
                   <button 
                     onClick={handleSave}
                     className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                   >
                     <Save size={18} />
                     Save to Library
                   </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManagerModal;