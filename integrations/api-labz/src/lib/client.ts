import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://hub.apilabz.com';
let CATALOG_URL = 'https://apiilabs-default-rtdb.firebaseio.com/apiModules.json';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide your API Labz API token.');
    }
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URL,
      timeout: 120_000,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async callModule(moduleId: string, data: Record<string, unknown>): Promise<unknown> {
    if (!moduleId.trim()) {
      throw createApiServiceError('Provide a module ID. Call list_api_modules to find one.');
    }
    try {
      let response = await this.getAxios().post(
        `/module/${encodeURIComponent(moduleId)}`,
        data
      );
      if (response.data === undefined) {
        throw createApiServiceError('API Labz returned an empty module response.');
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'API Labz',
        reason: 'api_labz_module_failed',
        operation: `module ${moduleId}`,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  async listModules(search?: string) {
    try {
      let response = await createAxios({ timeout: 30_000 }).get(CATALOG_URL);
      if (!isApiErrorRecord(response.data)) {
        throw createApiServiceError('API Labz returned an invalid module catalog.');
      }
      let modules = Object.entries(response.data)
        .filter(([, module]) => !isApiErrorRecord(module) || module.visibility !== false)
        .map(([moduleId, module]) => {
          if (!isApiErrorRecord(module) || typeof module.name !== 'string') {
            throw createApiServiceError('API Labz returned an invalid module catalog entry.');
          }
          let exampleParameters: unknown = module.dummyPayload;
          if (typeof exampleParameters === 'string') {
            try {
              exampleParameters = JSON.parse(exampleParameters);
            } catch {
              // Preserve a provider example that is not JSON instead of inventing fields.
            }
          }
          return {
            moduleId,
            name: module.name,
            ...pickDefined({
              description:
                typeof module.description === 'string' ? module.description : undefined,
              category: typeof module.category === 'string' ? module.category : undefined,
              exampleParameters
            })
          };
        });
      if (search) {
        let query = search.toLowerCase();
        modules = modules.filter(
          module =>
            module.name.toLowerCase().includes(query) ||
            module.description?.toLowerCase().includes(query)
        );
      }
      return modules;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'API Labz',
        reason: 'api_labz_catalog_failed',
        operation: 'module catalog',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  async generateBusinessReport(params: { instructions: string; rawData: string }) {
    return this.callModule('1025', {
      instruction: params.instructions,
      rawData: params.rawData
    });
  }

  async extractIdData(params: { fileFormat: string; base64String: string }) {
    let fileType = params.fileFormat;
    if (!fileType.includes('/')) {
      fileType = `image/${fileType.toLowerCase() === 'jpg' ? 'jpeg' : fileType.toLowerCase()}`;
    }
    return this.callModule('1022', {
      fileType,
      base64: params.base64String
    });
  }

  async convertDocument(params: {
    instructions: string;
    fileUrl?: string;
    base64String?: string;
    fileName?: string;
    outputFormat?: string;
  }) {
    this.validateFileSource(params);
    // Retain the existing operation until a current replacement contract is published.
    return this.callModule(
      'document-wizard',
      pickDefined({
        instructions: params.instructions,
        file_url: params.fileUrl,
        base64: params.base64String,
        file_name: params.fileName,
        output_format: params.outputFormat
      })
    );
  }

  async pdfToJson(params: { base64String?: string; fileUrl?: string; schema: string }) {
    this.validateFileSource(params);
    if (params.fileUrl) {
      return this.callModule('126', {
        pdfUrl: params.fileUrl,
        jsonStructure: this.parseJsonStructure(params.schema)
      });
    }
    // The current catalog documents URL inputs only. Preserve legacy base64 calls.
    return this.callModule('pdf-to-json', {
      schema: params.schema,
      base64: params.base64String
    });
  }

  async imageToJson(params: { base64String?: string; fileUrl?: string; schema: string }) {
    this.validateFileSource(params);
    if (params.fileUrl) {
      return this.callModule('127', {
        imageUrl: params.fileUrl,
        jsonStructure: this.parseJsonStructure(params.schema)
      });
    }
    return this.callModule('image-to-json', {
      schema: params.schema,
      base64: params.base64String
    });
  }

  private validateFileSource(params: { fileUrl?: string; base64String?: string }) {
    if (!!params.fileUrl === !!params.base64String) {
      throw createApiServiceError('Provide exactly one of fileUrl or base64String.');
    }
  }

  private parseJsonStructure(schema: string): Record<string, unknown> {
    try {
      let structure: unknown = JSON.parse(schema);
      if (isApiErrorRecord(structure)) return structure;
    } catch {
      // Report malformed JSON with the same actionable validation error.
    }
    throw createApiServiceError('Provide schema as a JSON object encoded as a string.');
  }

  async trackExpense(params: { expense: string }) {
    return this.callModule('expense-tracker', { record_expense: params.expense });
  }

  async generateSocialMediaContent(params: { productDescription: string }) {
    return this.callModule('619', { instruction: params.productDescription });
  }

  async textToFlowDiagram(params: { instructions: string }) {
    return this.callModule('129', { instruction: params.instructions });
  }

  async textToImage(params: { prompt: string }) {
    return this.callModule('128', { instruction: params.prompt });
  }

  async deepResearch(params: { query: string }) {
    return this.callModule('1027', { query: params.query });
  }

  async aiSearch(params: { query: string }) {
    return this.callModule('136', { query: params.query, model: 'sonar' });
  }
}
