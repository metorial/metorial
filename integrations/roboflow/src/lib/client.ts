import { createAxios } from 'slates';

export class RoboflowClient {
  private api: ReturnType<typeof createAxios>;
  private token: string;
  private workspaceId?: string;

  constructor(config: { token: string; workspaceId?: string }) {
    this.token = config.token;
    this.workspaceId = config.workspaceId;
    this.api = createAxios({
      baseURL: 'https://api.roboflow.com'
    });
  }

  private params(extra: Record<string, any> = {}) {
    return { api_key: this.token, ...extra };
  }

  async getWorkspaceId(): Promise<string> {
    if (this.workspaceId) return this.workspaceId;
    let response = await this.api.get('/', { params: this.params() });
    return response.data.workspace;
  }

  // ---- Workspace & Projects ----

  async getWorkspace(workspaceId: string) {
    let response = await this.api.get(`/${workspaceId}`, { params: this.params() });
    return response.data;
  }

  async getProject(workspaceId: string, projectId: string) {
    let response = await this.api.get(`/${workspaceId}/${projectId}`, {
      params: this.params()
    });
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
    let response = await this.api.post(`/${workspaceId}/projects`, body, {
      params: this.params()
    });
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
    let response = await this.api.post(`/dataset/${projectId}/upload`, null, {
      params: this.params({
        image: imageUrl,
        ...(options?.name ? { name: options.name } : {}),
        ...(options?.batch ? { batch: options.batch } : {}),
        ...(options?.tag ? { tag: options.tag } : {}),
        ...(options?.split ? { split: options.split } : {})
      })
    });
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
    let response = await this.api.post(`/dataset/${projectId}/upload`, base64Data, {
      params: this.params({
        ...(options?.name ? { name: options.name } : {}),
        ...(options?.batch ? { batch: options.batch } : {}),
        ...(options?.tag ? { tag: options.tag } : {}),
        ...(options?.split ? { split: options.split } : {})
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async getImage(workspaceId: string, projectId: string, imageId: string) {
    let response = await this.api.get(`/${workspaceId}/${projectId}/images/${imageId}`, {
      params: this.params()
    });
    return response.data;
  }

  async deleteImages(workspaceId: string, projectId: string, imageIds: string[]) {
    let response = await this.api.delete(`/${workspaceId}/${projectId}/images`, {
      params: this.params(),
      data: { images: imageIds }
    });
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
    let requestBody: Record<string, any> = {};
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

    let response = await this.api.post(`/${workspaceId}/${projectId}/search`, requestBody, {
      params: this.params()
    });
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
      `/${workspaceId}/${projectId}/images/${imageId}/tags`,
      { operation, tags },
      { params: this.params() }
    );
    return response.data;
  }

  // ---- Versions ----

  async getVersion(workspaceId: string, projectId: string, versionNumber: number) {
    let response = await this.api.get(`/${workspaceId}/${projectId}/${versionNumber}`, {
      params: this.params()
    });
    return response.data;
  }

  async createVersion(
    workspaceId: string,
    projectId: string,
    body: {
      preprocessing?: Record<string, any>;
      augmentation?: Record<string, any>;
    }
  ) {
    let response = await this.api.post(`/${workspaceId}/${projectId}/generate`, body, {
      params: this.params()
    });
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
      `/${workspaceId}/${projectId}/${versionNumber}/train`,
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
    let inferenceApi = createAxios({
      baseURL: 'https://detect.roboflow.com'
    });

    let isUrl = imageSource.startsWith('http://') || imageSource.startsWith('https://');

    if (isUrl) {
      let response = await inferenceApi.post(`/${projectId}/${versionNumber}`, null, {
        params: this.params({
          image: imageSource,
          ...(options?.confidence !== undefined ? { confidence: options.confidence } : {}),
          ...(options?.overlap !== undefined ? { overlap: options.overlap } : {}),
          ...(options?.classes ? { classes: options.classes } : {}),
          ...(options?.format ? { format: options.format } : {})
        })
      });
      return response.data;
    } else {
      let response = await inferenceApi.post(`/${projectId}/${versionNumber}`, imageSource, {
        params: this.params({
          ...(options?.confidence !== undefined ? { confidence: options.confidence } : {}),
          ...(options?.overlap !== undefined ? { overlap: options.overlap } : {}),
          ...(options?.classes ? { classes: options.classes } : {}),
          ...(options?.format ? { format: options.format } : {})
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response.data;
    }
  }

  // ---- Annotation Jobs ----

  async listJobs(workspaceId: string, projectId: string) {
    let response = await this.api.get(`/${workspaceId}/${projectId}/jobs`, {
      params: this.params()
    });
    return response.data;
  }

  async getJob(workspaceId: string, projectId: string, jobId: string) {
    let response = await this.api.get(`/${workspaceId}/${projectId}/jobs/${jobId}`, {
      params: this.params()
    });
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
    let requestBody: Record<string, any> = {
      name: body.name,
      batch: body.batch,
      labelerEmail: body.labelerEmail,
      reviewerEmail: body.reviewerEmail
    };
    if (body.numImages !== undefined) requestBody.num_images = body.numImages;

    let response = await this.api.post(`/${workspaceId}/${projectId}/jobs`, requestBody, {
      params: this.params()
    });
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
      `/${workspaceId}/${projectId}/${versionNumber}/${format}`,
      { params: this.params() }
    );
    return response.data;
  }

  // ---- Batches ----

  async listBatches(workspaceId: string, projectId: string) {
    let response = await this.api.get(`/${workspaceId}/${projectId}/batches`, {
      params: this.params()
    });
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
    }
  ) {
    let response = await this.api.post(
      `/dataset/${projectId}/annotate/${imageId}`,
      annotationBody,
      {
        params: this.params({
          ...(options?.name ? { name: options.name } : {}),
          ...(options?.overwrite !== undefined ? { overwrite: options.overwrite } : {})
        }),
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
    return response.data;
  }
}
