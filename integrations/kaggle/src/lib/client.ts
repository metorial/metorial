import { createAxios } from 'slates';

export class KaggleClient {
  private http;

  constructor(credentials: { token: string; username: string }) {
    this.http = createAxios({
      baseURL: 'https://www.kaggle.com/api/v1',
      headers: {
        Authorization: `Basic ${credentials.token}`
      }
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
    let response = await this.http.get(`/competitions/data/list/${competitionName}`, {
      params: {
        pageToken: params.pageToken,
        pageSize: params.pageSize
      }
    });
    return response.data;
  }

  async downloadCompetitionFile(competitionName: string, fileName: string) {
    let response = await this.http.get(
      `/competitions/data/download/${competitionName}/${fileName}`,
      {
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  async downloadCompetitionFiles(competitionName: string) {
    let response = await this.http.get(`/competitions/data/download-all/${competitionName}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async submitToCompetition(
    competitionName: string,
    blobFileTokens: string,
    submissionDescription: string
  ) {
    let response = await this.http.post(`/competitions/submissions/url/${competitionName}`, {
      blobFileTokens,
      submissionDescription
    });
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
    let response = await this.http.get(`/competitions/submissions/list/${competitionName}`, {
      params: {
        group: params.group,
        page: params.page,
        pageSize: params.pageSize
      }
    });
    return response.data;
  }

  async getCompetitionLeaderboard(competitionName: string) {
    let response = await this.http.get(
      `/competitions/${competitionName}/leaderboard/download`
    );
    return response.data;
  }

  async viewCompetitionLeaderboard(competitionName: string) {
    let response = await this.http.get(`/competitions/${competitionName}/leaderboard/view`);
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
    let response = await this.http.get(`/datasets/list/${ownerSlug}/${datasetSlug}`, {
      params: {
        datasetVersionNumber: params.datasetVersionNumber,
        pageToken: params.pageToken,
        pageSize: params.pageSize
      }
    });
    return response.data;
  }

  async downloadDataset(
    ownerSlug: string,
    datasetSlug: string,
    params: {
      datasetVersionNumber?: number;
    } = {}
  ) {
    let response = await this.http.get(`/datasets/download/${ownerSlug}/${datasetSlug}`, {
      params: {
        datasetVersionNumber: params.datasetVersionNumber
      },
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async downloadDatasetFile(
    ownerSlug: string,
    datasetSlug: string,
    fileName: string,
    params: {
      datasetVersionNumber?: number;
    } = {}
  ) {
    let response = await this.http.get(
      `/datasets/download/${ownerSlug}/${datasetSlug}/${fileName}`,
      {
        params: {
          datasetVersionNumber: params.datasetVersionNumber
        },
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  async getDatasetMetadata(ownerSlug: string, datasetSlug: string) {
    let response = await this.http.get(`/datasets/metadata/${ownerSlug}/${datasetSlug}`);
    return response.data;
  }

  async getDatasetStatus(ownerSlug: string, datasetSlug: string) {
    let response = await this.http.get(`/datasets/status/${ownerSlug}/${datasetSlug}`);
    return response.data;
  }

  async viewDataset(ownerSlug: string, datasetSlug: string) {
    let response = await this.http.get(`/datasets/view/${ownerSlug}/${datasetSlug}`);
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
      `/datasets/create/version/${ownerSlug}/${datasetSlug}`,
      body
    );
    return response.data;
  }

  async uploadDatasetFile(
    fileName: string,
    contentLength: number,
    lastModifiedDateUtc: number
  ) {
    let response = await this.http.post(
      `/datasets/upload/file/${encodeURIComponent(fileName)}`,
      null,
      {
        params: {
          contentLength,
          lastModifiedDateUtc
        },
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }
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
    let response = await this.http.get(`/kernels/pull/${userName}/${kernelSlug}`);
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
    categoryIds?: string[];
  }) {
    let response = await this.http.post('/kernels/push', body);
    return response.data;
  }

  async getKernelOutput(userName: string, kernelSlug: string) {
    let response = await this.http.get(`/kernels/output/${userName}/${kernelSlug}`);
    return response.data;
  }

  async getKernelStatus(userName: string, kernelSlug: string) {
    let response = await this.http.get(`/kernels/status/${userName}/${kernelSlug}`);
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
        sort_by: params.sortBy,
        owner: params.owner,
        page_size: params.pageSize,
        page_token: params.pageToken
      }
    });
    return response.data;
  }

  async getModel(ownerSlug: string, modelSlug: string) {
    let response = await this.http.get(`/models/${ownerSlug}/${modelSlug}`);
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
    let response = await this.http.post('/models/create/new', body);
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
    let response = await this.http.post(`/models/${ownerSlug}/${modelSlug}/update`, body);
    return response.data;
  }

  async deleteModel(ownerSlug: string, modelSlug: string) {
    let response = await this.http.post(`/models/${ownerSlug}/${modelSlug}/delete`);
    return response.data;
  }

  async getModelInstance(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string
  ) {
    let response = await this.http.get(
      `/models/${ownerSlug}/${modelSlug}/${framework}/${variation}`
    );
    return response.data;
  }

  async createModelInstance(
    ownerSlug: string,
    modelSlug: string,
    body: {
      framework: string;
      overview: string;
      instanceSlug: string;
      licenseName?: string;
      fineTunable?: boolean;
      trainingData?: string[];
      modelInstanceType?: string;
      externalUrl?: string;
    }
  ) {
    let response = await this.http.post(
      `/models/${ownerSlug}/${modelSlug}/create/instance`,
      body
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
      `/models/${ownerSlug}/${modelSlug}/${framework}/${variation}/update`,
      body
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
      `/models/${ownerSlug}/${modelSlug}/${framework}/${variation}/delete`
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
      `/models/${ownerSlug}/${modelSlug}/${framework}/${variation}/create/version`,
      body
    );
    return response.data;
  }

  async downloadModelInstance(
    ownerSlug: string,
    modelSlug: string,
    framework: string,
    variation: string,
    versionNumber?: number
  ) {
    let path = `/models/${ownerSlug}/${modelSlug}/${framework}/${variation}/download`;
    if (versionNumber) {
      path += `/${versionNumber}`;
    }
    let response = await this.http.get(path, {
      responseType: 'arraybuffer'
    });
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
      `/models/${ownerSlug}/${modelSlug}/${framework}/${variation}/${versionNumber}/delete`
    );
    return response.data;
  }
}
