import { createAxios } from 'slates';
import { pdf4meUpstreamError, toPdf4meServiceError } from './errors';

let BASE_URL = 'https://api.pdf4me.com';

type Pdf4meFileResult = {
  fileContent: string;
  fileName: string;
};

type Pdf4meRawFileResult = {
  fileContent?: string;
  fileName?: string;
  docContent?: string;
  docName?: string;
  FileContent?: string;
  FileName?: string;
  'File Content'?: string;
  'File Name'?: string;
};

let normalizeAuthorization = (token: string) => {
  let trimmedToken = token.trim();

  if (/^(Basic|Bearer)\s+/i.test(trimmedToken)) {
    return trimmedToken;
  }

  return `Basic ${Buffer.from(trimmedToken, 'utf8').toString('base64')}`;
};

let normalizeFileResult = (
  data: Pdf4meRawFileResult,
  fallbackFileName: string,
  operation: string
): Pdf4meFileResult => {
  let fileContent =
    data.fileContent ?? data.docContent ?? data.FileContent ?? data['File Content'];
  let fileName = data.fileName ?? data.docName ?? data.FileName ?? data['File Name'];

  if (!fileContent) {
    throw pdf4meUpstreamError(`${operation}: PDF4me did not return file content.`);
  }

  return {
    fileContent,
    fileName: fileName || fallbackFileName
  };
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: normalizeAuthorization(config.token)
      }
    });
  }

  private async post<T>(operation: string, path: string, params: unknown): Promise<T> {
    try {
      let response = await this.axios.post(path, params);
      return response.data as T;
    } catch (error) {
      throw toPdf4meServiceError(error, operation);
    }
  }

  private async postFile(
    operation: string,
    path: string,
    params: unknown,
    fallbackFileName: string
  ): Promise<Pdf4meFileResult> {
    let data = await this.post<Pdf4meRawFileResult>(operation, path, params);
    return normalizeFileResult(data, fallbackFileName, operation);
  }

  private async postBinaryFile(
    operation: string,
    path: string,
    params: unknown,
    fallbackFileName: string
  ): Promise<Pdf4meFileResult> {
    try {
      let response = await this.axios.post(path, params, { responseType: 'arraybuffer' });
      let contentType = String(response.headers?.['content-type'] ?? '');
      let buffer = Buffer.from(response.data);

      if (contentType.includes('application/json')) {
        let data = JSON.parse(buffer.toString('utf8')) as Pdf4meRawFileResult;
        return normalizeFileResult(data, fallbackFileName, operation);
      }

      return {
        fileContent: buffer.toString('base64'),
        fileName: fallbackFileName
      };
    } catch (error) {
      throw toPdf4meServiceError(error, operation);
    }
  }

  async convertToPdf(params: {
    docContent: string;
    docName: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert to PDF failed',
      '/api/v2/ConvertToPdf',
      params,
      'converted.pdf'
    );
  }

  async convertMarkdownToPdf(params: {
    docContent: string;
    docName: string;
    mdFilePath?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert Markdown to PDF failed',
      '/api/v2/ConvertMdToPdf',
      params,
      'converted.pdf'
    );
  }

  async convertHtmlToPdf(params: {
    docContent: string;
    docName: string;
    indexFilePath?: string;
    layout?: string;
    format?: string;
    scale?: number;
    topMargin?: string;
    bottomMargin?: string;
    leftMargin?: string;
    rightMargin?: string;
    printBackground?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert HTML to PDF failed',
      '/api/v2/ConvertHtmlToPdf',
      params,
      'converted.pdf'
    );
  }

  async convertUrlToPdf(params: {
    webUrl: string;
    authType?: string;
    username?: string;
    password?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert URL to PDF failed',
      '/api/v2/ConvertUrlToPdf',
      params,
      'converted.pdf'
    );
  }

  async convertPdfToWord(params: {
    docContent: string;
    docName: string;
    qualityType: string;
    language?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert PDF to Word failed',
      '/api/v2/ConvertPdfToWord',
      params,
      'converted.docx'
    );
  }

  async convertPdfToExcel(params: {
    docContent: string;
    docName: string;
    qualityType: string;
    language?: string;
    mergeAllSheets?: boolean;
    outputFormat?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert PDF to Excel failed',
      '/api/v2/ConvertPdfToExcel',
      params,
      'converted.xlsx'
    );
  }

  async convertPdfToPowerPoint(params: {
    docContent: string;
    docName: string;
    qualityType?: string;
    language?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert PDF to PowerPoint failed',
      '/api/v2/ConvertPdfToPowerPoint',
      params,
      'converted.pptx'
    );
  }

  async merge(params: { docContent: string[]; docName: string }): Promise<Pdf4meFileResult> {
    return this.postFile('Merge PDFs failed', '/api/v2/Merge', params, params.docName);
  }

  async splitPdf(params: {
    docContent: string;
    docName: string;
    splitAction: string;
    splitActionNumber?: number;
    splitSequence?: number[];
    splitRanges?: string;
    fileNaming?: string;
  }): Promise<{ splitedDocuments: Array<{ fileName: string; streamFile: string }> }> {
    return this.post('Split PDF failed', '/api/v2/SplitPdf', params);
  }

  async splitByText(params: {
    docContent: string;
    docName: string;
    text: string;
    splitTextPage: string;
    fileNaming?: string;
  }): Promise<{
    splitedDocuments: Array<{ fileName: string; docText: string; streamFile: string }>;
  }> {
    return this.post('Split PDF by text failed', '/api/v2/SplitByText', params);
  }

  async splitByBarcode(params: {
    docContent: string;
    docName: string;
    barcodeFilter: string;
    barcodeString: string;
    barcodeType: string;
    splitBarcodePage: string;
    combinePagesWithSameConsecutiveBarcodes?: boolean;
    pdfRenderDpi?: string;
  }): Promise<{
    splitedDocuments: Array<{ fileName: string; barcodeText: string; streamFile: string }>;
  }> {
    return this.post('Split PDF by barcode failed', '/api/v2/SplitByBarcode', params);
  }

  async optimize(params: {
    docContent: string;
    docName: string;
    optimizeProfile: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Compress PDF failed', '/api/v2/Optimize', params, params.docName);
  }

  async extractResources(params: {
    docContent: string;
    docName: string;
    extractText?: boolean;
    extractImage?: boolean;
  }): Promise<{ texts: string[]; images: Array<{ fileName: string; streamFile: string }> }> {
    return this.post('Extract resources failed', '/api/v2/ExtractResources', {
      docContent: params.docContent,
      docName: params.docName,
      extractText: params.extractText ?? true,
      extractImage: params.extractImage ?? false
    });
  }

  async extractTable(params: {
    docContent: string;
    docName: string;
  }): Promise<{ tableList: Array<{ pageNumber: number; table: string[][] }> }> {
    return this.post('Extract table failed', '/api/v2/ExtractTable', params);
  }

  async extractTextByExpression(params: {
    docContent: string;
    docName: string;
    expression: string;
    pageSequence: string;
  }): Promise<{ textList: string[] }> {
    return this.post(
      'Extract text by expression failed',
      '/api/v2/ExtractTextByExpression',
      params
    );
  }

  async textStamp(params: {
    docContent: string;
    docName: string;
    text: string;
    pages: string;
    alignX: string;
    alignY: string;
    fontSize?: number;
    fontColor?: string;
    isBold?: boolean;
    isItalics?: boolean;
    underline?: boolean;
    marginXInMM?: string;
    marginYInMM?: string;
    opacity?: string;
    rotate?: number;
    isBackground?: boolean;
    showOnlyInPrint?: boolean;
    transverse?: boolean;
    fitTextOverPage?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Add text stamp failed', '/api/v2/Stamp', params, params.docName);
  }

  async imageStamp(params: {
    docContent: string;
    docName: string;
    imageFile: string;
    imageName: string;
    pages: string;
    alignX: string;
    alignY: string;
    heightInMM: string;
    widthInMM: string;
    marginXInMM: string;
    marginYInMM: string;
    opacity: number;
    showOnlyInPrint?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Add image stamp failed',
      '/api/v2/ImageStamp',
      params,
      params.docName
    );
  }

  async signPdf(params: {
    docContent: string;
    docName: string;
    imageFile: string;
    imageName: string;
    alignX: string;
    alignY: string;
    pages?: string;
    widthInMM?: string;
    heightInMM?: string;
    widthInPx?: string;
    heightInPx?: string;
    marginXInMM?: string;
    marginYInMM?: string;
    marginXInPx?: string;
    marginYInPx?: string;
    opacity?: string;
    showOnlyInPrint?: boolean;
    isBackground?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Sign PDF failed', '/api/v2/SignPdf', params, params.docName);
  }

  async addBarcode(params: {
    docContent: string;
    docName: string;
    text: string;
    barcodeType: string;
    pages: string;
    alignX: string;
    alignY: string;
    heightInMM: string;
    widthInMM: string;
    marginXInMM: string;
    marginYInMM: string;
    opacity: number;
    displayText?: string;
    hideText?: boolean;
    isTextAbove?: boolean;
    showOnlyInPrint?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Add barcode failed', '/api/v2/AddBarcode', params, params.docName);
  }

  async createBarcode(params: {
    barcodeType: string;
    text: string;
    hideText?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Create barcode failed',
      '/api/v2/CreateBarcode',
      params,
      'barcode.png'
    );
  }

  async readBarcode(params: {
    docContent: string;
    docName: string;
    barcodeType: string[];
    pages?: string;
  }): Promise<{ barcodes: Array<{ barcodeType: string; Value: string; page: number }> }> {
    return this.post('Read barcode failed', '/api/v2/ReadBarcode', params);
  }

  async protect(params: {
    docContent: string;
    docName: string;
    password: string;
    pdfPermission: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Protect PDF failed', '/api/v2/Protect', params, params.docName);
  }

  async unlock(params: {
    docContent: string;
    docName: string;
    password: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Unlock PDF failed', '/api/v2/Unlock', params, params.docName);
  }

  async ocrPdf(params: {
    docContent: string;
    docName: string;
    qualityType: string;
    ocrWhenNeeded?: string;
    language?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Convert OCR PDF failed',
      '/api/v2/ConvertOcrPdf',
      params,
      params.docName
    );
  }

  async getPdfMetadata(params: { docContent: string; docName: string }): Promise<{
    Title: string;
    Subject: string;
    PageCount: string;
    Author: string;
    Size: string;
    Creator: string;
    Producer: string;
    CreationDate: string;
    ModDate: string;
    IsEncrypted: boolean;
    IsLinearized: boolean;
    PdfCompliance: string;
    IsSigned: boolean;
    PdfVersion: string;
  }> {
    return this.post('Get PDF metadata failed', '/api/v2/GetPdfMetadata', params);
  }

  async createPdfA(params: {
    docContent: string;
    docName: string;
    compliance: string;
    allowUpgrade?: boolean;
    allowDowngrade?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Create PDF/A failed', '/api/v2/PdfA', params, params.docName);
  }

  async rotateDocument(params: {
    docContent: string;
    docName: string;
    rotationType: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Rotate document failed',
      '/api/v2/RotateDocument',
      params,
      params.docName
    );
  }

  async rotatePage(params: {
    docContent: string;
    docName: string;
    page: number;
    rotationType: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Rotate page failed', '/api/v2/RotatePage', params, params.docName);
  }

  async extractPages(params: {
    docContent: string;
    docName: string;
    pageNumbers: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Extract pages failed',
      '/api/v2/ExtractPages',
      params,
      params.docName
    );
  }

  async deletePages(params: {
    docContent: string;
    docName: string;
    pageNumbers: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Delete pages failed', '/api/v2/DeletePages', params, params.docName);
  }

  async deleteBlankPages(params: {
    docContent: string;
    docName: string;
    deletePageOption: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Delete blank pages failed',
      '/api/v2/DeleteBlankPages',
      params,
      params.docName
    );
  }

  async addPageNumber(params: {
    docContent: string;
    docName: string;
    alignX: string;
    alignY: string;
    fontSize: number;
    pageNumberFormat?: string;
    marginXinMM?: number;
    marginYinMM?: number;
    isBold?: boolean;
    isItalic?: boolean;
    skipFirstPage?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Add page number failed',
      '/api/v2/AddPageNumber',
      params,
      params.docName
    );
  }

  async linearizePdf(params: {
    docContent: string;
    docName: string;
    optimizeProfile: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Linearize PDF failed',
      '/api/v2/LinearizePdf',
      params,
      params.docName
    );
  }

  async flattenPdf(params: {
    docContent: string;
    docName: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Flatten PDF failed', '/api/v2/FlattenPdf', params, params.docName);
  }

  async repairPdf(params: { docContent: string; docName: string }): Promise<Pdf4meFileResult> {
    return this.postFile('Repair PDF failed', '/api/v2/RepairPdf', params, params.docName);
  }

  async findAndReplace(params: {
    docContent: string;
    docName: string;
    oldText: string;
    newText: string;
    pageSequence: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Find and replace failed',
      '/api/v2/FindAndReplace',
      params,
      params.docName
    );
  }

  async fillPdfForm(params: {
    templateDocContent: string;
    templateDocName: string;
    dataArray: string;
    keepPdfEditable?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Fill PDF form failed',
      '/api/v2/GenerateDocumentFromPdf',
      params,
      params.templateDocName
    );
  }

  async addFormField(params: {
    docContent: string;
    docName: string;
    initialValue: string;
    positionX: number;
    positionY: number;
    fieldName: string;
    Size: number;
    pages: string;
    formFieldType: string;
  }): Promise<Pdf4meFileResult> {
    return this.postBinaryFile(
      'Add form field failed',
      '/api/v2/AddFormField',
      params,
      params.docName
    );
  }

  async extractPdfFormData(params: { docContent: string; docName: string }): Promise<{
    formFields: Array<{ fieldName: string; fieldValue: string; fieldType: string }>;
  }> {
    return this.post('Extract PDF form data failed', '/api/v2/ExtractPdfFormData', params);
  }

  async generateDocument(params: {
    templateFileType: string;
    templateFileName: string;
    templateFileData: string;
    documentDataType: string;
    documentDataFile?: string;
    documentDataText?: string;
    metaDataJson?: string;
    outputType: string;
    keepPdfEditable?: boolean;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Generate document failed',
      '/api/v2/GenerateDocumentSingle',
      params,
      `generated.${params.outputType}`
    );
  }

  async addHtmlHeaderFooter(params: {
    docContent: string;
    docName: string;
    htmlContent: string;
    location?: string;
    pages: string;
    skipFirstPage?: boolean;
    marginLeft?: string;
    marginRight?: string;
    marginTop?: string;
    marginBottom?: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Add HTML header/footer failed',
      '/api/v2/AddHtmlHeaderFooter',
      params,
      params.docName
    );
  }

  async mergeOverlay(params: {
    baseDocContent: string;
    baseDocName: string;
    layerDocContent: string;
    layerDocName: string;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Merge overlay failed',
      '/api/v2/MergeOverlay',
      params,
      params.baseDocName
    );
  }

  async createImages(params: {
    docContent: string;
    name: string;
    ImageExtension: string;
    PageNrs: number[];
    WidthPixel: number;
    pageNrs: string;
  }): Promise<{ outputDocuments: Array<{ fileName: string; streamFile: string }> }> {
    return this.post('Create images failed', '/api/v2/CreateImages', params);
  }

  async classifyDocument(params: {
    docContent: string;
    docName?: string;
  }): Promise<{ className: string }> {
    return this.post('Classify document failed', '/api/v2/ClassifyDocument', params);
  }

  async addMargin(params: {
    docContent: string;
    docName: string;
    marginLeft?: number;
    marginRight?: number;
    marginTop?: number;
    marginBottom?: number;
  }): Promise<Pdf4meFileResult> {
    return this.postFile('Add margin failed', '/api/v2/AddMargin', params, params.docName);
  }

  async addAttachmentToPdf(params: {
    docContent: string;
    docName: string;
    attachments: Array<{ docName: string; docContent: string }>;
  }): Promise<Pdf4meFileResult> {
    return this.postFile(
      'Add attachments to PDF failed',
      '/api/v2/AddAttachmentToPdf',
      params,
      params.docName
    );
  }

  async extractAttachmentFromPdf(params: {
    docContent: string;
    docName: string;
  }): Promise<{ outputDocuments: Array<{ fileName: string; streamFile: string }> }> {
    return this.post(
      'Extract attachments from PDF failed',
      '/api/v2/ExtractAttachmentFromPdf',
      params
    );
  }

  async parseDocument(params: {
    docContent?: string;
    docName: string;
    TemplateId: string;
    TemplateName?: string;
    ParseId: string;
  }): Promise<{
    parsedData?: Record<string, unknown>;
    documentType?: string;
    pageCount?: number;
    confidence?: number;
  }> {
    return this.post('Parse document failed', '/api/v2/ParseDocument', params);
  }

  async startWorkflow(params: {
    docContent: string;
    docName: string;
    wfName: string;
  }): Promise<{ status: string; jobId: string }> {
    return this.post('Start PDF4me workflow failed', '/api/v2/StartPDF4meWorkflow', params);
  }
}
