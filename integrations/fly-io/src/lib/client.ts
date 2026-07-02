import { createAxios } from 'slates';
import { flyIoApiError } from './errors';

export class FlyClient {
  private axios;

  constructor(options: { token: string; tokenScheme: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: options.baseUrl,
      headers: {
        Authorization: `${options.tokenScheme} ${options.token}`,
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(flyIoApiError(error))
    );
  }

  // ─── Apps ───────────────────────────────────────────────

  async listApps(
    orgSlug: string,
    params?: { appRole?: string }
  ): Promise<{ totalApps: number; apps: FlyApp[] }> {
    let response = await this.axios.get('/v1/apps', {
      params: { org_slug: orgSlug, app_role: params?.appRole }
    });
    return {
      totalApps: response.data.total_apps,
      apps: (response.data.apps || []).map(mapApp)
    };
  }

  async getApp(appName: string): Promise<FlyAppDetail> {
    let response = await this.axios.get(`/v1/apps/${appName}`);
    return mapAppDetail(response.data);
  }

  async createApp(params: {
    appName: string;
    orgSlug: string;
    network?: string;
    enableSubdomains?: boolean;
  }): Promise<{ appId: string; createdAt: number }> {
    let response = await this.axios.post('/v1/apps', {
      app_name: params.appName,
      org_slug: params.orgSlug,
      network: params.network,
      enable_subdomains: params.enableSubdomains
    });
    return {
      appId: response.data.id,
      createdAt: response.data.created_at
    };
  }

  async deleteApp(appName: string, force?: boolean): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}`, {
      params: force ? { force: true } : undefined
    });
  }

  async listIpAssignments(appName: string): Promise<FlyIpAssignment[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/ip_assignments`);
    return (response.data.ips || []).map(mapIpAssignment);
  }

  async assignIpAddress(
    appName: string,
    params: AssignIpAddressParams
  ): Promise<FlyIpAssignment> {
    let response = await this.axios.post(`/v1/apps/${appName}/ip_assignments`, {
      type: params.type,
      region: params.region,
      org_slug: params.orgSlug,
      network: params.network,
      service_name: params.serviceName
    });
    return mapIpAssignment(response.data);
  }

  async deleteIpAssignment(appName: string, ipAddress: string): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/ip_assignments/${ipAddress}`);
  }

  // ─── Machines ───────────────────────────────────────────

  async listMachines(
    appName: string,
    params?: {
      includeDeleted?: boolean;
      region?: string;
      state?: string;
      summary?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<FlyMachine[]> {
    let queryParams: Record<string, string> = {};
    if (params?.includeDeleted) queryParams.include_deleted = 'true';
    if (params?.region) queryParams.region = params.region;
    if (params?.state) queryParams.state = params.state;
    if (params?.summary !== undefined) queryParams.summary = String(params.summary);
    if (params?.metadata) {
      for (let [key, value] of Object.entries(params.metadata)) {
        queryParams[`metadata.${key}`] = value;
      }
    }
    let response = await this.axios.get(`/v1/apps/${appName}/machines`, {
      params: queryParams
    });
    return (response.data || []).map(mapMachine);
  }

  async getMachine(appName: string, machineId: string): Promise<FlyMachine> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}`);
    return mapMachine(response.data);
  }

  async createMachine(appName: string, params: CreateMachineParams): Promise<FlyMachine> {
    let body: Record<string, any> = {
      config: buildMachineConfig(params.config)
    };
    if (params.name) body.name = params.name;
    if (params.region) body.region = params.region;
    if (params.skipLaunch !== undefined) body.skip_launch = params.skipLaunch;
    if (params.skipServiceRegistration !== undefined)
      body.skip_service_registration = params.skipServiceRegistration;
    if (params.skipSecrets !== undefined) body.skip_secrets = params.skipSecrets;
    if (params.minSecretsVersion !== undefined)
      body.min_secrets_version = params.minSecretsVersion;
    if (params.leaseTtl !== undefined) body.lease_ttl = params.leaseTtl;

    let response = await this.axios.post(`/v1/apps/${appName}/machines`, body);
    return mapMachine(response.data);
  }

  async updateMachine(
    appName: string,
    machineId: string,
    params: UpdateMachineParams
  ): Promise<FlyMachine> {
    let body: Record<string, any> = {
      config: buildMachineConfig(params.config)
    };
    if (params.name) body.name = params.name;
    if (params.skipLaunch !== undefined) body.skip_launch = params.skipLaunch;
    if (params.skipServiceRegistration !== undefined)
      body.skip_service_registration = params.skipServiceRegistration;
    if (params.skipSecrets !== undefined) body.skip_secrets = params.skipSecrets;
    if (params.minSecretsVersion !== undefined)
      body.min_secrets_version = params.minSecretsVersion;
    if (params.leaseTtl !== undefined) body.lease_ttl = params.leaseTtl;
    if (params.currentVersion) body.current_version = params.currentVersion;
    if (params.leaseNonce) {
      let response = await this.axios.post(`/v1/apps/${appName}/machines/${machineId}`, body, {
        headers: { 'fly-machine-lease-nonce': params.leaseNonce }
      });
      return mapMachine(response.data);
    }
    let response = await this.axios.post(`/v1/apps/${appName}/machines/${machineId}`, body);
    return mapMachine(response.data);
  }

  async startMachine(
    appName: string,
    machineId: string
  ): Promise<{ previousState: string; migrated: boolean; newHost: string }> {
    let response = await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/start`);
    return {
      previousState: response.data.previous_state,
      migrated: response.data.migrated,
      newHost: response.data.new_host || ''
    };
  }

  async stopMachine(
    appName: string,
    machineId: string,
    params?: { signal?: string; timeout?: string }
  ): Promise<void> {
    await this.axios.post(
      `/v1/apps/${appName}/machines/${machineId}/stop`,
      params
        ? {
            signal: params.signal,
            timeout: params.timeout
          }
        : undefined
    );
  }

  async restartMachine(
    appName: string,
    machineId: string,
    params?: { signal?: string; timeout?: string }
  ): Promise<void> {
    let queryParams: Record<string, string> = {};
    if (params?.signal) queryParams.signal = params.signal;
    if (params?.timeout) queryParams.timeout = params.timeout;
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/restart`, undefined, {
      params: queryParams
    });
  }

  async signalMachine(appName: string, machineId: string, signal: string): Promise<void> {
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/signal`, { signal });
  }

  async deleteMachine(appName: string, machineId: string, force?: boolean): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/machines/${machineId}`, {
      params: force ? { force: true } : undefined
    });
  }

  async suspendMachine(appName: string, machineId: string): Promise<void> {
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/suspend`);
  }

  async waitForMachine(
    appName: string,
    machineId: string,
    params: { state: string; timeout?: number; instanceId?: string }
  ): Promise<void> {
    let queryParams: Record<string, string> = { state: params.state };
    if (params.timeout) queryParams.timeout = String(params.timeout);
    if (params.instanceId) queryParams.instance_id = params.instanceId;
    await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/wait`, {
      params: queryParams
    });
  }

  async cordonMachine(appName: string, machineId: string): Promise<void> {
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/cordon`);
  }

  async uncordonMachine(appName: string, machineId: string): Promise<void> {
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/uncordon`);
  }

  async listMachineEvents(
    appName: string,
    machineId: string,
    params?: { limit?: number }
  ): Promise<FlyMachineEvent[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/events`, {
      params
    });
    return (response.data || []).map(mapMachineEvent);
  }

  async listMachineProcesses(
    appName: string,
    machineId: string,
    params?: { sortBy?: string; order?: string }
  ): Promise<FlyMachineProcess[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/ps`, {
      params: {
        sort_by: params?.sortBy,
        order: params?.order
      }
    });
    return (response.data || []).map(mapMachineProcess);
  }

  async listMachineVersions(appName: string, machineId: string): Promise<FlyMachineVersion[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/versions`);
    return (response.data || []).map(mapMachineVersion);
  }

  async getMachineMemory(appName: string, machineId: string): Promise<FlyMachineMemory> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/memory`);
    return mapMachineMemory(response.data);
  }

  // ─── Machine Metadata ──────────────────────────────────

  async getMachineMetadata(
    appName: string,
    machineId: string
  ): Promise<Record<string, string>> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/metadata`);
    return response.data || {};
  }

  async setMachineMetadata(
    appName: string,
    machineId: string,
    key: string,
    value: string
  ): Promise<void> {
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/metadata/${key}`, {
      value
    });
  }

  async deleteMachineMetadata(appName: string, machineId: string, key: string): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/machines/${machineId}/metadata/${key}`);
  }

  // ─── Machine Leases ────────────────────────────────────

  async createLease(
    appName: string,
    machineId: string,
    params?: { ttl?: number; description?: string }
  ): Promise<{ nonce: string; expiresAt: number; version: string }> {
    let response = await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/lease`, {
      ttl: params?.ttl,
      description: params?.description
    });
    return {
      nonce: response.data.nonce,
      expiresAt: response.data.expires_at,
      version: response.data.version
    };
  }

  async getLease(
    appName: string,
    machineId: string
  ): Promise<{ nonce: string; expiresAt: number; version: string } | null> {
    let response = await this.axios.get(`/v1/apps/${appName}/machines/${machineId}/lease`);
    if (!response.data?.nonce) return null;
    return {
      nonce: response.data.nonce,
      expiresAt: response.data.expires_at,
      version: response.data.version
    };
  }

  async releaseLease(appName: string, machineId: string, nonce: string): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/machines/${machineId}/lease`, {
      headers: { 'fly-machine-lease-nonce': nonce }
    });
  }

  // ─── Volumes ────────────────────────────────────────────

  async listVolumes(appName: string): Promise<FlyVolume[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/volumes`);
    return (response.data || []).map(mapVolume);
  }

  async getVolume(appName: string, volumeId: string): Promise<FlyVolume> {
    let response = await this.axios.get(`/v1/apps/${appName}/volumes/${volumeId}`);
    return mapVolume(response.data);
  }

  async createVolume(appName: string, params: CreateVolumeParams): Promise<FlyVolume> {
    let response = await this.axios.post(`/v1/apps/${appName}/volumes`, {
      name: params.name,
      region: params.region,
      size_gb: params.sizeGb,
      encrypted: params.encrypted,
      snapshot_retention: params.snapshotRetention,
      auto_backup_enabled: params.autoBackupEnabled,
      snapshot_id: params.snapshotId
    });
    return mapVolume(response.data);
  }

  async updateVolume(
    appName: string,
    volumeId: string,
    params: { snapshotRetention?: number; autoBackupEnabled?: boolean }
  ): Promise<FlyVolume> {
    let response = await this.axios.put(`/v1/apps/${appName}/volumes/${volumeId}`, {
      snapshot_retention: params.snapshotRetention,
      auto_backup_enabled: params.autoBackupEnabled
    });
    return mapVolume(response.data);
  }

  async deleteVolume(appName: string, volumeId: string): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/volumes/${volumeId}`);
  }

  async extendVolume(
    appName: string,
    volumeId: string,
    sizeGb: number
  ): Promise<{ needsRestart: boolean; volume: FlyVolume }> {
    let response = await this.axios.put(`/v1/apps/${appName}/volumes/${volumeId}/extend`, {
      size_gb: sizeGb
    });
    return {
      needsRestart: response.data.needs_restart || false,
      volume: mapVolume(response.data.volume || response.data)
    };
  }

  async listVolumeSnapshots(appName: string, volumeId: string): Promise<FlySnapshot[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/volumes/${volumeId}/snapshots`);
    return (response.data || []).map(mapSnapshot);
  }

  async createVolumeSnapshot(appName: string, volumeId: string): Promise<void> {
    await this.axios.post(`/v1/apps/${appName}/volumes/${volumeId}/snapshots`);
  }

  // ─── Secrets ────────────────────────────────────────────

  async listSecrets(appName: string, params?: { minVersion?: string }): Promise<FlySecret[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/secrets`, {
      params: {
        min_version: params?.minVersion
      }
    });
    return (response.data.secrets || []).map(mapSecret);
  }

  async getSecret(appName: string, secretName: string): Promise<FlySecret> {
    let response = await this.axios.get(`/v1/apps/${appName}/secrets/${secretName}`);
    return mapSecret(response.data);
  }

  async setSecrets(
    appName: string,
    secrets: Record<string, string>
  ): Promise<{ version: number; secrets: FlySecret[] }> {
    let response = await this.axios.post(`/v1/apps/${appName}/secrets`, {
      values: secrets
    });
    return {
      version: response.data.version ?? response.data.Version ?? 0,
      secrets: (response.data.secrets || []).map(mapSecret)
    };
  }

  async setSecret(
    appName: string,
    secretName: string,
    value: string
  ): Promise<{ version: number; secret: FlySecret }> {
    let response = await this.axios.post(`/v1/apps/${appName}/secrets/${secretName}`, {
      value
    });
    return {
      version: response.data.version ?? response.data.Version ?? 0,
      secret: mapSecret(response.data)
    };
  }

  async deleteSecret(appName: string, secretName: string): Promise<{ version: number }> {
    let response = await this.axios.delete(`/v1/apps/${appName}/secrets/${secretName}`);
    return {
      version: response.data?.version ?? response.data?.Version ?? 0
    };
  }

  // ─── Certificates ──────────────────────────────────────

  async listCertificates(
    appName: string,
    params?: { filter?: string; cursor?: string; limit?: number }
  ): Promise<FlyCertificate[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/certificates`, { params });
    let certificates = Array.isArray(response.data)
      ? response.data
      : response.data.certificates || [];
    return certificates.map(mapCertificate);
  }

  async getCertificate(appName: string, hostname: string): Promise<FlyCertificate> {
    let response = await this.axios.get(`/v1/apps/${appName}/certificates/${hostname}`);
    return mapCertificate(response.data);
  }

  async requestAcmeCertificate(appName: string, hostname: string): Promise<FlyCertificate> {
    let response = await this.axios.post(`/v1/apps/${appName}/certificates/acme`, {
      hostname
    });
    return mapCertificate(response.data);
  }

  async importCustomCertificate(
    appName: string,
    params: { hostname: string; fullchain: string; privateKey: string }
  ): Promise<FlyCertificate> {
    let response = await this.axios.post(`/v1/apps/${appName}/certificates/custom`, {
      hostname: params.hostname,
      fullchain: params.fullchain,
      private_key: params.privateKey
    });
    return mapCertificate(response.data);
  }

  async checkCertificate(appName: string, hostname: string): Promise<FlyCertificate> {
    let response = await this.axios.post(`/v1/apps/${appName}/certificates/${hostname}/check`);
    return mapCertificate(response.data);
  }

  async deleteCertificate(appName: string, hostname: string): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/certificates/${hostname}`);
  }

  async deleteAcmeCertificate(appName: string, hostname: string): Promise<FlyCertificate> {
    let response = await this.axios.delete(
      `/v1/apps/${appName}/certificates/${hostname}/acme`
    );
    return mapCertificate(response.data);
  }

  async deleteCustomCertificate(appName: string, hostname: string): Promise<FlyCertificate> {
    let response = await this.axios.delete(
      `/v1/apps/${appName}/certificates/${hostname}/custom`
    );
    return mapCertificate(response.data);
  }

  // ─── OIDC Tokens ───────────────────────────────────────

  async requestOidcToken(aud?: string): Promise<string> {
    let response = await this.axios.post('/v1/tokens/oidc', { aud });
    return response.data;
  }

  // ─── Organization and Platform ───────────────────────────

  async listOrgMachines(
    orgSlug: string,
    params?: OrgInventoryParams
  ): Promise<FlyOrgMachinesResponse> {
    let response = await this.axios.get(`/v1/orgs/${orgSlug}/machines`, {
      params: buildOrgInventoryParams(params)
    });
    return {
      machines: (response.data.machines || []).map(mapOrgMachine),
      nextCursor: response.data.next_cursor || '',
      lastMachineId: response.data.last_machine_id || '',
      lastUpdatedAt: response.data.last_updated_at || '',
      errorRegions: response.data.error_regions || []
    };
  }

  async listOrgVolumes(
    orgSlug: string,
    params?: OrgInventoryParams
  ): Promise<FlyOrgVolumesResponse> {
    let response = await this.axios.get(`/v1/orgs/${orgSlug}/volumes`, {
      params: buildOrgInventoryParams(params)
    });
    return {
      volumes: (response.data.volumes || []).map(mapOrgVolume),
      nextCursor: response.data.next_cursor || '',
      lastVolumeId: response.data.last_volume_id || '',
      lastUpdatedAt: response.data.last_updated_at || ''
    };
  }

  async listRegions(): Promise<FlyRegionsResponse> {
    let response = await this.axios.get('/v1/platform/regions');
    return {
      nearest: response.data.nearest || '',
      regions: (response.data.regions || []).map(mapRegion)
    };
  }
}

// ─── Types ──────────────────────────────────────────────

export interface FlyApp {
  appId: string;
  appName: string;
  machineCount: number;
  volumeCount: number;
  network: string;
}

export interface FlyAppDetail {
  appId: string;
  appName: string;
  status: string;
  organization: {
    name: string;
    slug: string;
  };
}

export interface FlyIpAssignment {
  ipAddress: string;
  region: string;
  serviceName: string;
  shared: boolean;
  createdAt: string;
}

export interface AssignIpAddressParams {
  type: string;
  orgSlug?: string;
  region?: string;
  network?: string;
  serviceName?: string;
}

export interface FlyMachine {
  machineId: string;
  machineName: string;
  state: string;
  region: string;
  instanceId: string;
  privateIp: string;
  config: Record<string, any>;
  imageRef: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  events: Record<string, any>[];
}

export interface CreateMachineParams {
  name?: string;
  region?: string;
  skipLaunch?: boolean;
  skipServiceRegistration?: boolean;
  skipSecrets?: boolean;
  minSecretsVersion?: number;
  leaseTtl?: number;
  config: MachineConfig;
}

export interface UpdateMachineParams {
  config: MachineConfig;
  leaseNonce?: string;
  leaseTtl?: number;
  currentVersion?: string;
  name?: string;
  skipLaunch?: boolean;
  skipServiceRegistration?: boolean;
  skipSecrets?: boolean;
  minSecretsVersion?: number;
}

export interface MachineConfig {
  image: string;
  env?: Record<string, string>;
  guest?: {
    cpus?: number;
    memoryMb?: number;
    maxMemoryMb?: number;
    cpuKind?: string;
    gpuKind?: string;
    gpus?: number;
    hostDedicationId?: string;
    kernelArgs?: string[];
  };
  size?: string;
  services?: Array<{
    ports: Array<{
      port: number;
      startPort?: number;
      endPort?: number;
      handlers?: string[];
      forceHttps?: boolean;
    }>;
    protocol: string;
    internalPort: number;
    autostop?: 'off' | 'stop' | 'suspend';
    autostart?: boolean;
    autoStopMachines?: boolean;
    autoStartMachines?: boolean;
    minMachinesRunning?: number;
    concurrency?: {
      type?: string;
      softLimit?: number;
      hardLimit?: number;
    };
  }>;
  mounts?: Array<{
    volume: string;
    path: string;
    name?: string;
    sizeGb?: number;
    addSizeGb?: number;
    encrypted?: boolean;
    extendThresholdPercent?: number;
    sizeGbLimit?: number;
  }>;
  init?: {
    exec?: string[];
    entrypoint?: string[];
    cmd?: string[];
    kernelArgs?: string[];
    swapSizeMb?: number;
    tty?: boolean;
  };
  restart?: {
    policy?: 'no' | 'on-failure' | 'always' | 'spot-price';
    maxRetries?: number;
    gpuBidPrice?: number;
  };
  metadata?: Record<string, string>;
  metrics?: {
    port?: number;
    path?: string;
    https?: boolean;
  };
  schedule?: string;
  autoDestroy?: boolean;
  checks?: Record<string, any>;
  statics?: Array<{ guestPath: string; urlPrefix: string; indexDocument?: string }>;
  dns?: Record<string, any>;
  stopConfig?: { signal?: string; timeout?: string };
  standbys?: string[];
  rootfs?: {
    persist?: 'never' | 'always' | 'restart';
    sizeGb?: number;
  };
  files?: Record<string, any>[];
  processes?: Record<string, any>[];
  containers?: Record<string, any>[];
  cacheDrive?: Record<string, any>;
  spot?: Record<string, any>;
}

export interface FlyMachineEvent {
  eventId: string;
  type: string;
  status: string;
  source: string;
  timestamp: number;
  request: Record<string, any>;
}

export interface FlyMachineProcess {
  pid: number;
  command: string;
  directory: string;
  cpu: number;
  rss: number;
  rtime: number;
  stime: number;
  listenSockets: Array<{ address: string; proto: string }>;
}

export interface FlyMachineVersion {
  version: string;
  userConfig: Record<string, any>;
}

export interface FlyMachineMemory {
  limitMb: number;
  availableMb: number;
}

export interface FlyVolume {
  volumeId: string;
  volumeName: string;
  state: string;
  sizeGb: number;
  region: string;
  zone: string;
  encrypted: boolean;
  snapshotRetention: number;
  autoBackupEnabled: boolean;
  attachedMachineId: string | null;
  createdAt: string;
}

export interface CreateVolumeParams {
  name: string;
  region?: string;
  sizeGb?: number;
  encrypted?: boolean;
  snapshotRetention?: number;
  autoBackupEnabled?: boolean;
  snapshotId?: string;
}

export interface FlySnapshot {
  snapshotId: string;
  sizeGb: number;
  createdAt: string;
  status: string;
}

export interface FlySecret {
  secretName: string;
  digest: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlyCertificate {
  hostname: string;
  status: string;
  configured: boolean;
  dnsProvider: string;
  certificates: Array<{
    source: string;
    status: string;
    expiresAt: string;
  }>;
  dnsRequirements: Record<string, any>;
  validation: Record<string, any>;
}

export interface OrgInventoryParams {
  includeDeleted?: boolean;
  region?: string;
  state?: string;
  summary?: boolean;
  updatedAfter?: string;
  cursor?: string;
  limit?: number;
}

export interface FlyOrgMachine {
  appName: string;
  machineId: string;
  machineName: string;
  state: string;
  region: string;
  privateIp: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  config: Record<string, any>;
}

export interface FlyOrgMachinesResponse {
  machines: FlyOrgMachine[];
  nextCursor: string;
  lastMachineId: string;
  lastUpdatedAt: string;
  errorRegions: string[];
}

export interface FlyOrgVolume {
  appName: string;
  volumeId: string;
  volumeName: string;
  state: string;
  sizeGb: number;
  region: string;
  zone: string;
  encrypted: boolean;
  attachedMachineId: string | null;
  autoBackupEnabled: boolean;
  snapshotRetention: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlyOrgVolumesResponse {
  volumes: FlyOrgVolume[];
  nextCursor: string;
  lastVolumeId: string;
  lastUpdatedAt: string;
}

export interface FlyRegion {
  code: string;
  name: string;
  geoRegion: string;
  latitude: number;
  longitude: number;
  gatewayAvailable: boolean;
  requiresPaidPlan: boolean;
  deprecated: boolean;
}

export interface FlyRegionsResponse {
  nearest: string;
  regions: FlyRegion[];
}

// ─── Mappers ────────────────────────────────────────────

let mapApp = (data: any): FlyApp => ({
  appId: data.id || '',
  appName: data.name || '',
  machineCount: data.machine_count || 0,
  volumeCount: data.volume_count || 0,
  network: data.network || ''
});

let mapAppDetail = (data: any): FlyAppDetail => ({
  appId: data.id || '',
  appName: data.name || '',
  status: data.status || '',
  organization: {
    name: data.organization?.name || '',
    slug: data.organization?.slug || ''
  }
});

let mapIpAssignment = (data: any): FlyIpAssignment => ({
  ipAddress: data.ip || '',
  region: data.region || '',
  serviceName: data.service_name || '',
  shared: data.shared ?? false,
  createdAt: data.created_at || ''
});

let mapMachine = (data: any): FlyMachine => ({
  machineId: data.id || '',
  machineName: data.name || '',
  state: data.state || '',
  region: data.region || '',
  instanceId: data.instance_id || '',
  privateIp: data.private_ip || '',
  config: data.config || {},
  imageRef: data.image_ref || {},
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  events: data.events || []
});

let mapMachineEvent = (data: any): FlyMachineEvent => ({
  eventId: data.id || '',
  type: data.type || '',
  status: data.status || '',
  source: data.source || '',
  timestamp: data.timestamp || 0,
  request: data.request || {}
});

let mapMachineProcess = (data: any): FlyMachineProcess => ({
  pid: data.pid || 0,
  command: data.command || '',
  directory: data.directory || '',
  cpu: data.cpu || 0,
  rss: data.rss || 0,
  rtime: data.rtime || 0,
  stime: data.stime || 0,
  listenSockets: (data.listen_sockets || []).map((socket: any) => ({
    address: socket.address || '',
    proto: socket.proto || ''
  }))
});

let mapMachineVersion = (data: any): FlyMachineVersion => ({
  version: data.version || '',
  userConfig: data.user_config || {}
});

let mapMachineMemory = (data: any): FlyMachineMemory => ({
  limitMb: data.limit_mb || 0,
  availableMb: data.available_mb || 0
});

let mapVolume = (data: any): FlyVolume => ({
  volumeId: data.id || '',
  volumeName: data.name || '',
  state: data.state || '',
  sizeGb: data.size_gb || 0,
  region: data.region || '',
  zone: data.zone || '',
  encrypted: data.encrypted ?? true,
  snapshotRetention: data.snapshot_retention || 5,
  autoBackupEnabled: data.auto_backup_enabled ?? true,
  attachedMachineId: data.attached_machine_id || null,
  createdAt: data.created_at || ''
});

let mapSnapshot = (data: any): FlySnapshot => ({
  snapshotId: data.id || '',
  sizeGb: data.size || 0,
  createdAt: data.created_at || '',
  status: data.status || ''
});

let mapSecret = (data: any): FlySecret => ({
  secretName: data.name || data.label || '',
  digest: data.digest || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapCertificate = (data: any): FlyCertificate => ({
  hostname: data.hostname || '',
  status: data.status || '',
  configured: data.configured ?? false,
  dnsProvider: data.dns_provider || '',
  certificates: (data.certificates || []).map((c: any) => ({
    source: c.source || '',
    status: c.status || '',
    expiresAt: c.expires_at || ''
  })),
  dnsRequirements: data.dns_requirements || {},
  validation: data.validation || {}
});

let mapOrgMachine = (data: any): FlyOrgMachine => ({
  appName: data.app_name || '',
  machineId: data.id || '',
  machineName: data.name || '',
  state: data.state || '',
  region: data.region || '',
  privateIp: data.private_ip || '',
  version: data.version || '',
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  config: data.config || {}
});

let mapOrgVolume = (data: any): FlyOrgVolume => ({
  appName: data.app_name || '',
  volumeId: data.id || '',
  volumeName: data.name || '',
  state: data.state || '',
  sizeGb: data.size_gb || 0,
  region: data.region || '',
  zone: data.zone || '',
  encrypted: data.encrypted ?? true,
  attachedMachineId: data.attached_machine_id || null,
  autoBackupEnabled: data.auto_backup_enabled ?? true,
  snapshotRetention: data.snapshot_retention || 0,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
});

let mapRegion = (data: any): FlyRegion => ({
  code: data.code || '',
  name: data.name || '',
  geoRegion: data.geo_region || '',
  latitude: data.latitude || 0,
  longitude: data.longitude || 0,
  gatewayAvailable: data.gateway_available ?? false,
  requiresPaidPlan: data.requires_paid_plan ?? false,
  deprecated: data.deprecated ?? false
});

let buildOrgInventoryParams = (
  params?: OrgInventoryParams
): Record<string, string | number | boolean> => {
  let queryParams: Record<string, string | number | boolean> = {};
  if (params?.includeDeleted !== undefined)
    queryParams.include_deleted = params.includeDeleted;
  if (params?.region) queryParams.region = params.region;
  if (params?.state) queryParams.state = params.state;
  if (params?.summary !== undefined) queryParams.summary = params.summary;
  if (params?.updatedAfter) queryParams.updated_after = params.updatedAfter;
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit !== undefined) queryParams.limit = params.limit;
  return queryParams;
};

let buildMachineConfig = (config: MachineConfig): Record<string, any> => {
  let result: Record<string, any> = {
    image: config.image
  };

  if (config.env) result.env = config.env;
  if (config.guest) {
    result.guest = {};
    if (config.guest.cpus !== undefined) result.guest.cpus = config.guest.cpus;
    if (config.guest.memoryMb !== undefined) result.guest.memory_mb = config.guest.memoryMb;
    if (config.guest.maxMemoryMb !== undefined)
      result.guest.max_memory_mb = config.guest.maxMemoryMb;
    if (config.guest.cpuKind) result.guest.cpu_kind = config.guest.cpuKind;
    if (config.guest.gpuKind) result.guest.gpu_kind = config.guest.gpuKind;
    if (config.guest.gpus !== undefined) result.guest.gpus = config.guest.gpus;
    if (config.guest.hostDedicationId)
      result.guest.host_dedication_id = config.guest.hostDedicationId;
    if (config.guest.kernelArgs) result.guest.kernel_args = config.guest.kernelArgs;
  }
  if (config.size) result.size = config.size;
  if (config.services) {
    result.services = config.services.map(s => ({
      ports: s.ports.map(p => ({
        port: p.port,
        start_port: p.startPort,
        end_port: p.endPort,
        handlers: p.handlers,
        force_https: p.forceHttps
      })),
      protocol: s.protocol,
      internal_port: s.internalPort,
      autostop:
        s.autostop ??
        (s.autoStopMachines === undefined ? undefined : s.autoStopMachines ? 'stop' : 'off'),
      autostart: s.autostart ?? s.autoStartMachines,
      min_machines_running: s.minMachinesRunning,
      concurrency: s.concurrency
        ? {
            type: s.concurrency.type,
            soft_limit: s.concurrency.softLimit,
            hard_limit: s.concurrency.hardLimit
          }
        : undefined
    }));
  }
  if (config.mounts) {
    result.mounts = config.mounts.map(m => ({
      volume: m.volume,
      path: m.path,
      name: m.name,
      size_gb: m.sizeGb,
      add_size_gb: m.addSizeGb,
      encrypted: m.encrypted,
      extend_threshold_percent: m.extendThresholdPercent,
      size_gb_limit: m.sizeGbLimit
    }));
  }
  if (config.init) {
    result.init = {};
    if (config.init.exec) result.init.exec = config.init.exec;
    if (config.init.entrypoint) result.init.entrypoint = config.init.entrypoint;
    if (config.init.cmd) result.init.cmd = config.init.cmd;
    if (config.init.kernelArgs) result.init.kernel_args = config.init.kernelArgs;
    if (config.init.swapSizeMb !== undefined)
      result.init.swap_size_mb = config.init.swapSizeMb;
    if (config.init.tty !== undefined) result.init.tty = config.init.tty;
  }
  if (config.restart) {
    result.restart = {};
    if (config.restart.policy) result.restart.policy = config.restart.policy;
    if (config.restart.maxRetries !== undefined)
      result.restart.max_retries = config.restart.maxRetries;
    if (config.restart.gpuBidPrice !== undefined)
      result.restart.gpu_bid_price = config.restart.gpuBidPrice;
  }
  if (config.metadata) result.metadata = config.metadata;
  if (config.metrics) {
    result.metrics = {};
    if (config.metrics.port !== undefined) result.metrics.port = config.metrics.port;
    if (config.metrics.path) result.metrics.path = config.metrics.path;
    if (config.metrics.https !== undefined) result.metrics.https = config.metrics.https;
  }
  if (config.schedule) result.schedule = config.schedule;
  if (config.autoDestroy !== undefined) result.auto_destroy = config.autoDestroy;
  if (config.checks) result.checks = config.checks;
  if (config.statics) {
    result.statics = config.statics.map(s => ({
      guest_path: s.guestPath,
      url_prefix: s.urlPrefix,
      index_document: s.indexDocument
    }));
  }
  if (config.dns) result.dns = config.dns;
  if (config.stopConfig) {
    result.stop_config = {};
    if (config.stopConfig.signal) result.stop_config.signal = config.stopConfig.signal;
    if (config.stopConfig.timeout !== undefined)
      result.stop_config.timeout = config.stopConfig.timeout;
  }
  if (config.standbys) result.standbys = config.standbys;
  if (config.rootfs) {
    result.rootfs = {};
    if (config.rootfs.persist) result.rootfs.persist = config.rootfs.persist;
    if (config.rootfs.sizeGb !== undefined) result.rootfs.size_gb = config.rootfs.sizeGb;
  }
  if (config.files) result.files = config.files;
  if (config.processes) result.processes = config.processes;
  if (config.containers) result.containers = config.containers;
  if (config.cacheDrive) result.cache_drive = config.cacheDrive;
  if (config.spot) result.spot = config.spot;

  return result;
};
