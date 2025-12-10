import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CsvData } from '../types';
import { X, Trash2, Plus, Upload, Save, AlertCircle, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eraser } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface DataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CsvData | null;
  onSave: (newData: CsvData) => void;
}

const ITEMS_PER_PAGE = 50;

const DataEditorModal: React.FC<DataEditorModalProps> = ({ isOpen, onClose, data, onSave }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize local state when data prop changes, but only if open to save resources
  useEffect(() => {
    if (isOpen && data) {
      setHeaders(data.headers);
      setRows(JSON.parse(JSON.stringify(data.rows))); // Deep copy
      setCurrentPage(1);
    } else if (isOpen && !data) {
      setHeaders([]);
      setRows([]);
      setCurrentPage(1);
    }
  }, [data, isOpen]);

  // If closed, return null immediately. 
  // Note: Hooks above still run, but the heavy rendering below is skipped.
  if (!isOpen) return null;

  // Pagination Logic
  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRows = rows.slice(startIndex, endIndex);

  const handleCellChange = (visualIndex: number, header: string, value: string) => {
    const realIndex = startIndex + visualIndex;
    const newRows = [...rows];
    newRows[realIndex] = { ...newRows[realIndex], [header]: value };
    setRows(newRows);
  };

  const handleDeleteRow = (visualIndex: number) => {
    setRowToDelete(visualIndex);
  };

  const executeDeleteRow = () => {
    if (rowToDelete === null) return;
    const realIndex = startIndex + rowToDelete;
    const newRows = rows.filter((_, index) => index !== realIndex);
    setRows(newRows);
    // Adjust page if empty
    if (newRows.length > 0 && newRows.length <= startIndex && currentPage > 1) {
        setCurrentPage(c => c - 1);
    }
    setRowToDelete(null);
  };

  const handleClearAll = () => {
    setHeaders([]);
    setRows([]);
    setCurrentPage(1);
  };

  const handleAddRow = () => {
    const newRow = headers.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {} as Record<string, string>);
    const newRows = [newRow, ...rows]; // Add to top for visibility
    setRows(newRows);
    setCurrentPage(1); // Jump to first page to see new row
  };

  const handleSave = () => {
    onSave({ headers, rows });
    onClose();
  };

  const handleAppendCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const newHeaders = lines[0].split(',').map(h => h.trim());
      
      // Validation: Headers must match existing data
      const headersMatch = newHeaders.length === headers.length && 
                           newHeaders.every((h, i) => h === headers[i]);

      if (headers.length > 0 && !headersMatch) {
        alert(`Header mismatch! Imported CSV must have columns: ${headers.join(', ')}`);
        return;
      }

      // Parse rows
      const newRows = lines.slice(1).map(line => {
        const values = line.split(',');
        return newHeaders.reduce((acc, header, index) => {
          acc[header] = values[index]?.trim() || '';
          return acc;
        }, {} as Record<string, string>);
      });

      // If this was an empty dataset initially, set headers too
      if (headers.length === 0) {
        setHeaders(newHeaders);
      }

      setRows(prev => [...prev, ...newRows]);
      alert(`Appended ${newRows.length} rows.`);
    };
    reader.readAsText(file);
    // Reset input
    if (e.target.value) e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Manage Data Source
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Edit values directly, add rows, or append more data from CSV.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
             <button 
               onClick={handleAddRow}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
             >
               <Plus size={16} />
               Add Empty Row
             </button>
             <div className="h-6 w-px bg-slate-200 mx-1"></div>
             <input 
               type="file" 
               accept=".csv" 
               ref={fileInputRef} 
               className="hidden" 
               onChange={handleAppendCsv}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
             >
               <Upload size={16} />
               Append CSV Data
             </button>
             <div className="h-6 w-px bg-slate-200 mx-1"></div>
             <button 
               onClick={() => setIsClearConfirmOpen(true)}
               disabled={headers.length === 0}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Eraser size={16} />
               Clear All
             </button>
          </div>
          <div className="text-xs font-mono text-slate-400">
            {rows.length} Rows &bull; {headers.length} Columns
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-slate-50">
          {headers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <AlertCircle size={48} className="mb-2 opacity-20" />
               <p>No data loaded.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3 border-b border-r border-slate-200 w-12 text-center bg-slate-100">#</th>
                  {headers.map(header => (
                    <th key={header} className="px-4 py-3 border-b border-r border-slate-200 bg-slate-100 min-w-[150px]">
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-3 border-b border-slate-200 w-12 text-center bg-slate-100">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, visualIndex) => (
                  <tr key={startIndex + visualIndex} className="bg-white hover:bg-blue-50/30">
                    <td className="px-2 py-2 border-b border-r border-slate-200 text-center text-xs text-slate-400 font-mono">
                      {startIndex + visualIndex + 1}
                    </td>
                    {headers.map(header => (
                      <td key={`${startIndex + visualIndex}-${header}`} className="border-b border-r border-slate-200 p-0">
                        <input 
                          type="text" 
                          value={row[header] || ''} 
                          onChange={(e) => handleCellChange(visualIndex, header, e.target.value)}
                          className="w-full h-full px-4 py-2 bg-transparent outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all text-slate-700"
                        />
                      </td>
                    ))}
                    <td className="border-b border-slate-200 text-center">
                      <button 
                        onClick={() => handleDeleteRow(visualIndex)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete Row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer - Pagination & Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
           
           {/* Pagination Controls */}
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1 || headers.length === 0}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronsLeft size={16} className="text-slate-600" />
              </button>
              <button 
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))} 
                disabled={currentPage === 1 || headers.length === 0}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              
              <span className="text-xs font-medium text-slate-600 mx-2">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button 
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} 
                disabled={currentPage === totalPages || headers.length === 0}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} className="text-slate-600" />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages || headers.length === 0}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronsRight size={16} className="text-slate-600" />
              </button>
           </div>

           <div className="flex items-center gap-3">
             <button 
               onClick={onClose} 
               className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium text-sm"
             >
               Cancel
             </button>
             <button 
               onClick={handleSave} 
               className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm shadow-sm flex items-center gap-2"
             >
               <Save size={16} />
               Save Changes
             </button>
           </div>
        </div>

        {/* Delete Row Confirmation Modal */}
        <ConfirmationModal 
           isOpen={rowToDelete !== null}
           onClose={() => setRowToDelete(null)}
           onConfirm={executeDeleteRow}
           title="Delete Row"
           message="Are you sure you want to delete this row? This action cannot be undone."
           confirmLabel="Delete"
        />

        {/* Clear All Confirmation Modal */}
        <ConfirmationModal 
           isOpen={isClearConfirmOpen}
           onClose={() => setIsClearConfirmOpen(false)}
           onConfirm={handleClearAll}
           title="Clear All Data"
           message="Are you sure you want to remove all data (rows and headers)? This action cannot be undone."
           confirmLabel="Clear Data"
        />

      </div>
    </div>
  );
};

export default DataEditorModal;