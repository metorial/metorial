import { createAxios } from 'slates';

let restApi = createAxios({
  baseURL: 'https://rest.runpod.io/v1'
});

let serverlessApi = createAxios({
  baseURL: 'https://api.runpod.ai/v2'
});

export class RunPodClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Pods ──────────────────────────────────────────────────────────

  async listPods(params?: {
    computeType?: string;
    desiredStatus?: string;
    gpuTypeId?: string[];
    name?: string;
    networkVolumeId?: string;
    dataCenterId?: string[];
    includeMachine?: boolean;
    includeNetworkVolume?: boolean;
    includeTemplate?: boolean;
  }) {
    let res = await restApi.get('/pods', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getPod(
    podId: string,
    params?: {
      includeMachine?: boolean;
      includeNetworkVolume?: boolean;
      includeTemplate?: boolean;
    }
  ) {
    let res = await restApi.get(`/pods/${podId}`, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async createPod(data: {
    name?: string;
    imageName: string;
    cloudType?: string;
    computeType?: string;
    gpuTypeIds?: string[];
    gpuCount?: number;
    cpuFlavorIds?: string[];
    vcpuCount?: number;
    containerDiskInGb?: number;
    volumeInGb?: number;
    minRAMPerGPU?: number;
    minVCPUPerGPU?: number;
    ports?: string[];
    env?: Record<string, string>;
    interruptible?: boolean;
    dataCenterIds?: string[];
    networkVolumeId?: string;
  }) {
    let res = await restApi.post('/pods', data, {
      headers: this.headers
    });
    return res.data;
  }

  async updatePod(
    podId: string,
    data: {
      name?: string;
      imageName?: string;
      containerDiskInGb?: number | null;
      volumeInGb?: number | null;
      volumeMountPath?: string;
      env?: Record<string, string>;
      ports?: string[];
      dockerEntrypoint?: string[];
      dockerStartCmd?: string[];
      locked?: boolean;
      globalNetworking?: boolean;
      containerRegistryAuthId?: string;
    }
  ) {
    let res = await restApi.patch(`/pods/${podId}`, data, {
      headers: this.headers
    });
    return res.data;
  }

  async startPod(podId: string) {
    let res = await restApi.post(
      `/pods/${podId}/start`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async stopPod(podId: string) {
    let res = await restApi.post(
      `/pods/${podId}/stop`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async restartPod(podId: string) {
    let res = await restApi.post(
      `/pods/${podId}/restart`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async resetPod(podId: string) {
    let res = await restApi.post(
      `/pods/${podId}/reset`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async deletePod(podId: string) {
    let res = await restApi.delete(`/pods/${podId}`, {
      headers: this.headers
    });
    return res.data;
  }

  // ── Endpoints ─────────────────────────────────────────────────────

  async listEndpoints(params?: { includeTemplate?: boolean; includeWorkers?: boolean }) {
    let res = await restApi.get('/endpoints', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getEndpoint(
    endpointId: string,
    params?: {
      includeTemplate?: boolean;
      includeWorkers?: boolean;
    }
  ) {
    let res = await restApi.get(`/endpoints/${endpointId}`, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async createEndpoint(data: {
    templateId: string;
    name?: string;
    computeType?: string;
    gpuCount?: number;
    gpuTypeIds?: string[];
    cpuFlavorIds?: string[];
    vcpuCount?: number;
    dataCenterIds?: string[];
    networkVolumeId?: string;
    networkVolumeIds?: string[];
    executionTimeoutMs?: number;
    idleTimeout?: number;
    workersMin?: number;
    workersMax?: number;
    scalerType?: string;
    scalerValue?: number;
    flashboot?: boolean;
    allowedCudaVersions?: string[];
    minCudaVersion?: string;
  }) {
    let res = await restApi.post('/endpoints', data, {
      headers: this.headers
    });
    return res.data;
  }

  async updateEndpoint(
    endpointId: string,
    data: {
      templateId?: string;
      name?: string;
      computeType?: string;
      gpuCount?: number;
      gpuTypeIds?: string[];
      cpuFlavorIds?: string[];
      vcpuCount?: number;
      dataCenterIds?: string[];
      networkVolumeId?: string;
      networkVolumeIds?: string[];
      executionTimeoutMs?: number;
      idleTimeout?: number;
      workersMin?: number;
      workersMax?: number;
      scalerType?: string;
      scalerValue?: number;
      flashboot?: boolean;
      allowedCudaVersions?: string[];
      minCudaVersion?: string;
    }
  ) {
    let res = await restApi.patch(`/endpoints/${endpointId}`, data, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteEndpoint(endpointId: string) {
    let res = await restApi.delete(`/endpoints/${endpointId}`, {
      headers: this.headers
    });
    return res.data;
  }

  // ── Serverless Jobs ───────────────────────────────────────────────

  async runJob(
    endpointId: string,
    data: {
      input: Record<string, any>;
      webhook?: string;
      policy?: {
        executionTimeout?: number;
        ttl?: number;
        lowPriority?: boolean;
      };
      s3Config?: {
        accessId?: string;
        accessSecret?: string;
        bucketName?: string;
        endpointUrl?: string;
      };
    }
  ) {
    let res = await serverlessApi.post(`/${endpointId}/run`, data, {
      headers: this.headers
    });
    return res.data;
  }

  async runSyncJob(
    endpointId: string,
    data: {
      input: Record<string, any>;
      webhook?: string;
      policy?: {
        executionTimeout?: number;
        ttl?: number;
        lowPriority?: boolean;
      };
      s3Config?: {
        accessId?: string;
        accessSecret?: string;
        bucketName?: string;
        endpointUrl?: string;
      };
    }
  ) {
    let res = await serverlessApi.post(`/${endpointId}/runsync`, data, {
      headers: this.headers
    });
    return res.data;
  }

  async getJobStatus(endpointId: string, jobId: string) {
    let res = await serverlessApi.get(`/${endpointId}/status/${jobId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async streamJob(endpointId: string, jobId: string) {
    let res = await serverlessApi.get(`/${endpointId}/stream/${jobId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async cancelJob(endpointId: string, jobId: string) {
    let res = await serverlessApi.post(
      `/${endpointId}/cancel/${jobId}`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async retryJob(endpointId: string, jobId: string) {
    let res = await serverlessApi.post(
      `/${endpointId}/retry/${jobId}`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async purgeQueue(endpointId: string) {
    let res = await serverlessApi.post(
      `/${endpointId}/purge-queue`,
      {},
      {
        headers: this.headers
      }
    );
    return res.data;
  }

  async getEndpointHealth(endpointId: string) {
    let res = await serverlessApi.get(`/${endpointId}/health`, {
      headers: this.headers
    });
    return res.data;
  }

  // ── Network Volumes ───────────────────────────────────────────────

  async listNetworkVolumes() {
    let res = await restApi.get('/networkvolumes', {
      headers: this.headers
    });
    return res.data;
  }

  async getNetworkVolume(networkVolumeId: string) {
    let res = await restApi.get(`/networkvolumes/${networkVolumeId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async createNetworkVolume(data: { name: string; size: number; dataCenterId: string }) {
    let res = await restApi.post('/networkvolumes', data, {
      headers: this.headers
    });
    return res.data;
  }

  async updateNetworkVolume(
    networkVolumeId: string,
    data: {
      name?: string;
      size?: number;
    }
  ) {
    let res = await restApi.patch(`/networkvolumes/${networkVolumeId}`, data, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteNetworkVolume(networkVolumeId: string) {
    let res = await restApi.delete(`/networkvolumes/${networkVolumeId}`, {
      headers: this.headers
    });
    return res.data;
  }

  // ── Templates ─────────────────────────────────────────────────────

  async listTemplates(params?: {
    includeEndpointBoundTemplates?: boolean;
    includePublicTemplates?: boolean;
    includeRunpodTemplates?: boolean;
  }) {
    let res = await restApi.get('/templates', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getTemplate(templateId: string) {
    let res = await restApi.get(`/templates/${templateId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async createTemplate(data: {
    name: string;
    imageName: string;
    category?: string;
    containerDiskInGb?: number;
    volumeInGb?: number;
    volumeMountPath?: string;
    env?: Record<string, string>;
    ports?: string[];
    dockerEntrypoint?: string[];
    dockerStartCmd?: string[];
    isPublic?: boolean;
    isServerless?: boolean;
    readme?: string;
    containerRegistryAuthId?: string;
  }) {
    let res = await restApi.post('/templates', data, {
      headers: this.headers
    });
    return res.data;
  }

  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      imageName?: string;
      category?: string;
      containerDiskInGb?: number;
      volumeInGb?: number;
      volumeMountPath?: string;
      env?: Record<string, string>;
      ports?: string[];
      dockerEntrypoint?: string[];
      dockerStartCmd?: string[];
      isPublic?: boolean;
      isServerless?: boolean;
      readme?: string;
      containerRegistryAuthId?: string;
    }
  ) {
    let res = await restApi.patch(`/templates/${templateId}`, data, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteTemplate(templateId: string) {
    let res = await restApi.delete(`/templates/${templateId}`, {
      headers: this.headers
    });
    return res.data;
  }

  // ── Container Registry Auth ───────────────────────────────────────

  async listContainerRegistryAuths() {
    let res = await restApi.get('/containerregistryauth', {
      headers: this.headers
    });
    return res.data;
  }

  async getContainerRegistryAuth(containerRegistryAuthId: string) {
    let res = await restApi.get(`/containerregistryauth/${containerRegistryAuthId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async createContainerRegistryAuth(data: {
    name: string;
    username: string;
    password: string;
  }) {
    let res = await restApi.post('/containerregistryauth', data, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteContainerRegistryAuth(containerRegistryAuthId: string) {
    let res = await restApi.delete(`/containerregistryauth/${containerRegistryAuthId}`, {
      headers: this.headers
    });
    return res.data;
  }

  // ── Billing ───────────────────────────────────────────────────────

  async getPodBilling(params?: {
    bucketSize?: string;
    startTime?: string;
    endTime?: string;
    podId?: string;
    gpuTypeId?: string;
    grouping?: string;
  }) {
    let res = await restApi.get('/billing/pods', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getEndpointBilling(params?: {
    bucketSize?: string;
    startTime?: string;
    endTime?: string;
    endpointId?: string;
    gpuTypeId?: string[];
    grouping?: string;
    dataCenterId?: string[];
  }) {
    let res = await restApi.get('/billing/endpoints', {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async getNetworkVolumeBilling(params?: {
    bucketSize?: string;
    startTime?: string;
    endTime?: string;
  }) {
    let res = await restApi.get('/billing/network-volumes', {
      headers: this.headers,
      params
    });
    return res.data;
  }
}
