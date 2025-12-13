import * as fabric from 'fabric';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { INCH_TO_PX, COLORS } from '../constants';
import { LabelObject, LabelTemplate } from '../types';

// --- Generators ---

const getBarcodeDataUrl = (text: string, color: string = '#000000'): string => {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, text, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 40, // High res font
      margin: 10,
      width: 4, // Thicker bars for higher resolution
      height: 100, // Taller bars
      background: '#ffffff', // Ensure white background
      lineColor: color
    });
    return canvas.toDataURL('image/png'); // Use PNG for barcode generation to keep quality
  } catch (e) {
    console.error("Barcode generation failed", e);
    return '';
  }
};

const getQrDataUrl = async (text: string, color: string = '#000000'): Promise<string> => {
  try {
    // Generate at high resolution (e.g., 400px)
    return await QRCode.toDataURL(text, { 
      width: 400, 
      margin: 1,
      color: {
        dark: color,
        light: '#ffffff'
      }
    });
  } catch (e) {
    console.error("QR generation failed", e);
    return '';
  }
};

// --- Canvas Logic ---

export const createFabricCanvas = (canvasId: string, widthInches: number, heightInches: number) => {
  const canvas = new fabric.Canvas(canvasId, {
    width: INCH_TO_PX(widthInches),
    height: INCH_TO_PX(heightInches),
    backgroundColor: COLORS.canvasBg,
    selection: true,
    preserveObjectStacking: true,
    enableRetinaScaling: true, // Ensure sharp rendering on high DPI
  });
  return canvas;
};

export const resizeCanvas = (canvas: fabric.Canvas, widthInches: number, heightInches: number, zoom: number = 1) => {
  const baseWidth = INCH_TO_PX(widthInches);
  const baseHeight = INCH_TO_PX(heightInches);

  // Set physical dimensions based on zoom
  canvas.setDimensions({
    width: baseWidth * zoom,
    height: baseHeight * zoom,
  });
  
  // Update zoom level
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
};

export const addStaticText = (canvas: fabric.Canvas, text: string = 'New Text') => {
  const textObj = new fabric.IText(text, {
    left: 50,
    top: 50,
    fontFamily: 'Arial',
    fontSize: 20,
    fill: '#000000',
    strokeWidth: 0,
    lockScalingX: true, // Prevent scaling
    lockScalingY: true, // Prevent scaling
    objectCaching: false, // Critical for sharp text on zoom
  });

  // Hide resize controls, only allow rotation and movement
  textObj.setControlsVisibility({
    mt: false, mb: false, ml: false, mr: false, 
    bl: false, br: false, tl: false, tr: false,
    mtr: true, 
  });

  canvas.add(textObj);
  canvas.setActiveObject(textObj);
  canvas.requestRenderAll();
};

export const addVariableText = (canvas: fabric.Canvas, dataKey: string) => {
  const options: any = {
    left: 50,
    top: 100,
    fontFamily: 'Courier New',
    fontSize: 18,
    fill: '#0000FF', // Blue to indicate variable
    dataKey: dataKey,
    strokeWidth: 0,
    lockScalingX: true, // Prevent scaling
    lockScalingY: true, // Prevent scaling
    objectCaching: false, // Critical for sharp text on zoom
  };
  
  const textObj = new fabric.IText(`{{${dataKey}}}`, options);
  (textObj as any).dataKey = dataKey;

  // Hide resize controls, only allow rotation and movement
  textObj.setControlsVisibility({
    mt: false, mb: false, ml: false, mr: false, 
    bl: false, br: false, tl: false, tr: false,
    mtr: true, 
  });
  
  canvas.add(textObj);
  canvas.setActiveObject(textObj);
  canvas.requestRenderAll();
};

export const addBarcode = (canvas: fabric.Canvas, dataKey: string) => {
  const dataUrl = getBarcodeDataUrl(`{{${dataKey}}}`);
  
  fabric.Image.fromURL(dataUrl).then((img) => {
    img.set({
      left: 50,
      top: 150,
      // Scale down because we generated at high res (width: 4)
      scaleX: 0.5, 
      scaleY: 0.5,
      strokeWidth: 0,
      stroke: undefined,
      objectCaching: false, // Critical for sharp rendering on zoom
      lockScalingFlip: true, // Prevent flipping
      fill: '#000000', // Store color meta-data
    });
    
    // Hide side controls to enforce uniform scaling via corners
    img.setControlsVisibility({
      mt: false, mb: false, ml: false, mr: false, 
      bl: true, br: true, tl: true, tr: true,
      mtr: true, 
    });

    // Custom properties
    (img as any).isBarcode = true;
    (img as any).dataKey = dataKey;

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
  });
};

export const addQrCode = async (canvas: fabric.Canvas, dataKey: string) => {
  const dataUrl = await getQrDataUrl(`{{${dataKey}}}`);
  
  fabric.Image.fromURL(dataUrl).then((img) => {
    img.set({
      left: 100,
      top: 100,
      // Scale down because we generated at high res (width: 400)
      scaleX: 0.25, 
      scaleY: 0.25,
      strokeWidth: 0,
      stroke: undefined,
      objectCaching: false, // Critical for sharp rendering on zoom
      lockScalingFlip: true, // Prevent flipping
      fill: '#000000', // Store color meta-data
    });

    // Hide side controls to enforce uniform scaling via corners
    img.setControlsVisibility({
      mt: false, mb: false, ml: false, mr: false, 
      bl: true, br: true, tl: true, tr: true,
      mtr: true, 
    });

    (img as any).isQrCode = true;
    (img as any).dataKey = dataKey;

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
  });
};

// --- Shape Generators ---

export const addRectangle = (canvas: fabric.Canvas) => {
  const rect = new fabric.Rect({
    left: 100,
    top: 100,
    fill: '#e2e8f0', // Slate-200
    width: 100,
    height: 100,
    stroke: '#334155', // Slate-700
    strokeWidth: 2,
    strokeUniform: true, // Fix for distortion
    objectCaching: false,
  });
  canvas.add(rect);
  canvas.setActiveObject(rect);
  canvas.requestRenderAll();
};

export const addCircle = (canvas: fabric.Canvas) => {
  const circle = new fabric.Circle({
    left: 100,
    top: 100,
    fill: '#e2e8f0',
    radius: 50,
    stroke: '#334155',
    strokeWidth: 2,
    strokeUniform: true, // Fix for distortion
    objectCaching: false,
  });
  canvas.add(circle);
  canvas.setActiveObject(circle);
  canvas.requestRenderAll();
};

export const addTriangle = (canvas: fabric.Canvas) => {
  const triangle = new fabric.Triangle({
    left: 100,
    top: 100,
    fill: '#e2e8f0',
    width: 100,
    height: 100,
    stroke: '#334155',
    strokeWidth: 2,
    strokeUniform: true, // Fix for distortion
    objectCaching: false,
  });
  canvas.add(triangle);
  canvas.setActiveObject(triangle);
  canvas.requestRenderAll();
};

export const addLine = (canvas: fabric.Canvas) => {
  const line = new fabric.Line([50, 100, 200, 100], {
    left: 50,
    top: 100,
    stroke: '#334155',
    strokeWidth: 4,
    strokeUniform: true, // Fix for distortion
    objectCaching: false,
  });
  // Lines typically don't use fill, but keeping a default property structure is fine
  canvas.add(line);
  canvas.setActiveObject(line);
  canvas.requestRenderAll();
};


// --- Updaters ---

export const updateObjectDataKey = async (obj: fabric.Object, key: string) => {
  (obj as any).dataKey = key;
  // Preserve current color
  const color = (obj.fill as string) || '#000000';
  
  if (obj.type === 'i-text' || obj.type === 'text') {
    (obj as fabric.IText).set('text', `{{${key}}}`);
    obj.canvas?.requestRenderAll();
  } 
  else if (obj.type === 'image') {
    const imgObj = obj as fabric.Image;
    if ((imgObj as any).isBarcode) {
        const newDataUrl = getBarcodeDataUrl(`{{${key}}}`, color);
        const tempImg = new Image();
        tempImg.src = newDataUrl;
        tempImg.onload = () => {
            imgObj.setElement(tempImg);
            imgObj.set({ stroke: undefined });
            imgObj.canvas?.requestRenderAll();
        }
    } else if ((imgObj as any).isQrCode) {
        const newDataUrl = await getQrDataUrl(`{{${key}}}`, color);
        const tempImg = new Image();
        tempImg.src = newDataUrl;
        tempImg.onload = () => {
            imgObj.setElement(tempImg);
            imgObj.set({ stroke: undefined });
            imgObj.canvas?.requestRenderAll();
        }
    }
  }
};

export const updateObjectColor = async (obj: fabric.Object, color: string) => {
  obj.set('fill', color);
  
  if (obj.type === 'image') {
     const key = (obj as any).dataKey || ' ';
     const imgObj = obj as fabric.Image;
     
     if ((obj as any).isBarcode) {
         const newDataUrl = getBarcodeDataUrl(`{{${key}}}`, color);
         const tempImg = new Image();
         tempImg.src = newDataUrl;
         tempImg.onload = () => {
             imgObj.setElement(tempImg);
             imgObj.set({ stroke: undefined });
             imgObj.canvas?.requestRenderAll();
         };
     } else if ((obj as any).isQrCode) {
         const newDataUrl = await getQrDataUrl(`{{${key}}}`, color);
         const tempImg = new Image();
         tempImg.src = newDataUrl;
         tempImg.onload = () => {
             imgObj.setElement(tempImg);
             imgObj.set({ stroke: undefined });
             imgObj.canvas?.requestRenderAll();
         };
     }
  }
  
  obj.canvas?.requestRenderAll();
};

export const updateObjectStroke = (obj: fabric.Object, color: string) => {
  obj.set('stroke', color);
  obj.canvas?.requestRenderAll();
};

export const updateObjectStrokeWidth = (obj: fabric.Object, width: number) => {
  obj.set('strokeWidth', width);
  obj.canvas?.requestRenderAll();
};

export const serializeCanvas = (canvas: fabric.Canvas): LabelObject[] => {
  // Include standard properties plus our custom ones
  // Note: stroke, strokeWidth, fill are included by standard toObject call usually, 
  // but explicitly ensuring our custom logic works is good.
  const json = canvas.toObject(['dataKey', 'isBarcode', 'isQrCode', 'id', 'stroke', 'strokeWidth', 'strokeUniform']);
  return json.objects || [];
};

/**
 * Generates a Data URL for a single label with specific data injected.
 */
export const generateLabelImage = async (
  template: LabelTemplate, 
  dataRow: Record<string, string> | null
): Promise<string> => {
  // Create a headless canvas
  const el = document.createElement('canvas');
  
  // Detect unit and convert to pixels correctly
  let widthPx = INCH_TO_PX(template.dimensions.width);
  let heightPx = INCH_TO_PX(template.dimensions.height);

  // If unit is CM or MM, convert to inches first because INCH_TO_PX expects inches
  // Note: App.tsx stores the raw value in the unit.
  if (template.dimensions.unit === 'cm') {
    widthPx = INCH_TO_PX(template.dimensions.width / 2.54);
    heightPx = INCH_TO_PX(template.dimensions.height / 2.54);
  } else if (template.dimensions.unit === 'mm') {
    widthPx = INCH_TO_PX(template.dimensions.width / 25.4);
    heightPx = INCH_TO_PX(template.dimensions.height / 25.4);
  }

  // High multiplier for PDF export quality
  const staticCanvas = new fabric.StaticCanvas(el, {
    width: widthPx,
    height: heightPx,
    backgroundColor: '#ffffff', // Initial set
    enableRetinaScaling: true
  });

  await staticCanvas.loadFromJSON(template);
  
  // FIX: Force white background after loadFromJSON
  staticCanvas.backgroundColor = '#ffffff';

  if (dataRow) {
    const objects = staticCanvas.getObjects();
    
    const updates = objects.map(async (obj) => {
      const key = (obj as any).dataKey;
      // Get the color from the object itself (loaded from JSON)
      const color = (obj.fill as string) || '#000000';

      if (key && dataRow[key] !== undefined) {
        const value = dataRow[key];

        // Text
        if (obj.type === 'i-text' || obj.type === 'text') {
           (obj as fabric.Text).set('text', value);
           // REMOVED: (obj as fabric.Text).set('fill', '#000000'); 
           // We now trust the 'fill' that came with the object from loadFromJSON
        }
        
        // Barcode
        if (obj.type === 'image' && (obj as any).isBarcode) {
            const barcodeUrl = getBarcodeDataUrl(value || ' ', color);
            const imgEl = document.createElement('img');
            imgEl.src = barcodeUrl;
            await new Promise(resolve => { imgEl.onload = resolve; });
            (obj as fabric.Image).setElement(imgEl);
            (obj as fabric.Image).set({ stroke: undefined });
        }

        // QR Code
        if (obj.type === 'image' && (obj as any).isQrCode) {
            const qrUrl = await getQrDataUrl(value || ' ', color);
            const imgEl = document.createElement('img');
            imgEl.src = qrUrl;
            await new Promise(resolve => { imgEl.onload = resolve; });
            (obj as fabric.Image).setElement(imgEl);
            (obj as fabric.Image).set({ stroke: undefined });
        }
      }
    });

    await Promise.all(updates);
  }

  staticCanvas.renderAll();
  
  // Export using PNG for lossless quality and compatibility
  const dataUrl = staticCanvas.toDataURL({
    format: 'png',
    multiplier: 3
  });

  staticCanvas.dispose();
  el.remove();
  
  return dataUrl;
};