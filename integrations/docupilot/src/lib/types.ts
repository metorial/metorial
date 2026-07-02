export interface DocupilotTemplate {
  id: number;
  title: string;
  description?: string | null;
  type:
    | 'docx'
    | 'html'
    | 'fillable_pdf'
    | 'pptx'
    | 'xlsx'
    | 'g_document'
    | 'g_presentation'
    | 'g_spreadsheet';
  document_status?: 'active' | 'test';
  created_time: string;
  updated_time: string | null;
  deleted_time: string | null;
  use_v2_editor: boolean;
  created_by: number;
  updated_by: number | null;
  has_docusign_delivery: boolean;
  folder?: DocupilotFolder | null;
  preferences?: DocupilotTemplateSettings;
}

export interface DocupilotTemplateSettings {
  margin?: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null;
  timezone?: string;
  output_file_name?: string;
  output_type?: 'html' | 'pdf' | 'jpeg' | 'png' | 'docx' | 'pptx' | 'xlsx';
  password?: string | null;
  format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid' | 'Custom';
  orientation?: 'portrait' | 'landscape';
  header?: string | null;
  footer?: string | null;
  width?: number | null;
  height?: number | null;
  auto_number?: number | null;
  flatten_pdf?: boolean;
  emulate_mode?: 'print' | 'screen' | null;
}

export interface DocupilotFolder {
  id: number;
  name: string;
  created_time: string | null;
  updated_time: string | null;
  created_by: number;
  updated_by: number | null;
}

export interface DocupilotPaginatedList<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DocupilotTemplateSchema {
  name: string;
  type: string;
  description?: string;
  children?: DocupilotTemplateSchema[];
}

export interface DocupilotGenerateResponse {
  file_url?: string;
  file_name?: string;
}

export interface DocupilotTemplateDelivery {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  template: number;
  [key: string]: unknown;
}

export interface DocupilotMergeHistory {
  id: number;
  template: number;
  template_title?: string;
  status: 'success' | 'error' | 'pending';
  created_time: string;
  file_url?: string;
  file_name?: string;
  [key: string]: unknown;
}

export interface DocupilotContentBlock {
  id: number;
  title: string;
  key: string;
  description?: string | null;
  type: string;
  created_time: string;
  updated_time: string | null;
  created_by: number;
  updated_by: number | null;
  [key: string]: unknown;
}

export interface DocupilotEnvelope {
  id: number;
  title?: string;
  status: string;
  created_time: string;
  updated_time?: string | null;
  [key: string]: unknown;
}

export interface DocupilotEnvelopeDetail {
  id: number;
  title?: string;
  status: string;
  created_time: string;
  updated_time?: string | null;
  recipients?: DocupilotRecipient[];
  documents?: DocupilotEnvelopeDocument[];
  [key: string]: unknown;
}

export interface DocupilotRecipient {
  id: number;
  name: string;
  email: string;
  role?: string;
  status?: string;
  [key: string]: unknown;
}

export interface DocupilotEnvelopeDocument {
  id: number;
  name?: string;
  [key: string]: unknown;
}

export interface DocupilotDocumentMergeLink {
  id: number;
  url: string;
  [key: string]: unknown;
}
