import { DataField } from './types';

export const DPI = 96; // Standard screen DPI for calculation

export const INCH_TO_PX = (inches: number) => inches * DPI;
export const PX_TO_INCH = (px: number) => px / DPI;

export const AVAILABLE_FIELDS: DataField[] = [
  { label: 'Product Name', value: 'productName' },
  { label: 'SKU Number', value: 'skuNumber' },
  { label: 'Price', value: 'price' },
  { label: 'Description', value: 'description' },
  { label: 'Manufacturer', value: 'manufacturer' },
  { label: 'Expiry Date', value: 'expiryDate' },
];

export const AVAILABLE_FONTS = [
  'Arial',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Impact',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
];

export const DEFAULT_LABEL_SIZE = {
  width: 4, // inches
  height: 6, // inches
};

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  canvasBg: '#ffffff',
  grid: '#e2e8f0',
};