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
  conversionTime: number;
  files: ConvertApiFileResult[];
}

export interface ConvertApiRawConversionResponse {
  ConversionCost: number;
  ConversionTime: number;
  Files: Array<{
    FileName: string;
    FileExt: string;
    FileSize: number;
    FileId?: string;
    Url?: string;
    FileData?: string;
  }>;
}

export interface ConvertApiUploadResponse {
  fileId: string;
  fileName: string;
  fileExt: string;
}

export interface ConvertApiRawUploadResponse {
  FileId: string;
  FileName: string;
  FileExt: string;
}

export interface ConvertApiUserInfo {
  secret: string;
  apiKey: number;
  active: boolean;
  fullName: string;
  email: string;
  conversionsTotal: number;
  conversionsConsumed: number;
}

export interface ConvertApiRawUserInfo {
  Secret: string;
  ApiKey: number;
  Active: boolean;
  FullName: string;
  Email: string;
  ConversionsTotal: number;
  ConversionsConsumed: number;
}

export interface ConvertApiAsyncJobResponse {
  jobId: string;
}

export interface ConvertApiRawAsyncJobResponse {
  JobId: string;
}

export interface ConverterInfo {
  name: string;
  sourceFormat: string;
  destinationFormat: string;
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
