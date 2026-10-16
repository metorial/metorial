import { isIP } from 'node:net';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

interface FirewallRuleInput {
  protocol: string;
  direction: string;
  portStart?: number;
  portEnd?: number;
  endpointSpecType: string;
  endpointSpec?: string;
  endpointPrefixes?: string[];
  ruleUuid?: string;
}

let validateWholeNumber = (
  value: number | undefined,
  field: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${field} must be a whole number between ${min} and ${max}.`);
  }
};

let mapFirewallRule = (rule: FirewallRuleInput) => {
  validateWholeNumber(rule.portStart, 'portStart', 1, 65535);
  validateWholeNumber(rule.portEnd, 'portEnd', 1, 65535);
  if (
    rule.portStart !== undefined &&
    rule.portEnd !== undefined &&
    rule.portStart > rule.portEnd
  ) {
    throw createApiServiceError('portStart cannot be greater than portEnd.');
  }
  if (rule.portEnd !== undefined && rule.portStart === undefined) {
    throw createApiServiceError(
      'Provide portStart when providing portEnd. Omit both for all ports.'
    );
  }
  let prefixes = rule.endpointPrefixes;
  if (!prefixes && rule.endpointSpec !== undefined) {
    if (rule.endpointSpec.trim().startsWith('[')) {
      try {
        let parsed: unknown = JSON.parse(rule.endpointSpec);
        if (!Array.isArray(parsed) || parsed.some(value => typeof value !== 'string')) {
          throw createApiServiceError(
            'endpointSpec must contain an IP address, CIDR prefix, or JSON array of them.'
          );
        }
        prefixes = parsed;
      } catch {
        throw createApiServiceError(
          'endpointSpec must contain an IP address, CIDR prefix, or valid JSON array of them.'
        );
      }
    } else {
      prefixes = [rule.endpointSpec];
    }
  }
  if (rule.endpointSpecType === 'ip_prefixes') {
    if (
      !prefixes?.length ||
      prefixes.some(prefix => {
        let [address, bits, extra] = prefix.split('/');
        let version = isIP(address ?? '');
        return (
          !version ||
          extra !== undefined ||
          (bits !== undefined &&
            (!/^\d+$/.test(bits) || Number(bits) > (version === 4 ? 32 : 128)))
        );
      })
    ) {
      throw createApiServiceError(
        'ip_prefixes rules require valid endpointPrefixes or endpointSpec IP addresses/CIDR ranges.'
      );
    }
  }
  return {
    uuid: rule.ruleUuid,
    protocol: rule.protocol.toLowerCase(),
    direction: rule.direction,
    port_start: rule.portStart ?? null,
    port_end: rule.portEnd ?? null,
    endpoint_spec_type: rule.endpointSpecType,
    ...(rule.endpointSpecType === 'ip_prefixes' ? { endpoint_spec: prefixes } : {})
  };
};

export class PilvioClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private locationSlug?: string;

  constructor(config: { token: string; locationSlug?: string }) {
    if (!config.token?.trim()) throw createApiServiceError('A Pilvio API token is required.');
    if (config.locationSlug && !/^[A-Za-z0-9_-]+$/.test(config.locationSlug)) {
      throw createApiServiceError(
        'locationSlug must be a datacenter slug. Use list_platform_config with resource="locations" to discover it.'
      );
    }
    this.locationSlug = config.locationSlug;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.pilvio.com/v1',
      timeout: 30_000,
      authHeader: { name: 'apikey', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Pilvio',
          reason: 'pilvio_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
    this.axios.interceptors.request.use(request => {
      // These older endpoints document form bodies, including repeated public_keys parameters.
      if (
        request.data &&
        /\/(?:user-resource\/(?:vm(?:\/|$)|user\/profile$)|storage\/(?:disks(?:\/|$)|bucket$|user\/keys$))/.test(
          request.url ?? ''
        )
      ) {
        let form = new URLSearchParams();
        for (let [key, value] of Object.entries(request.data)) {
          if (value === undefined || value === null) continue;
          for (let item of Array.isArray(value) ? value : [value])
            form.append(key, String(item));
        }
        request.data = form.toString();
        request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
      return request;
    });
    this.axios.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (
        isApiErrorRecord(body) &&
        (body.success === false ||
          (body.errors &&
            (!isApiErrorRecord(body.errors) || Object.keys(body.errors).length > 0)))
      ) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Pilvio',
            reason: 'pilvio_api_error',
            detailKeys: ['message', 'detail', 'error', 'Error', 'error_description']
          }
        );
      }
      return response;
    });
  }

  private locationPath(path: string): string {
    if (this.locationSlug) {
      return `/${this.locationSlug}${path}`;
    }
    return path;
  }

  private listData(data: unknown): any[] {
    if (!Array.isArray(data) || data.some(item => !isApiErrorRecord(item))) {
      throw createApiServiceError('Pilvio returned an unexpected list response.', {
        reason: 'pilvio_invalid_response'
      });
    }
    return data;
  }

  private recordData(data: unknown): Record<string, any> {
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('Pilvio returned an unexpected resource response.', {
        reason: 'pilvio_invalid_response'
      });
    }
    return data;
  }

  // ── User ──────────────────────────────────────────────

  async getUser(): Promise<any> {
    let res = await this.axios.get('/user-resource/user');
    return this.recordData(res.data);
  }

  async updateProfile(params: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    personalIdNumber?: string;
  }): Promise<any> {
    let res = await this.axios.patch('/user-resource/user/profile', {
      first_name: params.firstName,
      last_name: params.lastName,
      phone_number: params.phoneNumber,
      personal_id_number: params.personalIdNumber
    });
    return this.recordData(res.data);
  }

  // ── SSH Keys ──────────────────────────────────────────

  async listSshKeys(): Promise<any[]> {
    let res = await this.axios.get('/user-resource/ssh_keys');
    return this.listData(res.data);
  }

  async createSshKey(params: { name: string; publicKey: string }): Promise<any> {
    let res = await this.axios.post('/user-resource/ssh_keys', {
      name: params.name,
      public_key: params.publicKey
    });
    return this.recordData(res.data);
  }

  async updateSshKey(sshKeyUuid: string, params: { name: string }): Promise<any> {
    let res = await this.axios.patch(
      `/user-resource/ssh_keys/${encodeURIComponent(sshKeyUuid)}`,
      {
        name: params.name
      }
    );
    return this.recordData(res.data);
  }

  async deleteSshKey(sshKeyUuid: string): Promise<void> {
    await this.axios.delete(`/user-resource/ssh_keys/${encodeURIComponent(sshKeyUuid)}`);
  }

  // ── Virtual Machines ──────────────────────────────────

  async listVms(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/user-resource/vm/list'));
    return this.listData(res.data);
  }

  async getVm(vmUuid: string): Promise<any> {
    let res = await this.axios.get(this.locationPath('/user-resource/vm'), {
      params: { uuid: vmUuid }
    });
    return this.recordData(res.data);
  }

  async createVm(params: {
    name: string;
    osName?: string;
    osVersion?: string;
    disks: string;
    vcpu: number;
    ram: number;
    username: string;
    password: string;
    billingAccountId?: number;
    networkUuid?: string;
    designatedPoolUuid?: string;
    sourceUuid?: string;
    sourceReplica?: string;
    diskUuid?: string;
    reservePublicIp?: boolean;
    publicKeys?: string[];
    cloudInit?: string;
    backup?: boolean;
    description?: string;
  }): Promise<any> {
    validateWholeNumber(params.vcpu, 'vcpu');
    validateWholeNumber(params.ram, 'ram');
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (
      !params.diskUuid &&
      !params.sourceUuid &&
      (!/^\d+$/.test(params.disks) ||
        !Number.isSafeInteger(Number(params.disks)) ||
        Number(params.disks) < 1)
    ) {
      throw createApiServiceError(
        'diskSizeGb must be a positive whole-number string unless using an existing boot disk or replica.'
      );
    }
    if (Boolean(params.sourceUuid) !== Boolean(params.sourceReplica)) {
      throw createApiServiceError('Provide sourceVmUuid and sourceReplicaUuid together.');
    }
    let body: Record<string, any> = {
      name: params.name,
      disks: params.disks,
      vcpu: params.vcpu,
      ram: params.ram,
      username: params.username,
      password: params.password
    };
    if (params.osName !== undefined) body.os_name = params.osName;
    if (params.osVersion !== undefined) body.os_version = params.osVersion;
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.networkUuid !== undefined) body.network_uuid = params.networkUuid;
    if (params.designatedPoolUuid !== undefined)
      body.designated_pool_uuid = params.designatedPoolUuid;
    if (params.sourceUuid !== undefined) body.source_uuid = params.sourceUuid;
    if (params.sourceReplica !== undefined) body.source_replica = params.sourceReplica;
    if (params.diskUuid !== undefined) body.disk_uuid = params.diskUuid;
    if (params.reservePublicIp !== undefined) body.reserve_public_ip = params.reservePublicIp;
    if (params.publicKeys !== undefined) body.public_keys = params.publicKeys;
    if (params.cloudInit !== undefined) body.cloud_init = params.cloudInit;
    if (params.backup !== undefined) body.backup = params.backup;
    if (params.description !== undefined) body.description = params.description;

    let res = await this.axios.post(this.locationPath('/user-resource/vm'), body);
    return this.recordData(res.data);
  }

  async modifyVm(params: {
    vmUuid: string;
    name?: string;
    vcpu?: number;
    ram?: number;
  }): Promise<any> {
    validateWholeNumber(params.vcpu, 'vcpu');
    validateWholeNumber(params.ram, 'ram');
    if (params.name === undefined && params.vcpu === undefined && params.ram === undefined) {
      throw createApiServiceError('Provide name, vcpu, or ram for modify.');
    }
    let body: Record<string, any> = { uuid: params.vmUuid };
    if (params.name !== undefined) body.name = params.name;
    if (params.vcpu !== undefined) body.vcpu = params.vcpu;
    if (params.ram !== undefined) body.ram = params.ram;

    let res = await this.axios.patch(this.locationPath('/user-resource/vm'), body);
    return this.recordData(res.data);
  }

  async deleteVm(vmUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath('/user-resource/vm'), {
      data: { uuid: vmUuid }
    });
  }

  async startVm(vmUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/start'), {
      uuid: vmUuid
    });
    return this.recordData(res.data);
  }

  async stopVm(vmUuid: string, force?: boolean): Promise<any> {
    let body: Record<string, any> = { uuid: vmUuid };
    if (force !== undefined) body.force = force;
    let res = await this.axios.post(this.locationPath('/user-resource/vm/stop'), body);
    return this.recordData(res.data);
  }

  async cloneVm(vmUuid: string, name: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/clone'), {
      uuid: vmUuid,
      name
    });
    return this.recordData(res.data);
  }

  async reinstallVm(vmUuid: string, osName?: string, osVersion?: string): Promise<any> {
    let body: Record<string, any> = { uuid: vmUuid };
    if (osName !== undefined) body.os_name = osName;
    if (osVersion !== undefined) body.os_version = osVersion;
    let res = await this.axios.post(this.locationPath('/user-resource/vm/reinstall'), body);
    return this.recordData(res.data);
  }

  async toggleAutoBackup(vmUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/backup'), {
      uuid: vmUuid
    });
    return this.recordData(res.data);
  }

  async changeVmPassword(vmUuid: string, username: string, password: string): Promise<any> {
    let res = await this.axios.patch(this.locationPath('/user-resource/vm/user'), {
      uuid: vmUuid,
      username,
      password
    });
    return this.recordData(res.data);
  }

  async bootIsoMedia(
    vmUuid: string,
    bootImageUuid?: string,
    bootImageRepository?: string
  ): Promise<any> {
    let body: Record<string, any> = { uuid: vmUuid };
    if (bootImageUuid !== undefined) body.boot_image_uuid = bootImageUuid;
    if (bootImageRepository !== undefined) body.boot_image_repository = bootImageRepository;
    let res = await this.axios.post(
      this.locationPath('/user-resource/vm/boot_iso_media'),
      body
    );
    return this.recordData(res.data);
  }

  // ── VM Snapshots / Replicas ───────────────────────────

  async listReplicas(vmUuid: string, replicaType?: string): Promise<any[]> {
    let params: Record<string, any> = { uuid: vmUuid };
    if (replicaType) params.r_type = replicaType;
    let res = await this.axios.get(this.locationPath('/user-resource/vm/replica'), { params });
    return this.listData(res.data);
  }

  async createReplica(vmUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/replica'), {
      uuid: vmUuid
    });
    return this.recordData(res.data);
  }

  async deleteReplica(replicaUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath('/user-resource/vm/replica'), {
      data: { replica_uuid: replicaUuid }
    });
  }

  async rebuildFromReplica(vmUuid: string, replicaUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/rebuild'), {
      uuid: vmUuid,
      replica_uuid: replicaUuid
    });
    return this.recordData(res.data);
  }

  // ── VM Storage (attached disks) ───────────────────────

  async addDiskToVm(vmUuid: string, sizeGb: number): Promise<any> {
    validateWholeNumber(sizeGb, 'sizeGb');
    let res = await this.axios.post(this.locationPath('/user-resource/vm/storage'), {
      uuid: vmUuid,
      size_gb: sizeGb
    });
    return this.recordData(res.data);
  }

  async modifyVmDisk(vmUuid: string, diskUuid: string, sizeGb: number): Promise<any> {
    validateWholeNumber(sizeGb, 'sizeGb');
    let res = await this.axios.patch(this.locationPath('/user-resource/vm/storage'), {
      uuid: vmUuid,
      disk_uuid: diskUuid,
      size_gb: sizeGb
    });
    return this.recordData(res.data);
  }

  async deleteVmDisk(vmUuid: string, storageUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath('/user-resource/vm/storage'), {
      data: { uuid: vmUuid, storage_uuid: storageUuid }
    });
  }

  // ── Block Storage ─────────────────────────────────────

  async listDisks(readOnlyBootable?: boolean): Promise<any[]> {
    let params: Record<string, any> = {};
    if (readOnlyBootable !== undefined) params.read_only_bootable = readOnlyBootable;
    let res = await this.axios.get(this.locationPath('/storage/disks'), { params });
    return this.listData(res.data);
  }

  async getDisk(diskUuid: string): Promise<any> {
    let res = await this.axios.get(
      this.locationPath(`/storage/disks/${encodeURIComponent(diskUuid)}`)
    );
    return this.recordData(res.data);
  }

  async createDisk(params: {
    sizeGb?: number;
    billingAccountId?: number;
    displayName?: string;
    sourceImageType?: string;
    sourceImage?: string;
  }): Promise<any> {
    validateWholeNumber(params.sizeGb, 'sizeGb');
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.sourceImageType && params.sourceImageType !== 'EMPTY' && !params.sourceImage) {
      throw createApiServiceError(
        'sourceImage is required when sourceImageType is OS_BASE, DISK, or SNAPSHOT.'
      );
    }
    if (
      (!params.sourceImageType || params.sourceImageType === 'EMPTY') &&
      !params.sourceImage &&
      params.sizeGb === undefined
    ) {
      throw createApiServiceError('sizeGb is required when creating an empty disk.');
    }
    let body: Record<string, any> = {};
    if (params.sizeGb !== undefined) body.size_gb = params.sizeGb;
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.displayName !== undefined) body.display_name = params.displayName;
    if (params.sourceImageType !== undefined) body.source_image_type = params.sourceImageType;
    if (params.sourceImage !== undefined) body.source_image = params.sourceImage;
    let res = await this.axios.post(this.locationPath('/storage/disks'), body);
    return this.recordData(res.data);
  }

  async modifyDisk(
    diskUuid: string,
    params: {
      displayName?: string;
      billingAccountId?: number;
      readOnlyBootable?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.displayName !== undefined) body.display_name = params.displayName;
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.readOnlyBootable !== undefined)
      body.read_only_bootable = params.readOnlyBootable;
    let res = await this.axios.patch(
      this.locationPath(`/storage/disks/${encodeURIComponent(diskUuid)}`),
      body
    );
    return this.recordData(res.data);
  }

  async deleteDisk(diskUuid: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(`/storage/disks/${encodeURIComponent(diskUuid)}`)
    );
  }

  async attachDisk(vmUuid: string, storageUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/storage/attach'), {
      uuid: vmUuid,
      storage_uuid: storageUuid
    });
    return this.recordData(res.data);
  }

  async detachDisk(vmUuid: string, storageUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/storage/detach'), {
      uuid: vmUuid,
      storage_uuid: storageUuid
    });
    return this.recordData(res.data);
  }

  // ── Object Storage (S3) ──────────────────────────────

  async getS3Endpoint(): Promise<string> {
    let res = await this.axios.get('/storage/api/s3');
    let data = this.recordData(res.data);
    if (typeof data.url !== 'string' || !data.url)
      throw createApiServiceError('Pilvio did not return the S3 endpoint URL.');
    return data.url;
  }

  async listBuckets(billingAccountId?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    validateWholeNumber(billingAccountId, 'billingAccountId', 0);
    if (billingAccountId !== undefined) params.billing_account_id = billingAccountId;
    let res = await this.axios.get('/storage/bucket/list', { params });
    return this.listData(res.data);
  }

  async getBucket(name: string): Promise<any> {
    let res = await this.axios.get('/storage/bucket', {
      params: { name }
    });
    return this.recordData(res.data);
  }

  async createBucket(params: { name: string; billingAccountId?: number }): Promise<any> {
    let body: Record<string, any> = { name: params.name };
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    let res = await this.axios.put('/storage/bucket', body);
    return this.recordData(res.data);
  }

  async modifyBucket(name: string, billingAccountId: number): Promise<any> {
    validateWholeNumber(billingAccountId, 'billingAccountId', 0);
    let res = await this.axios.patch('/storage/bucket', {
      name,
      billing_account_id: billingAccountId
    });
    return this.recordData(res.data);
  }

  async deleteBucket(name: string): Promise<void> {
    await this.axios.delete('/storage/bucket', {
      params: { name }
    });
  }

  async listS3Keys(): Promise<any[]> {
    let res = await this.axios.get('/storage/user/keys');
    return this.listData(res.data);
  }

  async generateS3Key(): Promise<any[]> {
    let res = await this.axios.post('/storage/user/keys');
    return this.listData(res.data);
  }

  async deleteS3Key(accessKey: string): Promise<void> {
    await this.axios.delete('/storage/user/keys', {
      data: { access_key: accessKey }
    });
  }

  // ── Networks ──────────────────────────────────────────

  async listNetworks(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/network/networks'));
    return this.listData(res.data);
  }

  async getNetwork(networkUuid: string): Promise<any> {
    let res = await this.axios.get(
      this.locationPath(`/network/network/${encodeURIComponent(networkUuid)}`)
    );
    return this.recordData(res.data);
  }

  async createNetwork(name?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (name) params.name = name;
    let res = await this.axios.post(this.locationPath('/network/network'), null, { params });
    return this.recordData(res.data);
  }

  async deleteNetwork(networkUuid: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(`/network/network/${encodeURIComponent(networkUuid)}`)
    );
  }

  async renameNetwork(networkUuid: string, name: string): Promise<any> {
    let res = await this.axios.patch(
      this.locationPath(`/network/network/${encodeURIComponent(networkUuid)}`),
      {
        name
      }
    );
    return this.recordData(res.data);
  }

  async setDefaultNetwork(networkUuid: string): Promise<any> {
    let res = await this.axios.put(
      this.locationPath(`/network/network/${encodeURIComponent(networkUuid)}/default`)
    );
    return this.recordData(res.data);
  }

  // ── Floating IPs ──────────────────────────────────────

  async listFloatingIps(params?: {
    billingAccountId?: number;
    vmUuid?: string;
  }): Promise<any[]> {
    let query: Record<string, any> = {};
    validateWholeNumber(params?.billingAccountId, 'billingAccountId', 0);
    if (params?.billingAccountId !== undefined)
      query.billing_account_id = params.billingAccountId;
    if (params?.vmUuid !== undefined) query.vm_uuid = params.vmUuid;
    let res = await this.axios.get(this.locationPath('/network/ip_addresses'), {
      params: query
    });
    return this.listData(res.data);
  }

  async getFloatingIp(ipAddress: string): Promise<any> {
    let res = await this.axios.get(
      this.locationPath(`/network/ip_addresses/${encodeURIComponent(ipAddress)}`)
    );
    return this.recordData(res.data);
  }

  async createFloatingIp(params: { billingAccountId: number; name?: string }): Promise<any> {
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    let body: Record<string, any> = { billing_account_id: params.billingAccountId };
    if (params.name !== undefined) body.name = params.name;
    let res = await this.axios.post(this.locationPath('/network/ip_addresses'), body);
    return this.recordData(res.data);
  }

  async updateFloatingIp(
    ipAddress: string,
    params: { billingAccountId?: number; name?: string }
  ): Promise<any> {
    let body: Record<string, any> = {};
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.name !== undefined) body.name = params.name;
    let res = await this.axios.patch(
      this.locationPath(`/network/ip_addresses/${encodeURIComponent(ipAddress)}`),
      body
    );
    return this.recordData(res.data);
  }

  async deleteFloatingIp(ipAddress: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(`/network/ip_addresses/${encodeURIComponent(ipAddress)}`)
    );
  }

  async assignFloatingIp(ipAddress: string, vmUuid: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/ip_addresses/${encodeURIComponent(ipAddress)}/assign`),
      {
        assigned_to: vmUuid,
        assigned_to_resource_type: 'virtual_machine'
      }
    );
    return this.recordData(res.data);
  }

  async unassignFloatingIp(ipAddress: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/ip_addresses/${encodeURIComponent(ipAddress)}/unassign`)
    );
    return this.recordData(res.data);
  }

  // ── Firewalls ─────────────────────────────────────────

  async listFirewalls(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/network/firewalls'));
    return this.listData(res.data);
  }

  async createFirewall(params: {
    displayName: string;
    billingAccountId?: number;
    rules?: FirewallRuleInput[];
  }): Promise<any> {
    let body: Record<string, any> = { display_name: params.displayName };
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.rules) {
      body.rules = params.rules.map(mapFirewallRule);
    }
    let res = await this.axios.post(this.locationPath('/network/firewalls'), body);
    return this.recordData(res.data);
  }

  async updateFirewall(
    firewallUuid: string,
    params: {
      name?: string;
      description?: string;
      rules?: FirewallRuleInput[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.rules) {
      body.rules = params.rules.map(mapFirewallRule);
    }
    let res = await this.axios.put(
      this.locationPath(`/network/firewalls/${encodeURIComponent(firewallUuid)}`),
      body
    );
    return this.recordData(res.data);
  }

  async deleteFirewall(firewallUuid: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(`/network/firewalls/${encodeURIComponent(firewallUuid)}`)
    );
  }

  async assignFirewallToVm(firewallUuid: string, vmUuid: string): Promise<any[]> {
    let res = await this.axios.post(
      this.locationPath(`/network/firewalls/${encodeURIComponent(firewallUuid)}/vms`),
      null,
      {
        params: { vm_uuid: vmUuid }
      }
    );
    return this.listData(res.data);
  }

  async unassignFirewallFromVm(firewallUuid: string, vmUuid: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(`/network/firewalls/${encodeURIComponent(firewallUuid)}/vms`),
      {
        params: { vm_uuid: vmUuid }
      }
    );
  }

  // ── Load Balancers ────────────────────────────────────

  async listLoadBalancers(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/network/load_balancers'));
    return this.listData(res.data);
  }

  async getLoadBalancer(lbUuid: string): Promise<any> {
    let res = await this.axios.get(
      this.locationPath(`/network/load_balancers/${encodeURIComponent(lbUuid)}`)
    );
    return this.recordData(res.data);
  }

  async createLoadBalancer(params: {
    name: string;
    networkUuid: string;
    billingAccountId?: number;
    reservePublicIp?: boolean;
    sessionPersistence?: boolean;
    connectionLimit?: number;
    forwardingRules?: Array<{ sourcePort: number; targetPort: number }>;
    targetVmUuids?: string[];
  }): Promise<any> {
    let body: Record<string, any> = {
      display_name: params.name,
      network_uuid: params.networkUuid
    };
    validateWholeNumber(params.billingAccountId, 'billingAccountId', 0);
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.reservePublicIp !== undefined) body.reserve_public_ip = params.reservePublicIp;
    if (params.sessionPersistence !== undefined)
      body.session_persistence = params.sessionPersistence;
    if (params.connectionLimit !== undefined) body.connection_limit = params.connectionLimit;
    for (let rule of params.forwardingRules ?? []) {
      validateWholeNumber(rule.sourcePort, 'sourcePort', 1, 65535);
      validateWholeNumber(rule.targetPort, 'targetPort', 1, 65535);
    }
    validateWholeNumber(params.connectionLimit, 'connectionLimit', 0);
    if (params.forwardingRules) {
      body.rules = params.forwardingRules.map(r => ({
        source_port: r.sourcePort,
        target_port: r.targetPort
      }));
    }
    if (params.targetVmUuids)
      body.targets = params.targetVmUuids.map(target_uuid => ({
        target_uuid,
        target_type: 'vm'
      }));
    let res = await this.axios.post(this.locationPath('/network/load_balancers'), body);
    return this.recordData(res.data);
  }

  async renameLoadBalancer(lbUuid: string, name: string): Promise<any> {
    let res = await this.axios.patch(
      this.locationPath(`/network/load_balancers/${encodeURIComponent(lbUuid)}`),
      { display_name: name }
    );
    return this.recordData(res.data);
  }

  async updateLoadBalancerBilling(lbUuid: string, billingAccountId: number): Promise<any> {
    validateWholeNumber(billingAccountId, 'billingAccountId', 0);
    let res = await this.axios.put(
      this.locationPath(
        `/network/load_balancers/${encodeURIComponent(lbUuid)}/billing_account`
      ),
      {
        set_id: billingAccountId
      }
    );
    return this.recordData(res.data);
  }

  async deleteLoadBalancer(lbUuid: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(`/network/load_balancers/${encodeURIComponent(lbUuid)}`)
    );
  }

  async addLoadBalancerTarget(lbUuid: string, vmUuid: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/load_balancers/${encodeURIComponent(lbUuid)}/targets`),
      {
        target_uuid: vmUuid,
        target_type: 'vm'
      }
    );
    return this.recordData(res.data);
  }

  async removeLoadBalancerTarget(lbUuid: string, vmUuid: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(
        `/network/load_balancers/${encodeURIComponent(lbUuid)}/targets/${encodeURIComponent(vmUuid)}`
      )
    );
  }

  async addLoadBalancerRule(
    lbUuid: string,
    sourcePort: number,
    targetPort: number
  ): Promise<any> {
    validateWholeNumber(sourcePort, 'sourcePort', 1, 65535);
    validateWholeNumber(targetPort, 'targetPort', 1, 65535);
    let res = await this.axios.post(
      this.locationPath(
        `/network/load_balancers/${encodeURIComponent(lbUuid)}/forwarding_rules`
      ),
      {
        source_port: sourcePort,
        target_port: targetPort
      }
    );
    return this.recordData(res.data);
  }

  async removeLoadBalancerRule(lbUuid: string, ruleId: string): Promise<void> {
    await this.axios.delete(
      this.locationPath(
        `/network/load_balancers/${encodeURIComponent(lbUuid)}/forwarding_rules/${encodeURIComponent(ruleId)}`
      )
    );
  }

  // ── Platform Config ───────────────────────────────────

  async listLocations(): Promise<any[]> {
    let res = await this.axios.get('/config/locations');
    return this.listData(res.data);
  }

  async listHostPools(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/user-resource/host_pool/list'));
    return this.listData(res.data);
  }

  async listOsImages(): Promise<any> {
    let res = await this.axios.get('/config/vm_images/plain_os');
    return res.data;
  }

  async listAppImages(): Promise<any> {
    let res = await this.axios.get('/config/vm_images/app_catalog');
    return res.data;
  }

  async listBootableMedia(): Promise<any> {
    let res = await this.axios.get('/config/boot_images');
    return res.data;
  }

  async listBillingAccounts(): Promise<any[]> {
    let res = await this.axios.get('/payment/billing_account/list');
    return this.listData(res.data);
  }

  async getVmParameters(): Promise<any> {
    let res = await this.axios.get('/api/parameters/vm');
    return res.data;
  }

  async listVmImages(): Promise<any> {
    let res = await this.axios.get('/config/vm_images');
    return res.data;
  }
}
