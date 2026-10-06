export interface ConvertApiFileResult {
  fileName: string;
  fileExt: string;
  fileSize: number;
  fileId: string | null;
  url: string | null;
  fileData: string | null;
}

export interface ConvertApiConversionResponse {
  conversionCost: number;
  conversionTime?: number;
  files: ConvertApiFileResult[];
}

export interface ConvertApiUploadResponse {
  fileId: string;
  fileName: string;
  fileExt: string;
}

export interface ConvertApiUserInfo {
  apiKey?: number;
  active: boolean;
  fullName: string;
  email: string;
  conversionsTotal: number;
  conversionsConsumed: number;
}

export interface ConvertApiAsyncJobResponse {
  jobId: string;
}

export interface ConverterParameter {
  name: string;
  type: string;
  required: boolean;
  array: boolean;
  description: string | null;
  defaultValue: string | null;
}
export interface ConverterInfo {
  sourceFormat: string;
  destinationFormat: string;
  converterSourceFormat?: string;
  converterSourceFormats?: string[];
  converterDestinationFormats?: string[];
  converterDestinationFormat?: string;
  parameters?: ConverterParameter[];
}

export interface ConvertApiParameter {
  Name: string;
  Value?: string;
  FileValue?: ConvertApiFileInput;
  FileValues?: ConvertApiFileInput[];
}

export interface ConvertApiFileInput {
  Name?: string;
  Data?: string;
  Url?: string;
  Id?: string;
}

export type FileSource =
  | { type: 'url'; url: string }
  | { type: 'fileId'; fileId: string }
  | { type: 'base64'; fileName: string; data: string };
