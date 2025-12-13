import React, { useState, useEffect } from 'react';
import { Ruler, CreditCard, X, Save, Minus, Plus } from 'lucide-react';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ppi: number) => void;
  currentPpi: number;
}

// Standard Credit Card Width (ID-1 Format)
const CARD_WIDTH_MM = 85.60;
const CARD_WIDTH_IN = 3.370;

const CalibrationModal: React.FC<CalibrationModalProps> = ({ isOpen, onClose, onSave, currentPpi }) => {
  // Initial width in pixels based on current PPI
  const [pixelWidth, setPixelWidth] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPixelWidth(Math.round(CARD_WIDTH_IN * currentPpi));
    }
  }, [isOpen, currentPpi]);

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelWidth(parseInt(e.target.value, 10));
  };

  const handleSave = () => {
    const newPpi = pixelWidth / CARD_WIDTH_IN;
    onSave(newPpi);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-zinc-800">
        
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2">
            <Ruler className="text-blue-500" size={20} />
            Calibrate Screen Size
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-sm text-zinc-300 space-y-2">
            <p>
              To ensure <strong>100% Zoom</strong> matches real-world dimensions, we need to know your screen's Pixel Density (PPI).
            </p>
            <p className="font-medium text-blue-200 bg-blue-900/20 p-3 rounded-lg border border-blue-900/30 flex items-start gap-2">
              <CreditCard className="text-blue-400 shrink-0 mt-0.5" size={18}/>
              <span>Hold a standard credit card against the screen and adjust the slider until the gray box below matches the card's width exactly.</span>
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-4 bg-zinc-950 rounded-xl border border-zinc-800 border-dashed">
            {/* The Reference Box */}
            <div 
              className="h-48 bg-zinc-700 rounded-xl shadow-inner border border-zinc-600 relative flex items-center justify-center transition-all duration-75 ease-out"
              style={{ width: `${pixelWidth}px` }}
            >
               <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 font-mono text-xs pointer-events-none opacity-50">
                  <CreditCard size={48} strokeWidth={1} />
                  <span className="mt-2">Standard Card</span>
               </div>
               
               {/* Measurement Labels */}
               <div className="absolute -bottom-6 left-0 right-0 text-center text-xs font-mono text-zinc-500">
                 {Math.round(pixelWidth)}px
               </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase tracking-wider">
               <span>Smaller</span>
               <span>Larger</span>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setPixelWidth(p => p - 1)}
                 className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors border border-zinc-700"
                 title="Decrease width by 1px"
               >
                 <Minus size={16} />
               </button>
               
               <input 
                  type="range" 
                  min="200" 
                  max="600" 
                  value={pixelWidth} 
                  onChange={handleSliderChange}
                  className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

               <button 
                 onClick={() => setPixelWidth(p => p + 1)}
                 className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors border border-zinc-700"
                 title="Increase width by 1px"
               >
                 <Plus size={16} />
               </button>
            </div>
            <div className="text-center text-xs text-zinc-600">
               Use buttons for 1px adjustments
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save Calibration
          </button>
        </div>

      </div>
    </div>
  );
};

export default CalibrationModal;