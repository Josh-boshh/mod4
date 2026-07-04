export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select';

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for 'select'
  rows?: number; // for 'textarea'
  imagePreview?: boolean; // renders a thumbnail below the input
  documentUpload?: boolean; // renders an "Upload document" button (PDF/DOC/XLS/ZIP)
};
