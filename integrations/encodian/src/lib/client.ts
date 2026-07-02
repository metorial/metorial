import { createAxios } from 'slates';

let axiosInstance = createAxios({
  baseURL: 'https://api.apps-encodian.com/api/v1'
});

export interface EncodianBaseResponse {
  HttpStatusCode: number;
  HttpStatusMessage: string;
  OperationId: string;
  Errors: string[];
  OperationStatus: string;
}

export interface EncodianFileResponse extends EncodianBaseResponse {
  Filename: string;
  FileContent: string;
}

export interface EncodianMultiFileResponse extends EncodianBaseResponse {
  documents: Array<{ fileName: string; fileContent: string }>;
}

export interface EncodianStringResponse extends EncodianBaseResponse {
  result: string;
}

export class Client {
  constructor(private token: string) {}

  private get headers() {
    return {
      'X-ApiKey': this.token,
      'Content-Type': 'application/json'
    };
  }

  async post<T = any>(
    path: string,
    body: Record<string, any>,
    queryParams?: Record<string, string>
  ): Promise<T> {
    let url = path;
    if (queryParams) {
      let params = new URLSearchParams(queryParams);
      url = `${path}?${params.toString()}`;
    }

    let response = await axiosInstance.post(url, body, {
      headers: this.headers
    });

    return response.data as T;
  }

  async get<T = any>(path: string, queryParams?: Record<string, string>): Promise<T> {
    let url = path;
    if (queryParams) {
      let params = new URLSearchParams(queryParams);
      url = `${path}?${params.toString()}`;
    }

    let response = await axiosInstance.get(url, {
      headers: this.headers
    });

    return response.data as T;
  }

  // PDF Operations
  async mergePdfFiles(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/MergeArrayOfDocumentsToPdf', body);
  }

  async splitPdf(body: Record<string, any>): Promise<EncodianMultiFileResponse> {
    return this.post<EncodianMultiFileResponse>('/PDF/SplitDocument', body);
  }

  async compressPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/CompressPdf', body);
  }

  async addTextWatermarkToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/AddTextWatermark', body);
  }

  async addImageWatermarkToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/AddImageWatermark', body);
  }

  async ocrPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/OcrPdfDocument', body);
  }

  async aiOcrPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/AIOcrPdfDocument', body);
  }

  async extractPdfText(body: Record<string, any>): Promise<any> {
    return this.post('/PDF/GetPdfTextLayer', body);
  }

  async extractPdfTextByPage(body: Record<string, any>): Promise<any> {
    return this.post('/PDF/PdfExtractTextByPage', body);
  }

  async fillPdfForm(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/FillPdfForm', body);
  }

  async addPageNumbersToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/AddPageNumbers', body);
  }

  async extractPdfPages(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/ExtractPdfPages', body);
  }

  async deletePdfPages(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/DeletePdfPages', body);
  }

  async getPdfMetadata(body: Record<string, any>): Promise<any> {
    return this.post('/PDF/GetPdfDocumentInfo', body);
  }

  async securePdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/SecurePdfDocument', body);
  }

  async unlockPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/UnlockPdfDocument', body);
  }

  async addHtmlHeaderFooterToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/AddHtmlHeaderFooter', body);
  }

  async flattenPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/FlattenPdf', body);
  }

  async redactPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/RedactPdf', body);
  }

  async searchAndReplacePdfText(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/PdfSearchAndReplaceText', body);
  }

  async extractPdfFormData(body: Record<string, any>): Promise<any> {
    return this.post('/PDF/GetPdfFormData', body);
  }

  async extractPdfTableData(body: Record<string, any>): Promise<any> {
    return this.post('/PDF/PdfExtractTableData', body);
  }

  async rotatePdfPages(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/RotatePdfPages', body);
  }

  async insertHtmlToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/PDF/InsertHtmlToPdf', body);
  }

  async extractPdfImages(body: Record<string, any>): Promise<EncodianMultiFileResponse> {
    return this.post<EncodianMultiFileResponse>('/PDF/ExtractImagesAll', body);
  }

  // Conversion Operations
  async convertFileToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/BasicConversion', body);
  }

  async convertHtmlToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/HtmlToPDFV2', body);
  }

  async convertHtmlToWord(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/HtmlToWord', body);
  }

  async convertHtmlToImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/HtmlToImage', body);
  }

  async convertPdfToWord(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertPdfToWord', body);
  }

  async convertPdfToExcel(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertPdfToExcel', body);
  }

  async convertPdfToImages(body: Record<string, any>): Promise<EncodianMultiFileResponse> {
    return this.post<EncodianMultiFileResponse>('/Conversion/ConvertPdfToImages', body);
  }

  async convertPdfToPdfa(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertToPdfA', body);
  }

  async convertWord(
    body: Record<string, any>,
    outputFormat: string
  ): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertWord', body, {
      outputFormatParameter: outputFormat
    });
  }

  async convertExcel(
    body: Record<string, any>,
    outputFormat: string
  ): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertExcel', body, {
      outputFormatParameter: outputFormat
    });
  }

  async convertPowerPoint(
    body: Record<string, any>,
    outputFormat: string
  ): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertPowerPoint', body, {
      outputFormatParameter: outputFormat
    });
  }

  async convertJsonToExcel(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/ConvertJsonToExcel', body);
  }

  async convertTextToPdf(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Conversion/TextToPDF', body);
  }

  // Word Operations
  async populateWordDocument(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/PopulateWordDocument', body);
  }

  async mergeWordDocuments(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/MergeArrayOfDocumentsToWord', body);
  }

  async wordSearchAndReplace(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/WordSearchAndReplaceText', body);
  }

  async extractTextFromWord(body: Record<string, any>): Promise<any> {
    return this.post('/Word/GetTextFromWord', body);
  }

  async addTextWatermarkToWord(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/AddTextWatermarkWord', body);
  }

  async addImageWatermarkToWord(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/AddImageWatermarkWord', body);
  }

  async addHtmlHeaderFooterToWord(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/AddHtmlHeaderFooterWord', body);
  }

  async secureWordDocument(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/SecureWordDocument', body);
  }

  async unlockWordDocument(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Word/WordUnlock', body);
  }

  // Excel Operations
  async populateExcel(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Excel/PopulateExcel', body);
  }

  async addRowsToExcel(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Excel/AddRowsToExcel', body);
  }

  async getRowsFromExcel(body: Record<string, any>): Promise<any> {
    return this.post('/Excel/GetRowsFromExcel', body);
  }

  async mergeExcelFiles(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Excel/MergeArrayOfExcelDocuments', body);
  }

  async excelReplaceText(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Excel/ExcelReplaceText', body);
  }

  // Image Operations
  async convertImageFormat(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/ImageConvertFormat', body);
  }

  async compressImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/CompressImage', body);
  }

  async resizeImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/ResizeImage', body);
  }

  async cropImage(body: Record<string, any>, cropType: string): Promise<any> {
    return this.post('/Image/CropImage', body, { cropTypeParameter: cropType });
  }

  async rotateImage(body: Record<string, any>): Promise<any> {
    return this.post('/Image/RotateImage', body);
  }

  async flipImage(body: Record<string, any>): Promise<any> {
    return this.post('/Image/FlipImage', body);
  }

  async addTextWatermarkToImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/AddTextWatermarkToImage', body);
  }

  async addImageWatermarkToImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/AddImageWatermarkToImage', body);
  }

  async getImageMetadata(body: Record<string, any>): Promise<any> {
    return this.post('/Image/GetImageInfo', body);
  }

  async extractTextFromImage(body: Record<string, any>): Promise<any> {
    return this.post('/Image/ImageExtractText', body);
  }

  async cleanUpDocumentImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/ImageCleanUpDocument', body);
  }

  async cleanUpPhotoImage(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/ImageCleanUpPhoto', body);
  }

  async removeExifTags(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Image/ImageRemoveExifTags', body);
  }

  // Barcode Operations
  async createBarcode(
    body: Record<string, any>,
    barcodeType: string
  ): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Barcodes/CreateBarcode', body, {
      barcodeTypeParameter: barcodeType
    });
  }

  async createQrCode(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/Barcodes/CreateQrCode', body);
  }

  async readBarcodeFromDocument(body: Record<string, any>): Promise<any> {
    return this.post('/Barcodes/ReadBarcodeFromDocument', body);
  }

  async readBarcodeFromImage(body: Record<string, any>): Promise<any> {
    return this.post('/Barcodes/ReadBarcodeFromImage', body);
  }

  async readQrCodeFromDocument(body: Record<string, any>): Promise<any> {
    return this.post('/Barcodes/ReadQrCodeFromDocument', body);
  }

  async readQrCodeFromImage(body: Record<string, any>): Promise<any> {
    return this.post('/Barcodes/ReadQrCodeFromImage', body);
  }

  // AI Operations
  async aiProcessDocument(
    documentType: string,
    body: Record<string, any>
  ): Promise<EncodianStringResponse> {
    return this.post<EncodianStringResponse>(`/General/${documentType}`, body);
  }

  async aiTranslateText(body: Record<string, any>): Promise<any> {
    return this.post('/General/AITranslateText', body);
  }

  async aiTranslateFile(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/General/AITranslateFile', body);
  }

  async aiSpeechToText(body: Record<string, any>): Promise<any> {
    return this.post('/General/AISpeechToText', body);
  }

  async aiRunPrompt(body: Record<string, any>): Promise<any> {
    return this.post('/General/AIRunPromptText', body);
  }

  // Archive Operations
  async createZipArchive(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/General/AddToZip', body);
  }

  async extractFromArchive(body: Record<string, any>): Promise<EncodianMultiFileResponse> {
    return this.post<EncodianMultiFileResponse>('/General/ExtractFromArchiveV2', body);
  }

  // Email Operations
  async getEmailAttachments(body: Record<string, any>): Promise<EncodianMultiFileResponse> {
    return this.post<EncodianMultiFileResponse>('/General/GetEmailAttachments', body);
  }

  async getEmailMetadata(body: Record<string, any>): Promise<any> {
    return this.post('/General/GetEmailInfo', body);
  }

  // General Operations
  async searchAndReplaceText(body: Record<string, any>): Promise<EncodianFileResponse> {
    return this.post<EncodianFileResponse>('/General/SearchAndReplaceText', body);
  }

  // Utility Operations
  async utilityPost<T = any>(
    path: string,
    body: Record<string, any>,
    queryParams?: Record<string, string>
  ): Promise<T> {
    return this.post<T>(`/Utilities/${path}`, body, queryParams);
  }

  // Subscription
  async getSubscriptionStatus(): Promise<any> {
    return this.get('/General/GetSubscriptionStatus');
  }
}
