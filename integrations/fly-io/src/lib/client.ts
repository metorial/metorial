import { createAxios } from 'slates';

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
  }

  // ─── Apps ───────────────────────────────────────────────

  async listApps(orgSlug: string): Promise<{ totalApps: number; apps: FlyApp[] }> {
    let response = await this.axios.get('/v1/apps', {
      params: { org_slug: orgSlug }
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

  // ─── Machines ───────────────────────────────────────────

  async listMachines(
    appName: string,
    params?: { includeDeleted?: boolean; region?: string; metadata?: Record<string, string> }
  ): Promise<FlyMachine[]> {
    let queryParams: Record<string, string> = {};
    if (params?.includeDeleted) queryParams.include_deleted = 'true';
    if (params?.region) queryParams.region = params.region;
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
    params?: { signal?: string; timeout?: number }
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
    params?: { signal?: string; timeout?: number }
  ): Promise<void> {
    let queryParams: Record<string, string> = {};
    if (params?.signal) queryParams.signal = params.signal;
    if (params?.timeout) queryParams.timeout = String(params.timeout);
    await this.axios.post(`/v1/apps/${appName}/machines/${machineId}/restart`, undefined, {
      params: queryParams
    });
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

  async listSecrets(appName: string): Promise<FlySecret[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/secrets`);
    return (response.data || []).map(mapSecret);
  }

  async setSecrets(appName: string, secrets: Record<string, string>): Promise<void> {
    let secretEntries = Object.entries(secrets).map(([key, value]) => ({
      label: key,
      type: 'secret',
      value: value
    }));
    await this.axios.post(`/v1/apps/${appName}/secrets`, secretEntries);
  }

  async deleteSecret(appName: string, secretName: string): Promise<void> {
    await this.axios.delete(`/v1/apps/${appName}/secrets/${secretName}`);
  }

  // ─── Certificates ──────────────────────────────────────

  async listCertificates(
    appName: string,
    params?: { filter?: string; cursor?: string; limit?: number }
  ): Promise<FlyCertificate[]> {
    let response = await this.axios.get(`/v1/apps/${appName}/certificates`, { params });
    return (response.data || []).map(mapCertificate);
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
  leaseTtl?: number;
  config: MachineConfig;
}

export interface UpdateMachineParams {
  config: MachineConfig;
  leaseNonce?: string;
}

export interface MachineConfig {
  image: string;
  env?: Record<string, string>;
  guest?: {
    cpus?: number;
    memoryMb?: number;
    cpuKind?: string;
    gpuKind?: string;
  };
  size?: string;
  services?: Array<{
    ports: Array<{
      port: number;
      handlers?: string[];
      forceHttps?: boolean;
    }>;
    protocol: string;
    internalPort: number;
    autoStopMachines?: boolean;
    autoStartMachines?: boolean;
    minMachinesRunning?: number;
  }>;
  mounts?: Array<{
    volume: string;
    path: string;
  }>;
  init?: {
    exec?: string[];
    entrypoint?: string[];
    cmd?: string[];
    tty?: boolean;
  };
  restart?: {
    policy?: string;
    maxRetries?: number;
  };
  metadata?: Record<string, string>;
  metrics?: {
    port?: number;
    path?: string;
  };
  schedule?: string;
  autoDestroy?: boolean;
  checks?: Record<string, any>;
  statics?: Array<{ guestPath: string; urlPrefix: string }>;
  dns?: Record<string, any>;
  stopConfig?: { signal?: string; timeout?: number };
  standbys?: string[];
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
  label: string;
  type: string;
  digest: string;
  createdAt: string;
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
  label: data.label || data.name || '',
  type: data.type || '',
  digest: data.digest || '',
  createdAt: data.created_at || ''
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

let buildMachineConfig = (config: MachineConfig): Record<string, any> => {
  let result: Record<string, any> = {
    image: config.image
  };

  if (config.env) result.env = config.env;
  if (config.guest) {
    result.guest = {};
    if (config.guest.cpus !== undefined) result.guest.cpus = config.guest.cpus;
    if (config.guest.memoryMb !== undefined) result.guest.memory_mb = config.guest.memoryMb;
    if (config.guest.cpuKind) result.guest.cpu_kind = config.guest.cpuKind;
    if (config.guest.gpuKind) result.guest.gpu_kind = config.guest.gpuKind;
  }
  if (config.size) result.size = config.size;
  if (config.services) {
    result.services = config.services.map(s => ({
      ports: s.ports.map(p => ({
        port: p.port,
        handlers: p.handlers,
        force_https: p.forceHttps
      })),
      protocol: s.protocol,
      internal_port: s.internalPort,
      auto_stop_machines: s.autoStopMachines,
      auto_start_machines: s.autoStartMachines,
      min_machines_running: s.minMachinesRunning
    }));
  }
  if (config.mounts) {
    result.mounts = config.mounts.map(m => ({
      volume: m.volume,
      path: m.path
    }));
  }
  if (config.init) {
    result.init = {};
    if (config.init.exec) result.init.exec = config.init.exec;
    if (config.init.entrypoint) result.init.entrypoint = config.init.entrypoint;
    if (config.init.cmd) result.init.cmd = config.init.cmd;
    if (config.init.tty !== undefined) result.init.tty = config.init.tty;
  }
  if (config.restart) {
    result.restart = {};
    if (config.restart.policy) result.restart.policy = config.restart.policy;
    if (config.restart.maxRetries !== undefined)
      result.restart.max_retries = config.restart.maxRetries;
  }
  if (config.metadata) result.metadata = config.metadata;
  if (config.metrics) {
    result.metrics = {};
    if (config.metrics.port !== undefined) result.metrics.port = config.metrics.port;
    if (config.metrics.path) result.metrics.path = config.metrics.path;
  }
  if (config.schedule) result.schedule = config.schedule;
  if (config.autoDestroy !== undefined) result.auto_destroy = config.autoDestroy;
  if (config.checks) result.checks = config.checks;
  if (config.statics) {
    result.statics = config.statics.map(s => ({
      guest_path: s.guestPath,
      url_prefix: s.urlPrefix
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

  return result;
};
