
export interface LabelDimensions {
  width: number;
  height: number;
  unit: 'inch' | 'mm' | 'px' | 'cm';
}

export interface LabelObject {
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeUniform?: boolean; // New property for uniform stroke scaling
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  dataKey?: string; // The crucial binding key
  isBarcode?: boolean;
  isQrCode?: boolean; // New property
  src?: string; // For images
}

export interface LabelTemplate {
  templateName: string;
  dimensions: LabelDimensions;
  objects: LabelObject[];
}

export interface DataField {
  label: string;
  value: string;
}

export interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  rows: number;
  cols: number;
  gapX: number;
  gapY: number;
}

export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
}

export interface SavedTemplateMetadata {
  id: string;
  name: string;
  updatedAt: number;
}
