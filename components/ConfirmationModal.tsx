import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            {title}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-zinc-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;