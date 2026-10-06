import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class RoboflowClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  private workspaceId?: string;

  constructor(config: { token: string; workspaceId?: string }) {
    this.token = config.token;
    this.workspaceId = config.workspaceId;
    this.api = this.createApi('https://api.roboflow.com');
  }

  private createApi(baseURL: string) {
    let api = createAuthenticatedAxios({
      baseURL,
      authHeader: { value: `Bearer ${this.token}` },
      timeout: 60_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Roboflow',
          reason: 'roboflow_api_error'
        })
    });
    api.interceptors.response.use(response => {
      if (
        isApiErrorRecord(response.data) &&
        (response.data.error || response.data.success === false) &&
        response.data.duplicate !== true
      ) {
        throw buildApiServiceError(
          { response },
          { providerLabel: 'Roboflow', reason: 'roboflow_api_error' }
        );
      }
      return response;
    });
    return api;
  }

  private params(extra: Record<string, unknown> = {}) {
    return extra;
  }

  private projectSlug(projectId: string, workspaceId?: string) {
    let parts = projectId.split('/');
    if (
      !projectId.trim() ||
      parts.length > 2 ||
      parts.some(part => !part.trim() || part === '.' || part === '..') ||
      (parts.length === 2 && workspaceId && parts[0] !== workspaceId)
    ) {
      throw createApiServiceError(
        'Use a project slug or a workspace/project ID returned by list_projects for the selected workspace.'
      );
    }
    return encodeURIComponent(parts[parts.length - 1]!);
  }

  async getAuthenticatedWorkspace(): Promise<string> {
    let response = await this.api.get('/');
    if (typeof response.data.workspace !== 'string' || !response.data.workspace) {
      throw createApiServiceError(
        'Roboflow did not return an authenticated workspace. Check the private API key.'
      );
    }
    return response.data.workspace;
  }

  async getWorkspaceId(): Promise<string> {
    if (this.workspaceId) return this.workspaceId;
    this.workspaceId = await this.getAuthenticatedWorkspace();
    return this.workspaceId;
  }

  // ---- Workspace & Projects ----

  async getWorkspace(workspaceId: string) {
    let response = await this.api.get(`/${encodeURIComponent(workspaceId)}`, {
      params: this.params()
    });
    return response.data;
  }

  async getProject(workspaceId: string, projectId: string) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}`,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async createProject(
    workspaceId: string,
    body: {
      name: string;
      type: string;
      annotation?: string;
      license?: string;
      group?: string;
    }
  ) {
    let response = await this.api.post(`/${encodeURIComponent(workspaceId)}/projects`, body, {
      params: this.params()
    });
    return response.data;
  }

  async deleteProject(workspaceId: string, projectId: string) {
    let response = await this.api.delete(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}`
    );
    return response.data;
  }

  // ---- Images ----

  async uploadImageByUrl(
    projectId: string,
    imageUrl: string,
    options?: {
      name?: string;
      batch?: string;
      tag?: string;
      split?: string;
    }
  ) {
    let response = await this.api.post(
      `/dataset/${this.projectSlug(projectId, await this.getWorkspaceId())}/upload`,
      null,
      {
        params: this.params({
          image: imageUrl,
          ...(options?.name ? { name: options.name } : {}),
          ...(options?.batch ? { batch: options.batch } : {}),
          ...(options?.tag ? { tag: options.tag } : {}),
          ...(options?.split ? { split: options.split } : {})
        })
      }
    );
    return response.data;
  }

  async uploadImageBase64(
    projectId: string,
    base64Data: string,
    options?: {
      name?: string;
      batch?: string;
      tag?: string;
      split?: string;
    }
  ) {
    let response = await this.api.post(
      `/dataset/${this.projectSlug(projectId, await this.getWorkspaceId())}/upload`,
      base64Data,
      {
        params: this.params({
          ...(options?.name ? { name: options.name } : {}),
          ...(options?.batch ? { batch: options.batch } : {}),
          ...(options?.tag ? { tag: options.tag } : {}),
          ...(options?.split ? { split: options.split } : {})
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data;
  }

  async getImage(workspaceId: string, projectId: string, imageId: string) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/images/${encodeURIComponent(imageId)}`,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deleteImages(workspaceId: string, projectId: string, imageIds: string[]) {
    let response = await this.api.delete(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/images`,
      {
        params: this.params(),
        data: { images: imageIds }
      }
    );
    return response.data;
  }

  async searchImages(
    workspaceId: string,
    projectId: string,
    body: {
      likeImage?: string;
      prompt?: string;
      offset?: number;
      limit?: number;
      tag?: string;
      className?: string;
      inDataset?: boolean;
      batch?: boolean;
      batchId?: string;
      fields?: string[];
    }
  ) {
    let requestBody: Record<string, unknown> = {};
    if (body.likeImage) requestBody.like_image = body.likeImage;
    if (body.prompt) requestBody.prompt = body.prompt;
    if (body.offset !== undefined) requestBody.offset = body.offset;
    if (body.limit !== undefined) requestBody.limit = body.limit;
    if (body.tag) requestBody.tag = body.tag;
    if (body.className) requestBody.class_name = body.className;
    if (body.inDataset !== undefined) requestBody.in_dataset = body.inDataset;
    if (body.batch !== undefined) requestBody.batch = body.batch;
    if (body.batchId) requestBody.batch_id = body.batchId;
    if (body.fields) requestBody.fields = body.fields;

    let response = await this.api.post(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/search`,
      requestBody,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async manageImageTags(
    workspaceId: string,
    projectId: string,
    imageId: string,
    operation: string,
    tags: string[]
  ) {
    let response = await this.api.post(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/images/${encodeURIComponent(imageId)}/tags`,
      { operation, tags },
      { params: this.params() }
    );
    return response.data;
  }

  // ---- Versions ----

  async getVersion(workspaceId: string, projectId: string, versionNumber: number) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/${versionNumber}`,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async createVersion(
    workspaceId: string,
    projectId: string,
    body: {
      preprocessing?: Record<string, unknown>;
      augmentation?: Record<string, unknown>;
    }
  ) {
    let response = await this.api.post(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/generate`,
      {
        preprocessing: body.preprocessing ?? {},
        augmentation: body.augmentation ?? {}
      },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  // ---- Training ----

  async trainModel(
    workspaceId: string,
    projectId: string,
    versionNumber: number,
    body: {
      speed?: string;
      checkpoint?: string;
      modelType?: string;
      epochs?: number;
    }
  ) {
    let response = await this.api.post(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/${versionNumber}/train`,
      body,
      {
        params: this.params({ nocache: true })
      }
    );
    return response.data;
  }

  // ---- Inference ----

  async runInference(
    projectId: string,
    versionNumber: number,
    imageSource: string,
    options?: {
      confidence?: number;
      overlap?: number;
      classes?: string;
      format?: string;
    }
  ) {
    let inferenceApi = this.createApi('https://serverless.roboflow.com');

    let isUrl = imageSource.startsWith('http://') || imageSource.startsWith('https://');

    if (isUrl) {
      let response = await inferenceApi.post(
        `/${this.projectSlug(projectId)}/${versionNumber}`,
        null,
        {
          params: this.params({
            image: imageSource,
            confidence: (options?.confidence ?? 40) / 100,
            overlap: (options?.overlap ?? 30) / 100,
            disable_active_learning: true,
            ...(options?.format ? { format: options.format } : {})
          })
        }
      );
      return response.data;
    } else {
      let response = await inferenceApi.post(
        `/${this.projectSlug(projectId)}/${versionNumber}`,
        imageSource,
        {
          params: this.params({
            confidence: (options?.confidence ?? 40) / 100,
            overlap: (options?.overlap ?? 30) / 100,
            disable_active_learning: true,
            ...(options?.format ? { format: options.format } : {})
          }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      return response.data;
    }
  }

  // ---- Annotation Jobs ----

  async listJobs(workspaceId: string, projectId: string) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/jobs`,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async getJob(workspaceId: string, projectId: string, jobId: string) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/jobs/${encodeURIComponent(jobId)}`,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async createJob(
    workspaceId: string,
    projectId: string,
    body: {
      name: string;
      batch: string;
      numImages?: number;
      labelerEmail: string;
      reviewerEmail: string;
    }
  ) {
    let requestBody: Record<string, unknown> = {
      name: body.name,
      batch: body.batch,
      labelerEmail: body.labelerEmail,
      reviewerEmail: body.reviewerEmail
    };
    if (body.numImages !== undefined) requestBody.num_images = body.numImages;

    let response = await this.api.post(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/jobs`,
      requestBody,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  // ---- Export ----

  async exportDataset(
    workspaceId: string,
    projectId: string,
    versionNumber: number,
    format: string
  ) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/${versionNumber}/${encodeURIComponent(format)}`,
      { params: this.params({ nocache: true }) }
    );
    return response.data;
  }

  // ---- Batches ----

  async listBatches(workspaceId: string, projectId: string) {
    let response = await this.api.get(
      `/${encodeURIComponent(workspaceId)}/${this.projectSlug(projectId, workspaceId)}/batches`,
      {
        params: this.params()
      }
    );
    return response.data;
  }

  // ---- Annotations ----

  async uploadAnnotation(
    projectId: string,
    imageId: string,
    annotationBody: string,
    options?: {
      name?: string;
      overwrite?: boolean;
      labelmap?: Record<string, string>;
    }
  ) {
    let response = await this.api.post(
      `/dataset/${this.projectSlug(projectId, await this.getWorkspaceId())}/annotate/${encodeURIComponent(imageId)}`,
      { annotationFile: annotationBody, labelmap: options?.labelmap },
      {
        params: this.params({
          ...(options?.name ? { name: options.name } : {}),
          ...(options?.overwrite !== undefined ? { overwrite: options.overwrite } : {})
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
}
