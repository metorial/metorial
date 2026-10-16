import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let kaggleApiBase = 'https://www.kaggle.com/api/v1';

let pathPart = (value: string) => {
  if (!value.trim())
    throw createApiServiceError('A non-empty Kaggle resource identifier is required.');
  return encodeURIComponent(value);
};

let failureCode = (data: unknown): string | undefined => {
  if (!isApiErrorRecord(data)) return undefined;
  let nested = isApiErrorRecord(data.error) ? data.error : undefined;
  let code = nested?.code ?? data.code ?? data.errorCode;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
};

export class KaggleClient {
  private http;

  constructor(credentials: { token: string; username: string }) {
    if (!credentials.token?.trim()) {
      throw createApiServiceError('Kaggle credentials are required. Reconnect your account.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: kaggleApiBase,
      timeout: 60_000,
      authHeader: { value: `Basic ${credentials.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Kaggle',
          reason: 'kaggle_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          nestedKeys: ['error', 'errors'],
          detailKeys: [
            'message',
            'detail',
            'error',
            'errorMessage',
            'error_description',
            'code'
          ],
          extractUpstreamCode: (_error, response) => failureCode(response?.data)
        })
    });
    this.http.interceptors.request.use(request => {
      for (let key of ['page', 'pageSize', 'datasetVersionNumber']) {
        let value = request.params?.[key];
        if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
          throw createApiServiceError(`${key} must be a positive whole number.`);
        }
      }
      let min = request.params?.minSize;
      let max = request.params?.maxSize;
      if (
        (min !== undefined && (!Number.isSafeInteger(min) || min < 0)) ||
        (max !== undefined && (!Number.isSafeInteger(max) || max < 1)) ||
        (min !== undefined && max !== undefined && min > max)
      ) {
        throw createApiServiceError(
          'Dataset size bounds must be whole bytes with 0 <= minSize <= maxSize.'
        );
      }
      return request;
    });
    this.http.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (isApiErrorRecord(data)) {
        let code = failureCode(data);
        let hasError =
          data.success === false ||
          data.hasError === true ||
          data.error === true ||
          (typeof data.error === 'string' && data.error.trim().length > 0) ||
          isApiErrorRecord(data.error) ||
          (typeof data.errorMessage === 'string' && data.errorMessage.trim().length > 0) ||
          (code !== undefined && Number(code) >= 400);
        if (hasError) {
          throw buildApiServiceError(
            { response: { status: response.status, data } },
            {
              providerLabel: 'Kaggle',
              reason: 'kaggle_api_error',
              nestedKeys: ['error', 'errors'],
              detailKeys: [
                'message',
                'detail',
                'error',
                'errorMessage',
                'error_description',
                'code'
              ],
              extractUpstreamCode: () => code
            }
          );
        }
      }
      return response;
    });
  }

  // ─── Competitions ────────────────────────────────────────────

  async listCompetitions(
    params: {
      group?: string;
      category?: string;
      sortBy?: string;
      page?: number;
      search?: string;
    } = {}
  ) {
    let response = await this.http.get('/competitions/list', {
      params: {
        group: params.group,
        category: params.category,
        sortBy: params.sortBy,
        page: params.page,
        search: params.search
      }
    });
    return response.data;
  }

  async listCompetitionFiles(
    competitionName: string,
    params: {
      pageToken?: string;
      pageSize?: number;
    } = {}
  ) {
    let response = await this.http.get(
      `/competitions/data/list/${pathPart(competitionName)}`,
      {
        params: {
          pageToken: params.pageToken,
          pageSize: params.pageSize
        }
      }
    );
    return response.data;
  }

  async listCompetitionSubmissions(
    competitionName: string,
    params: {
      group?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    let response = await this.http.get(
      `/competitions/submissions/list/${pathPart(competitionName)}`,
      {
        params: {
          group: params.group,
          page: params.page,
          pageSize: params.pageSize
        }
      }
    );
    return response.data;
  }

  async viewCompetitionLeaderboard(competitionName: string) {
    let response = await this.http.get(
      `/competitions/${pathPart(competitionName)}/leaderboard/view`
    );
    return response.data;
  }

  // ─── Datasets ────────────────────────────────────────────────

  async listDatasets(
    params: {
      page?: number;
      search?: string;
      group?: string;
      sortBy?: string;
      size?: string;
      fileType?: string;
      license?: string;
      tagIds?: string;
      maxSize?: number;
      minSize?: number;
      user?: string;
    } = {}
  ) {
    let response = await this.http.get('/datasets/list', {
      params: {
        page: params.page,
        search: params.search,
        group: params.group,
        sortBy: params.sortBy,
        size: params.size,
        filetype: params.fileType,
        license: params.license,
        tagids: params.tagIds,
        maxSize: params.maxSize,
        minSize: params.minSize,
        user: params.user
      }
    });
    return response.data;
  }

  async listDatasetFiles(
    ownerSlug: string,
    datasetSlug: string,
    params: {
      datasetVersionNumber?: number;
      pageToken?: string;
      pageSize?: number;
    } = {}
  ) {
    let response = await this.http.get(
      `/datasets/list/${pathPart(ownerSlug)}/${pathPart(datasetSlug)}`,
      {
        params: {
          datasetVersionNumber: params.datasetVersionNumber,
          pageToken: params.pageToken,
          pageSize: params.pageSize
        }
      }
    );
    return response.data;
  }

  async getDatasetMetadata(ownerSlug: string, datasetSlug: string) {
    let response = await this.http.get(
      `/datasets/metadata/${pathPart(ownerSlug)}/${pathPart(datasetSlug)}`
    );
    return response.data;
  }

  async getDatasetStatus(ownerSlug: string, datasetSlug: string) {
    let response = await this.http.get(
      `/datasets/status/${pathPart(ownerSlug)}/${pathPart(datasetSlug)}`
    );
    return response.data;
  }

  async createDataset(body: {
    title: string;
    slug?: string;
    ownerSlug?: string;
    licenseName?: string;
    subtitle?: string;
    description?: string;
    files: Array<{ token: string; description?: string }>;
    isPrivate?: boolean;
    convertToCsv?: boolean;
    categoryIds?: string[];
  }) {
    let response = await this.http.post('/datasets/create/new', body);
    return response.data;
  }

  async createDatasetVersion(
    ownerSlug: string,
    datasetSlug: string,
    body: {
      versionNotes: string;
      subtitle?: string;
      description?: string;
      files: Array<{ token: string; description?: string }>;
      convertToCsv?: boolean;
      categoryIds?: string[];
      deleteOldVersions?: boolean;
    }
  ) {
    let response = await this.http.post(
      `/datasets/create/version/${pathPart(ownerSlug)}/${pathPart(datasetSlug)}`,
      body
    );
    return response.data;
  }

  // ─── Kernels (Notebooks) ────────────────────────────────────

  async listKernels(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      group?: string;
      user?: string;
      language?: string;
      kernelType?: string;
      outputType?: string;
      sortBy?: string;
      dataset?: string;
      competition?: string;
      parentKernel?: string;
    } = {}
  ) {
    let response = await this.http.get('/kernels/list', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        group: params.group,
        user: params.user,
        language: params.language,
        kernelType: params.kernelType,
        outputType: params.outputType,
        sortBy: params.sortBy,
        dataset: params.dataset,
        competition: params.competition,
        parentKernel: params.parentKernel
      }
    });
    return response.data;
  }

  async pullKernel(userName: string, kernelSlug: string) {
    pathPart(userName);
    pathPart(kernelSlug);
    let response = await this.http.get('/kernels/pull', { params: { userName, kernelSlug } });
    return response.data;
  }

  async pushKernel(body: {
    id?: number;
    slug?: string;
    newTitle?: string;
    text: string;
    language: string;
    kernelType: string;
    isPrivate?: boolean;
    enableGpu?: boolean;
    enableTpu?: boolean;
    enableInternet?: boolean;
    datasetDataSources?: string[];
    competitionDataSources?: string[];
    kernelDataSources?: string[];
    modelDataSources?: string[];
    categoryIds?: string[];
  }) {
    let response = await this.http.post('/kernels/push', body);
    return response.data;
  }

  async getKernelOutput(userName: string, kernelSlug: string) {
    pathPart(userName);
    pathPart(kernelSlug);
    let response = await this.http.get('/kernels/output', {
      params: { userName, kernelSlug }
    });
    return response.data;
  }

  async getKernelStatus(userName: string, kernelSlug: string) {
    pathPart(userName);
    pathPart(kernelSlug);
    let response = await this.http.get('/kernels/status', {
      params: { userName, kernelSlug }
    });
    return response.data;
  }

  // ─── Models ──────────────────────────────────────────────────

  async listModels(
    params: {
      search?: string;
      sortBy?: string;
      owner?: string;
      pageSize?: number;
      pageToken?: string;
    } = {}
  ) {
    let response = await this.http.get('/models/list', {
      params: {
        search: params.search,
        sortBy: params.sortBy,
        owner: params.owner,
        pageSize: params.pageSize,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async getModel(ownerSlug: string, modelSlug: string) {
    let response = await this.http.get(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/get`
    );
    return response.data;
  }

  async createModel(body: {
    ownerSlug: string;
    slug: string;
    title: string;
    subtitle?: string;
    isPrivate?: boolean;
    description?: string;
    publishTime?: string;
    provenanceSourcesSummary?: string;
  }) {
    let response = await this.http.post('/models/create/new', {
      ...body,
      provenanceSources: body.provenanceSourcesSummary,
      provenanceSourcesSummary: undefined
    });
    return response.data;
  }

  async updateModel(
    ownerSlug: string,
    modelSlug: string,
    body: {
      title?: string;
      subtitle?: string;
      isPrivate?: boolean;
      description?: string;
      publishTime?: string;
      provenanceSourcesSummary?: string;
    }
  ) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/update`,
      {
        ...body,
        provenanceSources: body.provenanceSourcesSummary,
        provenanceSourcesSummary: undefined,
        updateMask: Object.keys(body)
          .filter(key => body[key as keyof typeof body] !== undefined)
          .map(key => (key === 'provenanceSourcesSummary' ? 'provenanceSources' : key))
          .join(',')
      }
    );
    return response.data;
  }

  async deleteModel(ownerSlug: string, modelSlug: string) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/delete`
    );
    return response.data;
  }

  async getModelInstance(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string
  ) {
    let response = await this.http.get(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/${pathPart(framework)}/${pathPart(variation)}/get`
    );
    return response.data;
  }

  async createModelInstance(
    ownerSlug: string,
    modelSlug: string,
    body: {
      framework: string;
      overview?: string;
      instanceSlug: string;
      licenseName?: string;
      fineTunable?: boolean;
      trainingData?: string[];
      modelInstanceType?: string;
      externalUrl?: string;
    }
  ) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/create/instance`,
      { ...body, externalUrl: undefined, externalBaseModelUrl: body.externalUrl }
    );
    return response.data;
  }

  async updateModelInstance(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string,
    body: {
      overview?: string;
      licenseName?: string;
      fineTunable?: boolean;
      trainingData?: string[];
      modelInstanceType?: string;
      externalUrl?: string;
    }
  ) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/${pathPart(framework)}/${pathPart(variation)}/update`,
      {
        ...body,
        externalUrl: undefined,
        externalBaseModelUrl: body.externalUrl,
        updateMask: Object.keys(body)
          .filter(key => body[key as keyof typeof body] !== undefined)
          .map(key => (key === 'externalUrl' ? 'externalBaseModelUrl' : key))
          .join(',')
      }
    );
    return response.data;
  }

  async deleteModelInstance(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string
  ) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/${pathPart(framework)}/${pathPart(variation)}/delete`
    );
    return response.data;
  }

  async createModelInstanceVersion(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string,
    body: {
      versionNotes?: string;
      files: Array<{ token: string; description?: string }>;
    }
  ) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/${pathPart(framework)}/${pathPart(variation)}/create/version`,
      body
    );
    return response.data;
  }

  async deleteModelInstanceVersion(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string,
    versionNumber: number
  ) {
    let response = await this.http.post(
      `/models/${pathPart(ownerSlug)}/${pathPart(modelSlug)}/${pathPart(framework)}/${pathPart(variation)}/${versionNumber}/delete`
    );
    return response.data;
  }
}
