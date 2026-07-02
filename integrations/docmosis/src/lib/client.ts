import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://us1.dws4.docmosis.com/api',
  eu: 'https://eu1.dws4.docmosis.com/api',
  au: 'https://au1.dws4.docmosis.com/api'
};

export interface ClientConfig {
  token: string;
  region: string;
}

export interface DocmosisResponse {
  succeeded: boolean;
  shortMsg?: string;
  longMsg?: string;
}

export interface EnvironmentSummaryResponse extends DocmosisResponse {
  accountEnvironmentSummary?: {
    accountEnvDetails?: {
      auditInfo?: {
        lastUpdatedByUser?: string;
        lastUpdatedTime?: number;
      };
      isActivated?: boolean;
      isDeleted?: boolean;
      isDisabled?: boolean;
      name?: string;
    };
    pageQuota?: {
      isHardLimited?: boolean;
      pctUsed?: number;
      pctUsedStr?: string;
      quota?: number;
      used?: number;
    };
    plan?: {
      name?: string;
    };
    ready?: boolean;
  };
}

export interface TemplateDetails {
  name: string;
  sizeBytes?: number;
  uploadedTime?: number;
  createdTime?: number;
}

export interface ListTemplatesResponse extends DocmosisResponse {
  templateList?: TemplateDetails[];
}

export interface TemplateDetailsResponse extends DocmosisResponse {
  templateDetails?: TemplateDetails;
}

export interface UploadTemplateResponse extends DocmosisResponse {
  templateDetails?: TemplateDetails;
}

export interface TemplateStructureResponse extends DocmosisResponse {
  structure?: Record<string, any>;
}

export interface SampleDataResponse extends DocmosisResponse {
  sampleData?: Record<string, any>;
}

export interface RenderQueueResponse extends DocmosisResponse {
  queueInfo?: {
    availablePct?: number;
    delaySeconds?: number;
    rejected?: boolean;
  };
}

export interface RenderTagEntry {
  name: string;
  countPages?: string;
  countDocuments?: string;
}

export interface RenderTagMonth {
  year: string;
  month: string;
  tags: RenderTagEntry[];
}

export interface RenderTagsResponse extends DocmosisResponse {
  renderTags?: RenderTagMonth[];
}

export interface RenderOptions {
  templateName: string;
  outputName: string;
  data: Record<string, any>;
  outputFormat?: string;
  storeTo?: string;
  devMode?: boolean;
  strictParams?: boolean;
  mailSubject?: string;
  mailBodyText?: string;
  renderTag?: string;
}

export interface RenderResult {
  pagesRendered?: string;
  requestId?: string;
  documentErrorsDetected?: string;
  succeeded?: boolean;
  shortMsg?: string;
  longMsg?: string;
}

export class Client {
  private axios;
  private accessKey: string;

  constructor(config: ClientConfig) {
    let baseURL = BASE_URLS[config.region] || BASE_URLS.us;
    this.accessKey = config.token;
    this.axios = createAxios({ baseURL });
  }

  async ping(): Promise<boolean> {
    let response = await this.axios.get('/ping');
    return response.status === 200;
  }

  async environmentReady(): Promise<DocmosisResponse> {
    let response = await this.axios.post('/environment/ready', {
      accessKey: this.accessKey
    });
    return response.data;
  }

  async environmentSummary(): Promise<EnvironmentSummaryResponse> {
    let response = await this.axios.post('/environment/summary', {
      accessKey: this.accessKey
    });
    return response.data;
  }

  async listTemplates(
    folder?: string,
    includeSubFolders?: boolean
  ): Promise<ListTemplatesResponse> {
    let body: Record<string, any> = { accessKey: this.accessKey };
    if (folder) body.folder = folder;
    if (includeSubFolders !== undefined) body.includeSubFolders = includeSubFolders;
    let response = await this.axios.post('/listTemplates', body);
    return response.data;
  }

  async getTemplateDetails(templateName: string): Promise<TemplateDetailsResponse> {
    let response = await this.axios.post('/getTemplateDetails', {
      accessKey: this.accessKey,
      templateName
    });
    return response.data;
  }

  async getTemplateStructure(templateName: string): Promise<TemplateStructureResponse> {
    let response = await this.axios.post('/getTemplateStructure', {
      accessKey: this.accessKey,
      templateName
    });
    return response.data;
  }

  async getSampleData(
    templateName: string,
    sampleDataFormat?: string
  ): Promise<SampleDataResponse> {
    let body: Record<string, any> = { accessKey: this.accessKey, templateName };
    if (sampleDataFormat) body.sampleDataFormat = sampleDataFormat;
    let response = await this.axios.post('/getSampleData', body);
    return response.data;
  }

  async deleteTemplate(templateName: string | string[]): Promise<DocmosisResponse> {
    let response = await this.axios.post('/deleteTemplate', {
      accessKey: this.accessKey,
      templateName
    });
    return response.data;
  }

  async render(options: RenderOptions): Promise<RenderResult> {
    let body: Record<string, any> = {
      accessKey: this.accessKey,
      templateName: options.templateName,
      outputName: options.outputName,
      data: options.data
    };

    if (options.outputFormat) body.outputFormat = options.outputFormat;
    if (options.storeTo) body.storeTo = options.storeTo;
    if (options.devMode !== undefined) body.devMode = options.devMode;
    if (options.strictParams !== undefined) body.strictParams = options.strictParams;
    if (options.mailSubject) body.mailSubject = options.mailSubject;
    if (options.mailBodyText) body.mailBodyText = options.mailBodyText;
    if (options.renderTag) body.renderTag = options.renderTag;

    // If storeTo is not "stream" (the default), the response is JSON
    // If storeTo includes "stream", the response is a binary file
    let isStreamResponse = !options.storeTo || options.storeTo.includes('stream');

    let response = await this.axios.post('/render', body, {
      responseType: isStreamResponse ? 'arraybuffer' : 'json'
    });

    let result: RenderResult = {
      pagesRendered: response.headers['x-docmosis-pagesrendered'],
      requestId: response.headers['x-docmosis-requestid'],
      documentErrorsDetected: response.headers['x-docmosis-document-errors-detected']
    };

    if (!isStreamResponse && response.data) {
      let data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      result.succeeded = data.succeeded;
      result.shortMsg = data.shortMsg;
      result.longMsg = data.longMsg;
    } else {
      result.succeeded = response.status === 200;
    }

    return result;
  }

  async getRenderQueue(): Promise<RenderQueueResponse> {
    let response = await this.axios.post('/getRenderQueue', {
      accessKey: this.accessKey
    });
    return response.data;
  }

  async getRenderTags(tags?: string): Promise<RenderTagsResponse> {
    let body: Record<string, any> = { accessKey: this.accessKey };
    if (tags) body.tags = tags;
    let response = await this.axios.post('/getRenderTags', body);
    return response.data;
  }

  async listImages(folderName?: string): Promise<{
    succeeded: boolean;
    images?: Array<{ name: string; sizeBytes?: number; uploadedTime?: number }>;
  }> {
    let body: Record<string, any> = { accessKey: this.accessKey };
    if (folderName) body.folderName = folderName;
    let response = await this.axios.post('/listImages', body);
    return response.data;
  }

  async deleteImage(imageName: string | string[]): Promise<DocmosisResponse> {
    let response = await this.axios.post('/deleteImage', {
      accessKey: this.accessKey,
      imageName
    });
    return response.data;
  }
}
