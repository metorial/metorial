import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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
      isActivated?: boolean | string;
      isDeleted?: boolean | string;
      isDisabled?: boolean | string;
      name?: string;
    };
    pageQuota?: {
      isHardLimited?: boolean | string;
      pctUsed?: number | string;
      pctUsedStr?: string;
      quota?: number | string;
      used?: number | string;
    };
    plan?: { name?: string };
    ready?: boolean | string;
  };
}

export interface TemplateDetails {
  name: string;
  sizeBytes?: number | string;
  lastModifiedMillisSinceEpoch?: number | string;
  lastModifiedISO8601?: string;
  uploadedTime?: number;
  createdTime?: number;
  templateHasErrors?: boolean | string;
}

export interface ListTemplatesResponse extends DocmosisResponse {
  templateList?: TemplateDetails[];
  nextPageToken?: string | null;
  templateListStale?: boolean | string;
}

export interface TemplateDetailsResponse extends DocmosisResponse {
  templateDetails?: TemplateDetails;
}

export interface TemplateStructureResponse extends DocmosisResponse {
  templateStructure?: Record<string, unknown>[] | Record<string, unknown>;
}

export interface SampleDataResponse extends DocmosisResponse {
  templateSampleData?: Record<string, unknown>;
}

export interface RenderQueueResponse extends DocmosisResponse {
  queue?: {
    availablePct?: number | string;
    delaySeconds?: number | string;
    rejected?: boolean | string;
  };
}

export interface RenderTagEntry {
  name: string;
  countPages?: string | number;
  countDocuments?: string | number;
}

export interface RenderTagMonth {
  year: string | number;
  month: string | number;
  tags: RenderTagEntry[];
}

export interface RenderTagsResponse extends DocmosisResponse {
  renderTags?: RenderTagMonth[];
}

export interface RenderOptions {
  templateName: string;
  outputName: string;
  data: Record<string, unknown>;
  outputFormat?: string;
  storeTo?: string;
  devMode?: boolean;
  strictParams?: boolean;
  mailSubject?: string;
  mailBodyText?: string;
  renderTag?: string;
}

export interface RenderResult extends DocmosisResponse {
  pagesRendered?: string;
  requestId?: string;
  documentErrorsDetected?: string;
  file?: Response;
  filename?: string;
}

// DWS4 examples use both JSON scalars and their string representations.
export let asBoolean = (value: unknown): boolean | undefined =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false'
      ? false
      : undefined;

export let asNumber = (value: unknown): number | undefined => {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '')
    return undefined;
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Docmosis',
    reason: 'docmosis_api_error',
    detailKeys: ['shortMsg', 'longMsg', 'message', 'error']
  });

export class Client {
  private axios;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Docmosis API access key is required.');
    }
    let baseURL = BASE_URLS[config.region];
    if (!baseURL)
      throw createApiServiceError('Choose a supported Docmosis region: us, eu, or au.');
    this.axios = createAuthenticatedAxios({
      baseURL,
      authHeader: { name: 'accessKey', value: config.token },
      contentType: false,
      validateStatus: () => true,
      errorAdapter: apiError
    });
  }

  private checkResponse<T extends DocmosisResponse>(data: unknown, status: number): T {
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('Docmosis returned an invalid response.', {
        reason: 'docmosis_invalid_response',
        upstreamStatus: status
      });
    }
    let succeeded = data.succeeded === true || data.succeeded === 'true';
    if (status !== 200 || !succeeded) {
      throw apiError({ response: { status, data } });
    }
    return { ...data, succeeded } as T;
  }

  private async post<T extends DocmosisResponse>(
    path: string,
    data: unknown = {}
  ): Promise<T> {
    let response = await this.axios.post(path, data);
    return this.checkResponse<T>(response.data, response.status);
  }

  private async fileRequest(path: string, data: unknown) {
    let response = await this.axios.post<ArrayBuffer>(path, data, {
      responseType: 'arraybuffer'
    });
    let bytes = new Uint8Array(response.data);
    let mimeType = getResponseHeaderValue(response.headers, 'content-type');
    if (response.status !== 200 || mimeType?.includes('application/json')) {
      let body: unknown;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw createApiServiceError(
          `Docmosis returned an invalid file response (HTTP ${response.status}).`,
          {
            reason: 'docmosis_invalid_response',
            upstreamStatus: response.status
          }
        );
      }
      this.checkResponse(body, response.status);
      throw createApiServiceError(
        'Docmosis returned a status response instead of a downloadable file.'
      );
    }
    if (bytes.byteLength === 0) {
      throw createApiServiceError('Docmosis returned an empty file.');
    }
    return {
      file: new Response(bytes, {
        headers: { 'content-type': mimeType || 'application/octet-stream' }
      }),
      headers: response.headers
    };
  }

  async ping(): Promise<boolean> {
    let response = await this.axios.get('/ping');
    return response.status === 200;
  }

  async environmentSummary(): Promise<EnvironmentSummaryResponse> {
    return this.post('/environment/summary');
  }

  async listTemplates(
    folder?: string,
    includeSubFolders?: boolean
  ): Promise<ListTemplatesResponse> {
    let response = await this.post<ListTemplatesResponse>(
      '/listTemplates',
      pickDefined({ folder, includeSubFolders })
    );
    // The API returns names relative to a requested folder; expose reusable paths.
    if (folder) {
      let prefix = folder.replace(/\/+$/, '');
      response.templateList = response.templateList?.map(template => ({
        ...template,
        name: `${prefix}/${template.name.replace(/^\/+/, '')}`
      }));
    }
    return response;
  }

  async getTemplateDetails(templateName: string): Promise<TemplateDetailsResponse> {
    return this.post('/getTemplateDetails', { templateName });
  }

  async getTemplateStructure(templateName: string): Promise<TemplateStructureResponse> {
    return this.post('/getTemplateStructure', { templateName, stringify: false });
  }

  async getSampleData(templateName: string): Promise<SampleDataResponse> {
    return this.post('/getSampleData', { templateName, format: 'json', stringify: false });
  }

  async deleteTemplate(templateName: string | string[]): Promise<DocmosisResponse> {
    let names = Array.isArray(templateName) ? templateName : [templateName];
    if (!names.length || names.some(name => !name.trim())) {
      throw createApiServiceError('Provide at least one non-empty template path.');
    }
    let form = new URLSearchParams();
    for (let name of names) form.append('templateName', name);
    return this.post('/deleteTemplate', form);
  }

  async uploadTemplate(options: {
    filename: string;
    content: Uint8Array;
    templateName?: string;
    templateDescription?: string;
    devMode?: boolean;
    keepPrevOnFail?: boolean;
  }): Promise<TemplateDetailsResponse> {
    let form = new FormData();
    form.append('templateFile', new Blob([new Uint8Array(options.content)]), options.filename);
    for (let [key, value] of Object.entries(
      pickDefined({
        templateName: options.templateName,
        templateDescription: options.templateDescription,
        devMode: options.devMode,
        keepPrevOnFail: options.keepPrevOnFail
      })
    )) {
      form.append(key, String(value));
    }
    return this.post('/uploadTemplate', form);
  }

  async downloadTemplate(templateName: string) {
    return this.fileRequest('/getTemplate', { templateName });
  }

  async render(options: RenderOptions): Promise<RenderResult> {
    let body = pickDefined({
      templateName: options.templateName,
      outputName: options.outputName,
      data: options.data,
      outputFormat: options.outputFormat,
      storeTo: options.storeTo,
      devMode: options.devMode,
      strictParams: options.strictParams,
      mailSubject: options.mailSubject,
      mailBodyText: options.mailBodyText,
      tags: options.renderTag
    });
    let isStreamResponse =
      !options.storeTo?.trim() ||
      options.storeTo.split(';').some(target => /^stream(?::|$)/.test(target.trim()));
    if (!isStreamResponse) {
      let response = await this.axios.post('/render', body);
      let result = this.checkResponse<RenderResult>(response.data, response.status);
      return {
        ...result,
        pagesRendered: getResponseHeaderValue(response.headers, 'x-docmosis-pagesrendered'),
        requestId:
          getResponseHeaderValue(response.headers, 'x-docmosis-requestid') ?? result.requestId,
        documentErrorsDetected: getResponseHeaderValue(
          response.headers,
          'x-docmosis-document-errors-detected'
        )
      };
    }
    let response = await this.fileRequest('/render', body);
    let zipped = getResponseHeaderValue(response.headers, 'x-docmosis-zip-created') === 'true';
    return {
      succeeded: true,
      pagesRendered: getResponseHeaderValue(response.headers, 'x-docmosis-pagesrendered'),
      requestId: getResponseHeaderValue(response.headers, 'x-docmosis-requestid'),
      documentErrorsDetected: getResponseHeaderValue(
        response.headers,
        'x-docmosis-document-errors-detected'
      ),
      file: response.file,
      filename:
        zipped && !options.outputName.endsWith('.zip')
          ? `${options.outputName}.zip`
          : options.outputName
    };
  }

  async getRenderQueue(): Promise<RenderQueueResponse> {
    return this.post('/getRenderQueue');
  }

  async getRenderTags(tags?: string): Promise<RenderTagsResponse> {
    if (!tags?.trim()) {
      throw createApiServiceError('Provide one or more semicolon-separated render tags.');
    }
    return this.post('/getRenderTags', { tags });
  }
}
