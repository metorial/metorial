import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://api.replicate.com/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Account ───

  async getAccount() {
    let response = await axios.get('/account', { headers: this.headers });
    return response.data;
  }

  // ─── Predictions ───

  async createPrediction(params: {
    version?: string;
    model?: string;
    input: Record<string, any>;
    webhook?: string;
    webhookEventsFilter?: string[];
    stream?: boolean;
  }) {
    let body: Record<string, any> = { input: params.input };
    if (params.version) body.version = params.version;
    if (params.model) body.model = params.model;
    if (params.webhook) body.webhook = params.webhook;
    if (params.webhookEventsFilter) body.webhook_events_filter = params.webhookEventsFilter;
    if (params.stream !== undefined) body.stream = params.stream;

    let response = await axios.post('/predictions', body, { headers: this.headers });
    return response.data;
  }

  async createModelPrediction(
    owner: string,
    name: string,
    params: {
      input: Record<string, any>;
      webhook?: string;
      webhookEventsFilter?: string[];
      stream?: boolean;
    }
  ) {
    let body: Record<string, any> = { input: params.input };
    if (params.webhook) body.webhook = params.webhook;
    if (params.webhookEventsFilter) body.webhook_events_filter = params.webhookEventsFilter;
    if (params.stream !== undefined) body.stream = params.stream;

    let response = await axios.post(`/models/${owner}/${name}/predictions`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async createDeploymentPrediction(
    owner: string,
    name: string,
    params: {
      input: Record<string, any>;
      webhook?: string;
      webhookEventsFilter?: string[];
      stream?: boolean;
    }
  ) {
    let body: Record<string, any> = { input: params.input };
    if (params.webhook) body.webhook = params.webhook;
    if (params.webhookEventsFilter) body.webhook_events_filter = params.webhookEventsFilter;
    if (params.stream !== undefined) body.stream = params.stream;

    let response = await axios.post(`/deployments/${owner}/${name}/predictions`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async getPrediction(predictionId: string) {
    let response = await axios.get(`/predictions/${predictionId}`, { headers: this.headers });
    return response.data;
  }

  async listPredictions(params?: { cursor?: string }) {
    let url = '/predictions';
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async cancelPrediction(predictionId: string) {
    let response = await axios.post(
      `/predictions/${predictionId}/cancel`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Models ───

  async createModel(params: {
    owner: string;
    name: string;
    visibility: 'public' | 'private';
    hardware: string;
    description?: string;
    githubUrl?: string;
    paperUrl?: string;
    licenseUrl?: string;
    coverImageUrl?: string;
  }) {
    let body: Record<string, any> = {
      owner: params.owner,
      name: params.name,
      visibility: params.visibility,
      hardware: params.hardware
    };
    if (params.description) body.description = params.description;
    if (params.githubUrl) body.github_url = params.githubUrl;
    if (params.paperUrl) body.paper_url = params.paperUrl;
    if (params.licenseUrl) body.license_url = params.licenseUrl;
    if (params.coverImageUrl) body.cover_image_url = params.coverImageUrl;

    let response = await axios.post('/models', body, { headers: this.headers });
    return response.data;
  }

  async getModel(owner: string, name: string) {
    let response = await axios.get(`/models/${owner}/${name}`, { headers: this.headers });
    return response.data;
  }

  async listModels(params?: { cursor?: string }) {
    let url = '/models';
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async updateModel(
    owner: string,
    name: string,
    params: {
      description?: string;
      readme?: string;
      githubUrl?: string;
      paperUrl?: string;
      licenseUrl?: string;
      coverImageUrl?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.description !== undefined) body.description = params.description;
    if (params.readme !== undefined) body.readme = params.readme;
    if (params.githubUrl !== undefined) body.github_url = params.githubUrl;
    if (params.paperUrl !== undefined) body.paper_url = params.paperUrl;
    if (params.licenseUrl !== undefined) body.license_url = params.licenseUrl;
    if (params.coverImageUrl !== undefined) body.cover_image_url = params.coverImageUrl;

    let response = await axios.patch(`/models/${owner}/${name}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteModel(owner: string, name: string) {
    await axios.delete(`/models/${owner}/${name}`, { headers: this.headers });
  }

  async listModelVersions(owner: string, name: string, params?: { cursor?: string }) {
    let url = `/models/${owner}/${name}/versions`;
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getModelVersion(owner: string, name: string, versionId: string) {
    let response = await axios.get(`/models/${owner}/${name}/versions/${versionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteModelVersion(owner: string, name: string, versionId: string) {
    await axios.delete(`/models/${owner}/${name}/versions/${versionId}`, {
      headers: this.headers
    });
  }

  // ─── Trainings ───

  async createTraining(
    owner: string,
    name: string,
    versionId: string,
    params: {
      destination: string;
      input: Record<string, any>;
      webhook?: string;
      webhookEventsFilter?: string[];
    }
  ) {
    let body: Record<string, any> = {
      destination: params.destination,
      input: params.input
    };
    if (params.webhook) body.webhook = params.webhook;
    if (params.webhookEventsFilter) body.webhook_events_filter = params.webhookEventsFilter;

    let response = await axios.post(
      `/models/${owner}/${name}/versions/${versionId}/trainings`,
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  async getTraining(trainingId: string) {
    let response = await axios.get(`/trainings/${trainingId}`, { headers: this.headers });
    return response.data;
  }

  async listTrainings(params?: { cursor?: string }) {
    let url = '/trainings';
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async cancelTraining(trainingId: string) {
    await axios.post(`/trainings/${trainingId}/cancel`, {}, { headers: this.headers });
  }

  // ─── Deployments ───

  async createDeployment(params: {
    name: string;
    model: string;
    version: string;
    hardware: string;
    minInstances: number;
    maxInstances: number;
  }) {
    let body = {
      name: params.name,
      model: params.model,
      version: params.version,
      hardware: params.hardware,
      min_instances: params.minInstances,
      max_instances: params.maxInstances
    };
    let response = await axios.post('/deployments', body, { headers: this.headers });
    return response.data;
  }

  async getDeployment(owner: string, name: string) {
    let response = await axios.get(`/deployments/${owner}/${name}`, { headers: this.headers });
    return response.data;
  }

  async listDeployments(params?: { cursor?: string }) {
    let url = '/deployments';
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async updateDeployment(
    owner: string,
    name: string,
    params: {
      version?: string;
      hardware?: string;
      minInstances?: number;
      maxInstances?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.version !== undefined) body.version = params.version;
    if (params.hardware !== undefined) body.hardware = params.hardware;
    if (params.minInstances !== undefined) body.min_instances = params.minInstances;
    if (params.maxInstances !== undefined) body.max_instances = params.maxInstances;

    let response = await axios.patch(`/deployments/${owner}/${name}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteDeployment(owner: string, name: string) {
    await axios.delete(`/deployments/${owner}/${name}`, { headers: this.headers });
  }

  // ─── Collections ───

  async listCollections(params?: { cursor?: string }) {
    let url = '/collections';
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getCollection(slug: string) {
    let response = await axios.get(`/collections/${slug}`, { headers: this.headers });
    return response.data;
  }

  // ─── Files ───

  async listFiles(params?: { cursor?: string }) {
    let url = '/files';
    if (params?.cursor) url += `?cursor=${params.cursor}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getFile(fileId: string) {
    let response = await axios.get(`/files/${fileId}`, { headers: this.headers });
    return response.data;
  }

  async deleteFile(fileId: string) {
    await axios.delete(`/files/${fileId}`, { headers: this.headers });
  }

  // ─── Hardware ───

  async listHardware() {
    let response = await axios.get('/hardware', { headers: this.headers });
    return response.data;
  }

  // ─── Search ───

  async search(query: string, limit?: number) {
    let url = `/search?query=${encodeURIComponent(query)}`;
    if (limit) url += `&limit=${limit}`;
    let response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  // ─── Webhooks ───

  async getWebhookSigningSecret() {
    let response = await axios.get('/webhooks/default/secret', { headers: this.headers });
    return response.data;
  }
}
