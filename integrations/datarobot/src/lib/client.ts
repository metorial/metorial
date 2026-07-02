import { createAxios } from 'slates';

export class DataRobotClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string; endpointUrl: string }) {
    let baseURL = opts.endpointUrl.replace(/\/+$/, '');
    if (!baseURL.endsWith('/api/v2')) {
      baseURL = `${baseURL}/api/v2`;
    }

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(params?: {
    projectName?: string;
    offset?: number;
    limit?: number;
    orderBy?: string;
  }): Promise<any[]> {
    let res = await this.axios.get('/projects/', { params });
    return res.data;
  }

  async getProject(projectId: string): Promise<any> {
    let res = await this.axios.get(`/projects/${projectId}/`);
    return res.data;
  }

  async createProject(body: {
    projectName?: string;
    url?: string;
    datasetId?: string;
  }): Promise<any> {
    let res = await this.axios.post('/projects/', body);
    return res.data;
  }

  async updateProject(
    projectId: string,
    body: {
      projectName?: string;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/projects/${projectId}/`, body);
    return res.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/`);
  }

  async setTarget(
    projectId: string,
    body: {
      target: string;
      mode?: string;
      metric?: string;
      quickrun?: boolean;
      positiveClass?: string;
      partitioningMethod?: string;
      cvMethod?: string;
      blueprintThreshold?: number;
      seed?: number;
      smartDownsampled?: boolean;
      majorityDownsamplingRate?: number;
      accuracyOptimizedMb?: boolean;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/projects/${projectId}/aim/`, body);
    return res.data;
  }

  async getProjectStatus(projectId: string): Promise<any> {
    let res = await this.axios.get(`/projects/${projectId}/`);
    return res.data;
  }

  // ─── Models ────────────────────────────────────────────────

  async listModels(
    projectId: string,
    params?: {
      offset?: number;
      limit?: number;
      orderBy?: string;
    }
  ): Promise<any[]> {
    let res = await this.axios.get(`/projects/${projectId}/models/`, { params });
    return res.data;
  }

  async getModel(projectId: string, modelId: string): Promise<any> {
    let res = await this.axios.get(`/projects/${projectId}/models/${modelId}/`);
    return res.data;
  }

  async getRecommendedModel(projectId: string): Promise<any> {
    let res = await this.axios.get(
      `/projects/${projectId}/recommendedModels/recommendedModel/`
    );
    return res.data;
  }

  async getFeatureImpact(projectId: string, modelId: string): Promise<any> {
    let res = await this.axios.get(`/projects/${projectId}/models/${modelId}/featureImpact/`);
    return res.data;
  }

  async requestFeatureImpact(projectId: string, modelId: string): Promise<any> {
    let res = await this.axios.post(`/projects/${projectId}/models/${modelId}/featureImpact/`);
    return res.data;
  }

  async trainModel(
    projectId: string,
    body: {
      blueprintId: string;
      samplePct?: number;
      trainingRowCount?: number;
      sourceProjectId?: string;
    }
  ): Promise<any> {
    let res = await this.axios.post(`/projects/${projectId}/models/`, body);
    return res.data;
  }

  // ─── Datasets / AI Catalog ─────────────────────────────────

  async listDatasets(params?: { offset?: number; limit?: number }): Promise<any> {
    let res = await this.axios.get('/datasets/', { params });
    return res.data;
  }

  async getDataset(datasetId: string): Promise<any> {
    let res = await this.axios.get(`/datasets/${datasetId}/`);
    return res.data;
  }

  async createDatasetFromUrl(body: { url: string; categories?: string[] }): Promise<any> {
    let res = await this.axios.post('/datasets/fromURL/', body);
    return res.data;
  }

  async updateDataset(
    datasetId: string,
    body: {
      name?: string;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/datasets/${datasetId}/`, body);
    return res.data;
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.axios.delete(`/datasets/${datasetId}/`);
  }

  // ─── Deployments ───────────────────────────────────────────

  async listDeployments(params?: {
    offset?: number;
    limit?: number;
    orderBy?: string;
    status?: string;
  }): Promise<any> {
    let res = await this.axios.get('/deployments/', { params });
    return res.data;
  }

  async getDeployment(deploymentId: string): Promise<any> {
    let res = await this.axios.get(`/deployments/${deploymentId}/`);
    return res.data;
  }

  async createDeploymentFromLearningModel(body: {
    modelId: string;
    label: string;
    description?: string;
    defaultPredictionServerId?: string;
    importance?: string;
  }): Promise<any> {
    let res = await this.axios.post('/deployments/fromLearningModel/', body);
    return res.data;
  }

  async createDeploymentFromModelPackage(body: {
    modelPackageId: string;
    label: string;
    description?: string;
    defaultPredictionServerId?: string;
    importance?: string;
    predictionEnvironmentId?: string;
  }): Promise<any> {
    let res = await this.axios.post('/deployments/fromModelPackage/', body);
    return res.data;
  }

  async updateDeployment(
    deploymentId: string,
    body: {
      label?: string;
      description?: string;
      importance?: string;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/deployments/${deploymentId}/`, body);
    return res.data;
  }

  async deleteDeployment(deploymentId: string): Promise<void> {
    await this.axios.delete(`/deployments/${deploymentId}/`);
  }

  async replaceDeploymentModel(
    deploymentId: string,
    body: {
      modelId?: string;
      modelPackageId?: string;
      reason: string;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/deployments/${deploymentId}/model/`, body);
    return res.data;
  }

  // ─── Deployment Monitoring ─────────────────────────────────

  async getServiceStats(
    deploymentId: string,
    params?: {
      startTime?: string;
      endTime?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/deployments/${deploymentId}/serviceStats/`, { params });
    return res.data;
  }

  async getServiceStatsOverTime(
    deploymentId: string,
    params?: {
      startTime?: string;
      endTime?: string;
      bucketSize?: string;
      metric?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/deployments/${deploymentId}/serviceStatsOverTime/`, {
      params
    });
    return res.data;
  }

  async getAccuracy(
    deploymentId: string,
    params?: {
      startTime?: string;
      endTime?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/deployments/${deploymentId}/accuracy/`, { params });
    return res.data;
  }

  async getDataDrift(
    deploymentId: string,
    params?: {
      startTime?: string;
      endTime?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/deployments/${deploymentId}/featureDrift/`, { params });
    return res.data;
  }

  async getTargetDrift(
    deploymentId: string,
    params?: {
      startTime?: string;
      endTime?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/deployments/${deploymentId}/targetDrift/`, { params });
    return res.data;
  }

  // ─── Model Registry (Model Packages) ──────────────────────

  async listModelPackages(params?: {
    offset?: number;
    limit?: number;
    searchFor?: string;
  }): Promise<any> {
    let res = await this.axios.get('/modelPackages/', { params });
    return res.data;
  }

  async getModelPackage(modelPackageId: string): Promise<any> {
    let res = await this.axios.get(`/modelPackages/${modelPackageId}/`);
    return res.data;
  }

  async createModelPackageFromLearningModel(body: {
    modelId: string;
    registeredModelName?: string;
  }): Promise<any> {
    let res = await this.axios.post('/modelPackages/fromLearningModel/', body);
    return res.data;
  }

  // ─── Predictions ───────────────────────────────────────────

  async makePredictions(
    deploymentId: string,
    body: Record<string, any>[],
    params?: {
      maxExplanations?: number;
    }
  ): Promise<any> {
    let res = await this.axios.post(`/deployments/${deploymentId}/predictions/`, body, {
      params
    });
    return res.data;
  }

  // ─── Batch Predictions ─────────────────────────────────────

  async createBatchPredictionJob(body: {
    deploymentId: string;
    intakeSettings?: Record<string, any>;
    outputSettings?: Record<string, any>;
    csvSettings?: Record<string, any>;
    maxExplanations?: number;
    passthroughColumns?: string[];
    passthroughColumnsSet?: string;
    includePredictionStatus?: boolean;
  }): Promise<any> {
    let res = await this.axios.post('/batchPredictions/', body);
    return res.data;
  }

  async getBatchPredictionJob(jobId: string): Promise<any> {
    let res = await this.axios.get(`/batchPredictions/${jobId}/`);
    return res.data;
  }

  // ─── Notification Channels (Webhooks) ──────────────────────

  async createNotificationChannel(body: {
    channelType: string;
    name: string;
    payloadUrl?: string;
    contentType?: string;
    validateSsl?: boolean;
    secretToken?: string;
    customHeaders?: Array<{ name: string; value: string }>;
  }): Promise<any> {
    let res = await this.axios.post('/notificationChannels/', body);
    return res.data;
  }

  async listNotificationChannels(params?: {
    offset?: number;
    limit?: number;
    channelType?: string;
  }): Promise<any> {
    let res = await this.axios.get('/notificationChannels/', { params });
    return res.data;
  }

  async deleteNotificationChannel(channelId: string): Promise<void> {
    await this.axios.delete(`/notificationChannels/${channelId}/`);
  }

  // ─── Notification Policies ─────────────────────────────────

  async createNotificationPolicy(body: {
    channelId: string;
    name: string;
    eventGroup?: string;
    eventType?: string;
    active?: boolean;
    channelScope?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }): Promise<any> {
    let res = await this.axios.post('/notificationPolicies/', body);
    return res.data;
  }

  async deleteNotificationPolicy(policyId: string): Promise<void> {
    await this.axios.delete(`/notificationPolicies/${policyId}/`);
  }

  // ─── Prediction Environments ───────────────────────────────

  async listPredictionEnvironments(params?: {
    offset?: number;
    limit?: number;
  }): Promise<any> {
    let res = await this.axios.get('/predictionEnvironments/', { params });
    return res.data;
  }

  // ─── Blueprints ────────────────────────────────────────────

  async listBlueprints(
    projectId: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<any[]> {
    let res = await this.axios.get(`/projects/${projectId}/blueprints/`, { params });
    return res.data;
  }

  // ─── Feature Lists ─────────────────────────────────────────

  async listFeatureLists(projectId: string): Promise<any[]> {
    let res = await this.axios.get(`/projects/${projectId}/featurelists/`);
    return res.data;
  }
}
