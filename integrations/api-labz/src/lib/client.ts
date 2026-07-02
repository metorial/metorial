import { createAxios } from 'slates';

let BASE_URL = 'https://hub.apilabz.com';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async callModule(
    moduleId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let http = this.getAxios();
    let response = await http.post(`/module/${moduleId}`, data);
    return response.data as Record<string, unknown>;
  }

  async generateBusinessReport(params: {
    instructions: string;
    rawData: string;
  }): Promise<Record<string, unknown>> {
    return this.callModule('business-analyst', {
      instructions: params.instructions,
      data: params.rawData
    });
  }

  async extractIdData(params: {
    fileFormat: string;
    base64String: string;
  }): Promise<Record<string, unknown>> {
    return this.callModule('id-parser', {
      file_format: params.fileFormat,
      base64: params.base64String
    });
  }

  async convertDocument(params: {
    instructions: string;
    fileUrl?: string;
    base64String?: string;
    fileName?: string;
    outputFormat?: string;
  }): Promise<Record<string, unknown>> {
    let payload: Record<string, unknown> = {
      instructions: params.instructions
    };
    if (params.fileUrl) payload.file_url = params.fileUrl;
    if (params.base64String) payload.base64 = params.base64String;
    if (params.fileName) payload.file_name = params.fileName;
    if (params.outputFormat) payload.output_format = params.outputFormat;

    return this.callModule('document-wizard', payload);
  }

  async pdfToJson(params: {
    base64String?: string;
    fileUrl?: string;
    schema: string;
  }): Promise<Record<string, unknown>> {
    let payload: Record<string, unknown> = {
      schema: params.schema
    };
    if (params.base64String) payload.base64 = params.base64String;
    if (params.fileUrl) payload.file_url = params.fileUrl;

    return this.callModule('pdf-to-json', payload);
  }

  async imageToJson(params: {
    base64String?: string;
    fileUrl?: string;
    schema: string;
  }): Promise<Record<string, unknown>> {
    let payload: Record<string, unknown> = {
      schema: params.schema
    };
    if (params.base64String) payload.base64 = params.base64String;
    if (params.fileUrl) payload.file_url = params.fileUrl;

    return this.callModule('image-to-json', payload);
  }

  async trackExpense(params: { expense: string }): Promise<Record<string, unknown>> {
    return this.callModule('expense-tracker', {
      record_expense: params.expense
    });
  }

  async generateSocialMediaContent(params: {
    productDescription: string;
  }): Promise<Record<string, unknown>> {
    return this.callModule('social-media-marketing', {
      about_product: params.productDescription
    });
  }

  async textToFlowDiagram(params: { instructions: string }): Promise<Record<string, unknown>> {
    return this.callModule('flow-diagram-generator', {
      instructions: params.instructions
    });
  }

  async textToImage(params: { prompt: string }): Promise<Record<string, unknown>> {
    return this.callModule('text-to-image', {
      prompt: params.prompt
    });
  }

  async deepResearch(params: { query: string }): Promise<Record<string, unknown>> {
    return this.callModule('deep-research', {
      query: params.query
    });
  }

  async aiSearch(params: { query: string }): Promise<Record<string, unknown>> {
    return this.callModule('617', {
      query: params.query
    });
  }
}
