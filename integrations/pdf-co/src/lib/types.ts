export interface PdfCoBaseResponse {
  error: boolean;
  status: number;
  credits: number;
  remainingCredits: number;
  duration: number;
  name?: string;
  message?: string;
}

export interface PdfCoFileResponse extends PdfCoBaseResponse {
  url: string;
  pageCount: number;
  outputLinkValidTill?: string;
}

export interface PdfCoSplitResponse extends PdfCoBaseResponse {
  urls: string[];
  pageCount: number;
}

export interface PdfCoInlineResponse extends PdfCoBaseResponse {
  body: any;
  pageCount: number;
}

export interface PdfCoJobResponse extends PdfCoBaseResponse {
  jobId: string;
  url?: string;
}

export interface PdfCoJobCheckResponse {
  jobId: string;
  status: string;
  error: boolean;
  message?: string;
  url?: string;
  pageCount?: number;
  outputLinkValidTill?: string;
  jobDuration?: number;
  credits: number;
  remainingCredits: number;
  duration: number;
}

export interface PdfCoInfoResponse extends PdfCoBaseResponse {
  info: {
    PageCount: number;
    Author: string;
    Title: string;
    Producer: string;
    Subject: string;
    CreationDate: string;
    ModificationDate: string;
    Encrypted: boolean;
    PermissionPrinting: boolean;
    PermissionModifyDocument: boolean;
    PermissionContentExtraction: boolean;
    PermissionFillForms: boolean;
    PermissionModifyAnnotations: boolean;
    [key: string]: any;
  };
}

export interface PdfCoBarcodeReadResponse extends PdfCoBaseResponse {
  barcodes: Array<{
    Value: string;
    RawValue?: string;
    Type: number;
    TypeName: string;
    Confidence?: number;
    Page: number;
    Rect: string;
    [key: string]: any;
  }>;
  pageCount: number;
}

export interface PdfCoFindTextResponse extends PdfCoBaseResponse {
  body: Array<{
    text: string;
    left: number;
    top: number;
    width: number;
    height: number;
    pageIndex: number;
    [key: string]: any;
  }>;
  pageCount: number;
}

export interface PdfCoClassifierResponse extends PdfCoBaseResponse {
  body: {
    classes: Array<{ class: string }>;
  };
  pageCount: number;
}

export interface PdfCoDocumentParserResponse extends PdfCoBaseResponse {
  body: any;
  pageCount: number;
}

export interface PdfCoUploadResponse {
  url: string;
  presignedUrl?: string;
  error: boolean;
  status: number;
  remainingCredits: number;
}
