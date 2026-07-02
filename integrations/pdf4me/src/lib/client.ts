import { createAxios } from 'slates';

let BASE_URL = 'https://api.pdf4me.com';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.token
      }
    });
  }

  async convertToPdf(params: {
    docContent: string;
    docName: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertToPdf', {
      docContent: params.docContent,
      docName: params.docName
    });
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertHtmlToPdf', params);
    return response.data;
  }

  async convertUrlToPdf(params: {
    webUrl: string;
    authType?: string;
    username?: string;
    password?: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertUrlToPdf', params);
    return response.data;
  }

  async convertPdfToWord(params: {
    docContent: string;
    docName: string;
    qualityType: string;
    language?: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertPdfToWord', params);
    return response.data;
  }

  async convertPdfToExcel(params: {
    docContent: string;
    docName: string;
    qualityType: string;
    language?: string;
    mergeAllSheets?: boolean;
    outputFormat?: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertPdfToExcel', params);
    return response.data;
  }

  async convertPdfToPowerPoint(params: {
    docContent: string;
    docName: string;
    qualityType?: string;
    language?: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertPdfToPowerPoint', params);
    return response.data;
  }

  async merge(params: {
    docContent: string[];
    docName: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/Merge', {
      docContent: params.docContent,
      docName: params.docName
    });
    return response.data;
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
    let response = await this.axios.post('/api/v2/SplitPdf', params);
    return response.data;
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
    let response = await this.axios.post('/api/v2/SplitByText', params);
    return response.data;
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
    let response = await this.axios.post('/api/v2/SplitByBarcode', params);
    return response.data;
  }

  async optimize(params: {
    docContent: string;
    docName: string;
    optimizeProfile: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/Optimize', params);
    return response.data;
  }

  async extractResources(params: {
    docContent: string;
    docName: string;
    extractText?: boolean;
    extractImage?: boolean;
  }): Promise<{ texts: string[]; images: Array<{ fileName: string; streamFile: string }> }> {
    let response = await this.axios.post('/api/v2/ExtractResources', {
      docContent: params.docContent,
      docName: params.docName,
      extractText: params.extractText ?? true,
      extractImage: params.extractImage ?? false
    });
    return response.data;
  }

  async extractTable(params: {
    docContent: string;
    docName: string;
  }): Promise<{ tableList: Array<{ pageNumber: number; table: string[][] }> }> {
    let response = await this.axios.post('/api/v2/ExtractTable', params);
    return response.data;
  }

  async extractTextByExpression(params: {
    docContent: string;
    docName: string;
    expression: string;
    pageSequence: string;
  }): Promise<{ textList: string[] }> {
    let response = await this.axios.post('/api/v2/ExtractTextByExpression', params);
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/Stamp', params);
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ImageStamp', params);
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/AddBarcode', params);
    return response.data;
  }

  async createBarcode(params: {
    barcodeType: string;
    text: string;
    hideText?: boolean;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/CreateBarcode', params);
    return response.data;
  }

  async readBarcode(params: {
    docContent: string;
    docName: string;
    barcodeType: string[];
    pages?: string;
  }): Promise<{ barcodes: Array<{ barcodeType: string; Value: string; page: number }> }> {
    let response = await this.axios.post('/api/v2/ReadBarcode', params);
    return response.data;
  }

  async protect(params: {
    docContent: string;
    docName: string;
    password: string;
    pdfPermission: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/Protect', params);
    return response.data;
  }

  async unlock(params: {
    docContent: string;
    docName: string;
    password: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/Unlock', params);
    return response.data;
  }

  async ocrPdf(params: {
    docContent: string;
    docName: string;
    qualityType: string;
    ocrWhenNeeded?: string;
    language?: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ConvertOcrPdf', params);
    return response.data;
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
    let response = await this.axios.post('/api/v2/GetPdfMetadata', params);
    return response.data;
  }

  async createPdfA(params: {
    docContent: string;
    docName: string;
    compliance: string;
    allowUpgrade?: boolean;
    allowDowngrade?: boolean;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/PdfA', params);
    return response.data;
  }

  async rotateDocument(params: {
    docContent: string;
    docName: string;
    rotationType: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/RotateDocument', params);
    return response.data;
  }

  async rotatePage(params: {
    docContent: string;
    docName: string;
    page: number;
    rotationType: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/RotatePage', params);
    return response.data;
  }

  async extractPages(params: {
    docContent: string;
    docName: string;
    pageNumbers: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/ExtractPages', params);
    return response.data;
  }

  async deletePages(params: {
    docContent: string;
    docName: string;
    pageNumbers: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/DeletePages', params);
    return response.data;
  }

  async deleteBlankPages(params: {
    docContent: string;
    docName: string;
    deletePageOption: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/DeleteBlankPages', params);
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/AddPageNumber', params);
    return response.data;
  }

  async linearizePdf(params: {
    docContent: string;
    docName: string;
    optimizeProfile: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/LinearizePdf', params);
    return response.data;
  }

  async flattenPdf(params: {
    docContent: string;
    docName: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/FlattenPdf', params);
    return response.data;
  }

  async repairPdf(params: {
    docContent: string;
    docName: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/RepairPdf', params);
    return response.data;
  }

  async findAndReplace(params: {
    docContent: string;
    docName: string;
    oldText: string;
    newText: string;
    pageSequence: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/FindAndReplace', params);
    return response.data;
  }

  async fillPdfForm(params: {
    templateDocContent: string;
    templateDocName: string;
    dataArray: string;
    keepPdfEditable?: boolean;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/GenerateDocumentFromPdf', params);
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/GenerateDocumentSingle', params);
    return response.data;
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
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/AddHtmlHeaderFooter', params);
    return response.data;
  }

  async mergeOverlay(params: {
    baseDocContent: string;
    baseDocName: string;
    layerDocContent: string;
    layerDocName: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/MergeOverlay', params);
    return response.data;
  }

  async createImages(params: {
    docContent: string;
    name: string;
    ImageExtension: string;
    PageNrs: number[];
    WidthPixel: number;
    pageNrs: string;
  }): Promise<{ outputDocuments: Array<{ fileName: string; streamFile: string }> }> {
    let response = await this.axios.post('/api/v2/CreateImages', params);
    return response.data;
  }

  async classifyDocument(params: {
    docContent: string;
    docName?: string;
  }): Promise<{ className: string }> {
    let response = await this.axios.post('/api/v2/ClassifyDocument', params);
    return response.data;
  }

  async addMargin(params: {
    docContent: string;
    docName: string;
    marginLeft: string;
    marginRight: string;
    marginTop: string;
    marginBottom: string;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/AddMargin', params);
    return response.data;
  }

  async digitalSign(params: {
    docContent: string;
    docName: string;
    signCertificate: string;
    signCertificatePassword: string;
    pageNr?: string;
    marginX?: number;
    marginY?: number;
    width?: number;
    height?: number;
    sigLocation?: string;
    signerName?: string;
    sigReason?: string;
    visible?: boolean;
  }): Promise<{ fileContent: string; fileName: string }> {
    let response = await this.axios.post('/api/v2/DigitalSignPdf', params);
    return response.data;
  }

  async startWorkflow(params: {
    docContent: string;
    docName: string;
    wfName: string;
  }): Promise<{ status: string; jobId: string }> {
    let response = await this.axios.post('/api/v2/StartPDF4meWorkflow', params);
    return response.data;
  }
}
