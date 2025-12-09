import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CsvData, LabelObject } from "../types";
import { INCH_TO_PX } from "../constants";

// Initialize Gemini Client
// Note: In a real production app, this call would likely happen via a backend proxy to protect the key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartLayout = async (
  csvData: CsvData,
  widthInches: number,
  heightInches: number,
  unit: string
): Promise<LabelObject[]> => {
  if (!csvData.headers.length || !csvData.rows.length) {
    throw new Error("No data available to generate layout.");
  }

  // Calculate pixel dimensions (96 DPI) for the AI to position elements
  const widthPx = Math.round(INCH_TO_PX(widthInches));
  const heightPx = Math.round(INCH_TO_PX(heightInches));

  const headers = csvData.headers;
  const sampleRow = csvData.rows[0];

  // Define the expected JSON Schema for the model
  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: "Must be 'i-text' for text or 'image' for barcodes/QR." },
        left: { type: Type.NUMBER, description: "X coordinate in pixels." },
        top: { type: Type.NUMBER, description: "Y coordinate in pixels." },
        fontSize: { type: Type.NUMBER, description: "Font size (default around 20-40)." },
        dataKey: { type: Type.STRING, description: "The CSV header this element binds to." },
        isBarcode: { type: Type.BOOLEAN, description: "True if this should be a barcode." },
        isQrCode: { type: Type.BOOLEAN, description: "True if this should be a QR code." },
        textAlign: { type: Type.STRING, description: "'left', 'center', or 'right'" },
        fontFamily: { type: Type.STRING, description: "Font family name." },
        fontWeight: { type: Type.STRING, description: "'normal' or 'bold'" }
      },
      required: ["type", "left", "top", "dataKey"]
    }
  };

  const prompt = `
    You are an expert graphic designer for shipping labels, inventory tags, and product stickers.
    
    Canvas Dimensions: ${widthInches} ${unit} wide x ${heightInches} ${unit} high (${widthPx}px x ${heightPx}px).
    
    Data Columns (Headers): ${JSON.stringify(headers)}
    Sample Data: ${JSON.stringify(sampleRow)}

    Task: Create a professional, balanced layout using the available data columns.
    
    Rules:
    1. Analyze the Sample Data to determine the best element type:
       - If data looks like a URL (http/www), make it a QR Code (isQrCode: true, type: 'image').
       - If data looks like an ID, SKU, UPC, or tracking number (alphanumeric, 6-15 chars), make it a Barcode (isBarcode: true, type: 'image').
       - If data is a Price or Product Name, make it 'i-text' with larger fontSize and bold.
       - If data is a description, make it 'i-text' with smaller fontSize.
    2. Position elements (left/top) so they do not overlap and fit within ${widthPx}x${heightPx}.
    3. Use 'i-text' for all text elements.
    4. Use 'image' for Barcode or QR Code elements.
    5. Align key information (like Product Name) centrally or prominently.
    6. Ensure the 'dataKey' matches exactly one of the provided headers.
    
    Return ONLY a JSON array of objects representing the layout.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4, // Lower temperature for more structured/predictable layouts
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      // Post-processing to ensure compatibility
      return parsed.map((obj: any) => ({
        ...obj,
        fill: '#000000', // Default color
        originX: 'left',
        originY: 'top',
        // Ensure image placeholders have dimensions if Fabric needs them initially
        width: obj.type === 'image' ? 100 : undefined,
        height: obj.type === 'image' ? 100 : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error("AI Layout Generation Error:", error);
    throw error;
  }
};
