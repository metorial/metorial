import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  pickDefined,
  requestAxiosData
} from 'slates';

let restApi = createAxios({ baseURL: 'https://api.runpod.io/v2' });
let serverlessApi = createAxios({ baseURL: 'https://api.runpod.ai/v2' });
let graphqlApi = createAxios({ baseURL: 'https://api.runpod.io' });

type Resource = Record<string, any>;

let normalizePod = (pod: Resource): Resource => ({
  ...pod,
  desiredStatus: pod.status,
  imageName: pod.image,
  containerDiskInGb: pod.disk,
  volumeInGb: pod.mounts?.persistent?.size ?? null,
  volumeMountPath: pod.mounts?.persistent?.path ?? pod.mounts?.network?.[0]?.path ?? null,
  networkVolume: pod.mounts?.network?.[0] ? { id: pod.mounts.network[0].volumeId } : null,
  costPerHr: pod.cost,
  vcpuCount: pod.cpu?.vcpuCount ?? pod.gpu?.vcpuCount,
  memoryInGb: pod.cpu?.memory ?? pod.gpu?.memory,
  gpuTypeId: pod.gpu?.id,
  publicIp:
    pod.runtime?.ports?.find((port: Resource) => port.ip)?.ip ?? pod.ssh?.direct?.host ?? null
});

let normalizeEndpoint = (endpoint: Resource): Resource => ({
  ...endpoint,
  computeType: endpoint.cpu ? 'CPU' : 'GPU',
  gpuCount: endpoint.gpu?.count ?? null,
  gpuTypeIds: null,
  gpuPoolIds: endpoint.gpu?.pools ?? null,
  workersMin: endpoint.workers?.min,
  workersMax: endpoint.workers?.max,
  idleTimeout: endpoint.workers?.idleTimeout,
  executionTimeoutMs: endpoint.timeout,
  scalerType: endpoint.scaling?.type,
  scalerValue: endpoint.scaling?.queueDelay ?? endpoint.scaling?.requestCount,
  // v2 resolves template contents at creation; it does not retain a template link.
  templateId: null
});

let normalizeTemplate = (template: Resource): Resource => ({
  ...template,
  imageName: template.image,
  containerDiskInGb: template.disk,
  volumeInGb: template.mounts?.persistent?.size ?? null,
  volumeMountPath: template.mounts?.persistent?.path ?? null,
  isPublic: template.public,
  isServerless: template.serverless,
  dockerEntrypoint: template.entrypoint,
  dockerStartCmd: template.cmd,
  containerRegistryAuthId: template.registry
});

let normalizeVolume = (volume: Resource): Resource => ({
  ...volume,
  dataCenterId: volume.dataCenter
});

let containerBody = (data: Resource) =>
  pickDefined({
    name: data.name,
    image: data.imageName,
    disk: data.containerDiskInGb,
    env: data.env,
    ports: data.ports,
    entrypoint: data.dockerEntrypoint,
    cmd: data.dockerStartCmd,
    registry: data.containerRegistryAuthId
  });

export class RunPodClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A Runpod API key is required.');
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  private async request(
    method: string,
    path: string,
    data?: Resource,
    params?: Resource,
    serverless = false
  ): Promise<Resource> {
    return await requestAxiosData<Resource>(
      `${method.toUpperCase()} ${path}`,
      () =>
        (serverless ? serverlessApi : restApi).request({
          method,
          url: path,
          data,
          params,
          headers: this.headers,
          timeout: serverless && path.endsWith('/runsync') ? 100000 : 30000
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Runpod',
          operation,
          reason: 'runpod_api_error'
        })
    );
  }

  private async list(path: string, key: string, params: Resource = {}): Promise<Resource[]> {
    let items: Resource[] = [];
    let cursor: string | undefined;
    let seen = new Set<string>();
    do {
      let result = await this.request('get', path, undefined, {
        ...params,
        cursor,
        limit: 1000
      });
      if (!Array.isArray(result[key])) {
        throw createApiServiceError(`Runpod returned an invalid ${key} list.`, {
          reason: 'runpod_invalid_response'
        });
      }
      items.push(...result[key]);
      if (!result.pagination?.hasNextPage) break;
      cursor = result.pagination.nextCursor;
      if (!cursor || seen.has(cursor)) {
        throw createApiServiceError(
          'Runpod returned an invalid or repeated pagination cursor.'
        );
      }
      seen.add(cursor);
    } while (cursor);
    return items;
  }

  private async podMounts(podId: string, data: Resource) {
    if (data.volumeInGb === undefined && data.volumeMountPath === undefined) return undefined;
    let pod = await this.request('get', `/pods/${encodeURIComponent(podId)}`);
    if (pod.mounts?.persistent)
      return {
        persistent: {
          size: data.volumeInGb ?? pod.mounts.persistent.size,
          path: data.volumeMountPath ?? pod.mounts.persistent.path
        }
      };
    if (pod.mounts?.network?.[0] && data.volumeInGb === undefined)
      return {
        network: [
          {
            volumeId: pod.mounts.network[0].volumeId,
            path: data.volumeMountPath ?? pod.mounts.network[0].path
          }
        ]
      };
    throw createApiServiceError(
      'Pod mount kind cannot be changed after creation; create a Pod with the required storage.'
    );
  }

  private async resolveEndpointGpuModels(endpoints: Resource[]) {
    if (!endpoints.some(endpoint => endpoint.gpu)) return;
    let catalog = (await this.request('get', '/catalog/gpus')).gpus as Resource[];
    for (let endpoint of endpoints) {
      if (endpoint.gpu)
        endpoint.gpuTypeIds = catalog
          .filter(
            type =>
              endpoint.gpu.pools.includes(type.pool) &&
              !endpoint.gpu.excludedTypes?.includes(type.id)
          )
          .map(type => type.id);
    }
  }

  private async endpointBody(data: Resource, current?: Resource) {
    let body: Resource = containerBody(data);
    let cpu = data.computeType === 'CPU' || (data.computeType === undefined && current?.cpu);
    if (current && data.computeType && data.computeType !== (current.cpu ? 'CPU' : 'GPU')) {
      throw createApiServiceError('Endpoint compute type cannot be changed after creation.');
    }
    if (cpu) {
      if (
        data.gpuTypeIds?.length ||
        data.gpuPoolIds?.length ||
        data.gpuCount !== undefined ||
        data.allowedCudaVersions !== undefined ||
        data.minCudaVersion !== undefined
      )
        throw createApiServiceError('CPU endpoints cannot include GPU settings.');
      if (!current || data.cpuFlavorIds !== undefined || data.vcpuCount !== undefined) {
        let ids = data.cpuFlavorIds ?? current?.cpu?.map((item: Resource) => item.id);
        if (!ids?.length || (!current && data.vcpuCount === undefined))
          throw createApiServiceError(
            'CPU endpoints require cpuFlavorIds and vcpuCount. Call list_compute_types to discover CPU IDs.'
          );
        body.cpu = ids.map((id: string) => ({
          id,
          vcpuCount:
            data.vcpuCount ?? current?.cpu?.find((item: Resource) => item.id === id)?.vcpuCount
        }));
        if (body.cpu.some((item: Resource) => item.vcpuCount === undefined))
          throw createApiServiceError('Provide vcpuCount when selecting a new CPU flavor.');
      }
    } else {
      if (data.cpuFlavorIds?.length || data.vcpuCount !== undefined)
        throw createApiServiceError('GPU endpoints cannot include CPU settings.');
      if (
        !current ||
        data.gpuTypeIds !== undefined ||
        data.gpuPoolIds !== undefined ||
        data.gpuCount !== undefined ||
        data.allowedCudaVersions !== undefined ||
        data.minCudaVersion !== undefined
      ) {
        if (data.allowedCudaVersions?.length && data.minCudaVersion)
          throw createApiServiceError(
            'Provide allowedCudaVersions or minCudaVersion, not both.'
          );
        let gpu = pickDefined({
          count: data.gpuCount,
          allowedCudaVersions: data.allowedCudaVersions,
          minCudaVersion: data.minCudaVersion
        });
        if (current && data.gpuTypeIds === undefined && data.gpuPoolIds === undefined) {
          body.gpu = gpu;
        } else {
          if (data.gpuTypeIds !== undefined && data.gpuPoolIds !== undefined)
            throw createApiServiceError('Provide GPU model IDs or GPU pool IDs, not both.');
          let pools = data.gpuPoolIds ?? current?.gpu?.pools;
          let excludedTypes = current?.gpu?.excludedTypes;
          if (data.gpuTypeIds !== undefined) {
            let catalog = (await this.request('get', '/catalog/gpus')).gpus as Resource[];
            let selected = data.gpuTypeIds.map((id: string) =>
              catalog.find(type => type.id === id)
            );
            if (!selected.length || selected.some((type: Resource | undefined) => !type?.pool))
              throw createApiServiceError(
                'One or more GPU model IDs are not available for Serverless. Call list_compute_types and select models with a GPU pool.'
              );
            pools = [...new Set(selected.map((type: Resource | undefined) => type?.pool))];
            excludedTypes = catalog
              .filter(type => pools.includes(type.pool) && !data.gpuTypeIds.includes(type.id))
              .map(type => type.id);
          } else if (data.gpuPoolIds !== undefined) excludedTypes = [];
          if (!pools?.length)
            throw createApiServiceError(
              'GPU endpoints require gpuTypeIds or gpuPoolIds. Call list_compute_types to discover IDs.'
            );
          body.gpu = { ...pickDefined({ pools, excludedTypes }), ...gpu };
        }
      }
    }
    if (
      data.workersMin !== undefined ||
      data.workersMax !== undefined ||
      data.idleTimeout !== undefined
    ) {
      let min = data.workersMin ?? current?.workers?.min ?? 0;
      let max = data.workersMax ?? current?.workers?.max ?? 3;
      if (min > max)
        throw createApiServiceError('workersMin must be less than or equal to workersMax.');
      body.workers = pickDefined({ min, max, idleTimeout: data.idleTimeout });
    }
    if (!current || data.scalerType !== undefined || data.scalerValue !== undefined) {
      let type = data.scalerType ?? current?.scaling?.type ?? 'QUEUE_DELAY';
      let value =
        data.scalerValue ??
        (current?.scaling?.type === type
          ? (current?.scaling?.queueDelay ?? current?.scaling?.requestCount)
          : undefined) ??
        (type === 'QUEUE_DELAY' ? 4 : 1);
      if (
        (type === 'QUEUE_DELAY' && value < 0.5) ||
        (type === 'REQUEST_COUNT' && (!Number.isInteger(value) || value < 1))
      )
        throw createApiServiceError(
          'QUEUE_DELAY requires a threshold of at least 0.5; REQUEST_COUNT requires a positive integer.'
        );
      body.scaling =
        type === 'QUEUE_DELAY' ? { type, queueDelay: value } : { type, requestCount: value };
    }
    Object.assign(
      body,
      pickDefined({
        templateId: data.templateId,
        dataCenterIds: data.dataCenterIds,
        networkVolumes:
          data.networkVolumeIds ?? (data.networkVolumeId ? [data.networkVolumeId] : undefined),
        timeout: data.executionTimeoutMs,
        flashboot:
          data.flashboot === undefined ? undefined : data.flashboot ? 'FLASHBOOT' : 'OFF'
      })
    );
    return body;
  }
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
    let pods = (await this.list('/pods', 'pods')).map(normalizePod);
    return pods.filter(
      p =>
        (!params?.computeType || params.computeType === (p.cpu ? 'CPU' : 'GPU')) &&
        (!params?.desiredStatus || p.desiredStatus === params.desiredStatus) &&
        (!params?.name || p.name === params.name) &&
        (!params?.networkVolumeId || p.networkVolume?.id === params.networkVolumeId) &&
        (!params?.gpuTypeId?.length || params.gpuTypeId.includes(p.gpuTypeId)) &&
        (!params?.dataCenterId?.length || params.dataCenterId.includes(p.dataCenterId))
    );
  }

  async getPod(
    podId: string,
    _params?: {
      includeMachine?: boolean;
      includeNetworkVolume?: boolean;
      includeTemplate?: boolean;
    }
  ) {
    return normalizePod(await this.request('get', `/pods/${encodeURIComponent(podId)}`));
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
    volumeMountPath?: string;
    dockerEntrypoint?: string[];
    dockerStartCmd?: string[];
    containerRegistryAuthId?: string;
    minRAMPerGPU?: number;
    minVCPUPerGPU?: number;
    ports?: string[];
    env?: Record<string, string>;
    interruptible?: boolean;
    dataCenterIds?: string[];
    networkVolumeId?: string;
  }) {
    if (data.interruptible)
      throw createApiServiceError(
        'Spot/interruptible Pods are not supported by the current Runpod REST API. Use the Runpod console for spot deployments.'
      );
    let cpu = data.computeType === 'CPU';
    let ids = cpu ? data.cpuFlavorIds : data.gpuTypeIds;
    if (!ids || ids.length !== 1)
      throw createApiServiceError(
        'Pod creation requires exactly one compute type ID. Call list_compute_types to discover GPU or CPU IDs.'
      );
    if (
      cpu &&
      (data.gpuTypeIds?.length ||
        data.gpuCount !== undefined ||
        data.minRAMPerGPU !== undefined ||
        data.minVCPUPerGPU !== undefined)
    )
      throw createApiServiceError('CPU Pods cannot include GPU settings.');
    if (!cpu && (data.cpuFlavorIds?.length || data.vcpuCount !== undefined))
      throw createApiServiceError('GPU Pods cannot include CPU settings.');
    if (cpu && data.vcpuCount === undefined)
      throw createApiServiceError('CPU Pods require vcpuCount.');
    if (cpu && data.volumeInGb)
      throw createApiServiceError(
        'CPU Pods do not support host-local persistent volumes; use networkVolumeId.'
      );
    if (data.networkVolumeId && data.volumeInGb)
      throw createApiServiceError('networkVolumeId and volumeInGb cannot both be provided.');
    let body: Resource = {
      ...containerBody(data),
      name: data.name ?? 'Pod',
      cloud: data.cloudType ?? 'SECURE'
    };
    if (cpu) body.cpu = { id: ids[0], vcpuCount: data.vcpuCount };
    else
      body.gpu = pickDefined({
        id: ids[0],
        count: data.gpuCount,
        minRamPerGpu: data.minRAMPerGPU,
        minVcpuCountPerGpu: data.minVCPUPerGPU
      });
    if (data.networkVolumeId)
      body.mounts = {
        network: [
          { volumeId: data.networkVolumeId, path: data.volumeMountPath ?? '/workspace' }
        ]
      };
    else if (data.volumeInGb)
      body.mounts = {
        persistent: { size: data.volumeInGb, path: data.volumeMountPath ?? '/workspace' }
      };
    else if (data.volumeMountPath !== undefined)
      throw createApiServiceError(
        'Provide networkVolumeId or volumeInGb with volumeMountPath.'
      );
    body.dataCenterIds = data.dataCenterIds;
    return normalizePod(await this.request('post', '/pods', body));
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
    let body = {
      ...containerBody(data),
      ...pickDefined({
        locked: data.locked,
        globalNetworking: data.globalNetworking,
        mounts: await this.podMounts(podId, data)
      })
    };
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one Pod setting to update.');
    return normalizePod(
      await this.request('patch', `/pods/${encodeURIComponent(podId)}`, body)
    );
  }

  async startPod(podId: string) {
    return await this.request('post', `/pods/${encodeURIComponent(podId)}/action`, {
      action: 'start'
    });
  }

  async stopPod(podId: string) {
    return await this.request('post', `/pods/${encodeURIComponent(podId)}/action`, {
      action: 'stop'
    });
  }

  async restartPod(podId: string) {
    return await this.request('post', `/pods/${encodeURIComponent(podId)}/action`, {
      action: 'restart'
    });
  }

  async resetPod(_podId: string) {
    throw createApiServiceError(
      'Reset is no longer supported by the Runpod REST API. Use restart to restart the Pod, or recreate it for a fresh container disk.'
    );
  }

  async deletePod(podId: string) {
    return await this.request('delete', `/pods/${encodeURIComponent(podId)}`);
  }

  async listEndpoints(params?: { includeTemplate?: boolean; includeWorkers?: boolean }) {
    let endpoints = (await this.list('/serverless', 'endpoints')).map(normalizeEndpoint);
    await this.resolveEndpointGpuModels(endpoints);
    if (params?.includeWorkers) {
      for (let endpoint of endpoints)
        endpoint.workerDetails = await this.getEndpointWorkers(endpoint.id);
    }
    return endpoints;
  }

  async getEndpoint(
    endpointId: string,
    params?: {
      includeTemplate?: boolean;
      includeWorkers?: boolean;
    }
  ) {
    let endpoint = normalizeEndpoint(
      await this.request('get', `/serverless/${encodeURIComponent(endpointId)}`)
    );
    await this.resolveEndpointGpuModels([endpoint]);
    if (params?.includeWorkers)
      endpoint.workerDetails = await this.getEndpointWorkers(endpointId);
    return endpoint;
  }

  private async getEndpointWorkers(endpointId: string): Promise<Resource[]> {
    let result = await this.request(
      'get',
      `/serverless/${encodeURIComponent(endpointId)}/workers`
    );
    if (!Array.isArray(result.workers))
      throw createApiServiceError('Runpod returned an invalid worker list.');
    return result.workers;
  }

  async createEndpoint(data: {
    templateId: string;
    name?: string;
    computeType?: string;
    gpuCount?: number;
    gpuTypeIds?: string[];
    gpuPoolIds?: string[];
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
    let body = await this.endpointBody(data);
    body.name = data.name ?? 'Serverless endpoint';
    body.type = 'QUEUE';
    return normalizeEndpoint(await this.request('post', '/serverless', body));
  }

  async updateEndpoint(
    endpointId: string,
    data: {
      templateId?: string;
      name?: string;
      computeType?: string;
      gpuCount?: number;
      gpuTypeIds?: string[];
      gpuPoolIds?: string[];
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
    let current = await this.request('get', `/serverless/${encodeURIComponent(endpointId)}`);
    let body = await this.endpointBody(data, current);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one endpoint setting to update.');
    return normalizeEndpoint(
      await this.request('patch', `/serverless/${encodeURIComponent(endpointId)}`, body)
    );
  }

  async deleteEndpoint(endpointId: string) {
    return await this.request('delete', `/serverless/${encodeURIComponent(endpointId)}`);
  }

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
    return await this.request(
      'post',
      `/${encodeURIComponent(endpointId)}/run`,
      data,
      undefined,
      true
    );
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
    return await this.request(
      'post',
      `/${encodeURIComponent(endpointId)}/runsync`,
      data,
      undefined,
      true
    );
  }

  async getJobStatus(endpointId: string, jobId: string) {
    return await this.request(
      'get',
      `/${encodeURIComponent(endpointId)}/status/${encodeURIComponent(jobId)}`,
      undefined,
      undefined,
      true
    );
  }

  async streamJob(endpointId: string, jobId: string) {
    return await this.request(
      'get',
      `/${encodeURIComponent(endpointId)}/stream/${encodeURIComponent(jobId)}`,
      undefined,
      undefined,
      true
    );
  }

  async cancelJob(endpointId: string, jobId: string) {
    return await this.request(
      'post',
      `/${encodeURIComponent(endpointId)}/cancel/${encodeURIComponent(jobId)}`,
      undefined,
      undefined,
      true
    );
  }

  async retryJob(endpointId: string, jobId: string) {
    return await this.request(
      'post',
      `/${encodeURIComponent(endpointId)}/retry/${encodeURIComponent(jobId)}`,
      undefined,
      undefined,
      true
    );
  }

  async purgeQueue(endpointId: string) {
    return await this.request(
      'post',
      `/${encodeURIComponent(endpointId)}/purge-queue`,
      undefined,
      undefined,
      true
    );
  }

  async getEndpointHealth(endpointId: string) {
    return await this.request(
      'get',
      `/${encodeURIComponent(endpointId)}/health`,
      undefined,
      undefined,
      true
    );
  }

  async listNetworkVolumes() {
    let result = await this.request('get', '/network-volumes');
    if (!Array.isArray(result.networkVolumes))
      throw createApiServiceError('Runpod returned an invalid network volume list.');
    return result.networkVolumes.map(normalizeVolume);
  }

  async getNetworkVolume(networkVolumeId: string) {
    return normalizeVolume(
      await this.request('get', `/network-volumes/${encodeURIComponent(networkVolumeId)}`)
    );
  }

  async createNetworkVolume(data: { name: string; size: number; dataCenterId: string }) {
    return normalizeVolume(
      await this.request('post', '/network-volumes', {
        name: data.name,
        size: data.size,
        dataCenter: data.dataCenterId
      })
    );
  }

  async updateNetworkVolume(
    networkVolumeId: string,
    data: {
      name?: string;
      size?: number;
    }
  ) {
    let body = pickDefined(data);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide a name or size to update the network volume.');
    return normalizeVolume(
      await this.request(
        'patch',
        `/network-volumes/${encodeURIComponent(networkVolumeId)}`,
        body
      )
    );
  }

  async deleteNetworkVolume(networkVolumeId: string) {
    return await this.request(
      'delete',
      `/network-volumes/${encodeURIComponent(networkVolumeId)}`
    );
  }

  async listTemplates(params?: {
    includeEndpointBoundTemplates?: boolean;
    includePublicTemplates?: boolean;
    includeRunpodTemplates?: boolean;
  }) {
    let templates = await this.list('/templates', 'templates');
    let sources = [
      ...(params?.includeRunpodTemplates ? ['official'] : []),
      ...(params?.includePublicTemplates ? ['verified', 'community'] : [])
    ];
    for (let source of sources) {
      let catalog = await this.request('get', '/catalog/templates', undefined, { source });
      if (!Array.isArray(catalog.templates))
        throw createApiServiceError('Runpod returned an invalid public template catalog.');
      templates.push(...catalog.templates);
    }
    return [...new Map(templates.map(t => [t.id, t])).values()].map(normalizeTemplate);
  }

  async getTemplate(templateId: string) {
    return normalizeTemplate(
      await this.request('get', `/templates/${encodeURIComponent(templateId)}`)
    );
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
    if (data.readme !== undefined)
      throw createApiServiceError(
        'Template readme is not supported by the current Runpod REST API. Omit readme.'
      );
    let body: Resource = {
      ...containerBody(data),
      ...pickDefined({
        category: data.category,
        public: data.isPublic,
        serverless: data.isServerless
      })
    };
    if (data.volumeInGb !== undefined)
      body.mounts = {
        persistent: { size: data.volumeInGb, path: data.volumeMountPath ?? '/workspace' }
      };
    else if (data.volumeMountPath !== undefined)
      throw createApiServiceError(
        'Provide volumeInGb with volumeMountPath when creating a template.'
      );
    return normalizeTemplate(await this.request('post', '/templates', body));
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
    if (data.readme !== undefined)
      throw createApiServiceError(
        'Template readme is not supported by the current Runpod REST API. Omit readme.'
      );
    let body: Resource = {
      ...containerBody(data),
      ...pickDefined({
        category: data.category,
        public: data.isPublic,
        serverless: data.isServerless
      })
    };
    if (data.volumeInGb !== undefined || data.volumeMountPath !== undefined) {
      let current = await this.request('get', `/templates/${encodeURIComponent(templateId)}`);
      let size = data.volumeInGb ?? current.mounts?.persistent?.size;
      if (size === undefined)
        throw createApiServiceError(
          'Provide volumeInGb when adding a template persistent mount.'
        );
      body.mounts = {
        persistent: {
          size,
          path: data.volumeMountPath ?? current.mounts?.persistent?.path ?? '/workspace'
        }
      };
    }
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one template setting to update.');
    return normalizeTemplate(
      await this.request('patch', `/templates/${encodeURIComponent(templateId)}`, body)
    );
  }

  async deleteTemplate(templateId: string) {
    return await this.request('delete', `/templates/${encodeURIComponent(templateId)}`);
  }

  async listContainerRegistryAuths() {
    return (await this.request('get', '/registries')).registries;
  }

  async getContainerRegistryAuth(containerRegistryAuthId: string) {
    return await this.request(
      'get',
      `/registries/${encodeURIComponent(containerRegistryAuthId)}`
    );
  }

  async createContainerRegistryAuth(data: {
    name: string;
    username: string;
    password: string;
  }) {
    return await this.request('post', '/registries', data);
  }

  async deleteContainerRegistryAuth(containerRegistryAuthId: string) {
    return await this.request(
      'delete',
      `/registries/${encodeURIComponent(containerRegistryAuthId)}`
    );
  }

  async getPodBilling(params?: {
    bucketSize?: string;
    startTime?: string;
    endTime?: string;
    podId?: string;
    gpuTypeId?: string;
    grouping?: string;
  }) {
    return await this.billing('/billing/pods', params);
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
    return await this.billing(
      '/billing/serverless',
      params && { ...params, serverlessId: params.endpointId, endpointId: undefined }
    );
  }

  async getNetworkVolumeBilling(params?: {
    bucketSize?: string;
    startTime?: string;
    endTime?: string;
    networkVolumeId?: string;
  }) {
    return await this.billing('/billing/network-volumes', params);
  }

  private async billing(path: string, params?: Resource) {
    if (params?.gpuTypeId || params?.grouping)
      throw createApiServiceError(
        'GPU filtering and custom grouping are not supported by the current Runpod billing API. Omit gpuTypeId and grouping.'
      );
    let result = await this.request(
      'get',
      path,
      undefined,
      pickDefined({
        bucketSize: params?.bucketSize,
        startTime: params?.startTime,
        endTime: params?.endTime,
        podId: params?.podId,
        serverlessId: params?.serverlessId,
        networkVolumeId: params?.networkVolumeId
      })
    );
    if (!Array.isArray(result.records))
      throw createApiServiceError('Runpod returned invalid billing records.');
    return result.records.map((record: Resource) => ({
      ...record,
      amount: record.totalAmount,
      time: record.startTime,
      endpointId: record.serverlessId
    }));
  }

  async getCurrentUser() {
    let result = await requestAxiosData<Resource>(
      'get current user',
      () =>
        graphqlApi.post(
          '/graphql',
          { query: 'query { myself { id email clientBalance currentSpendPerHr isTeam } }' },
          { headers: this.headers, timeout: 30000 }
        ),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Runpod',
          operation,
          reason: 'runpod_api_error'
        })
    );
    if (result.errors?.length)
      throw createApiServiceError(
        `Runpod current user query failed: ${result.errors.map((error: Resource) => error.message).join('; ')}`,
        { reason: 'runpod_api_error' }
      );
    if (!result.data?.myself?.id)
      throw createApiServiceError(
        'Runpod did not return the current user. Check the API key permissions.'
      );
    return result.data.myself;
  }

  async listComputeTypes() {
    let [gpus, cpus] = await Promise.all([
      this.request('get', '/catalog/gpus'),
      this.request('get', '/catalog/cpus')
    ]);
    return { gpus: gpus.gpus, cpus: cpus.cpus };
  }

  async listDataCenters() {
    return (await this.request('get', '/catalog/datacenters')).dataCenters;
  }
}
