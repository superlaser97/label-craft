import { LabelTemplate, SavedTemplateMetadata } from '../types';

const INDEX_KEY = 'labelcraft_library_index';
const TEMPLATE_PREFIX = 'labelcraft_template_';

// Helper to generate simple ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const getSavedTemplates = (): SavedTemplateMetadata[] => {
  try {
    const indexStr = localStorage.getItem(INDEX_KEY);
    return indexStr ? JSON.parse(indexStr) : [];
  } catch (e) {
    console.error("Failed to load template index", e);
    return [];
  }
};

export const saveTemplateToBrowser = (template: LabelTemplate): SavedTemplateMetadata => {
  const templates = getSavedTemplates();
  const id = generateId();
  
  const metadata: SavedTemplateMetadata = {
    id,
    name: template.templateName,
    updatedAt: Date.now()
  };

  try {
    // Save data
    localStorage.setItem(`${TEMPLATE_PREFIX}${id}`, JSON.stringify(template));

    // Update index (add to top)
    const newIndex = [metadata, ...templates];
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
    
    return metadata;
  } catch (e) {
    console.error("Storage limit reached or error saving", e);
    throw new Error("Failed to save template. Local storage might be full.");
  }
};

export const loadTemplateFromBrowser = (id: string): LabelTemplate | null => {
  try {
    const dataStr = localStorage.getItem(`${TEMPLATE_PREFIX}${id}`);
    return dataStr ? JSON.parse(dataStr) : null;
  } catch (e) {
    console.error("Failed to load template", e);
    return null;
  }
};

export const deleteTemplateFromBrowser = (id: string) => {
  const templates = getSavedTemplates();
  const newIndex = templates.filter(t => t.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
  localStorage.removeItem(`${TEMPLATE_PREFIX}${id}`);
};
