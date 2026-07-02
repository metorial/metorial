import { createAxios } from 'slates';

export class PilvioClient {
  private axios: ReturnType<typeof createAxios>;
  private locationSlug?: string;

  constructor(config: { token: string; locationSlug?: string }) {
    this.locationSlug = config.locationSlug;
    this.axios = createAxios({
      baseURL: 'https://api.pilvio.com/v1',
      headers: {
        apikey: config.token
      }
    });
  }

  private locationPath(path: string): string {
    if (this.locationSlug) {
      return `/${this.locationSlug}${path}`;
    }
    return path;
  }

  // ── User ──────────────────────────────────────────────

  async getUser(): Promise<any> {
    let res = await this.axios.get('/user-resource/user');
    return res.data;
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
    return res.data;
  }

  // ── SSH Keys ──────────────────────────────────────────

  async listSshKeys(): Promise<any[]> {
    let res = await this.axios.get('/user-resource/ssh_keys');
    return res.data;
  }

  async createSshKey(params: { name: string; publicKey: string }): Promise<any> {
    let res = await this.axios.post('/user-resource/ssh_keys', {
      name: params.name,
      public_key: params.publicKey
    });
    return res.data;
  }

  async updateSshKey(sshKeyUuid: string, params: { name: string }): Promise<any> {
    let res = await this.axios.patch(`/user-resource/ssh_keys/${sshKeyUuid}`, {
      name: params.name
    });
    return res.data;
  }

  async deleteSshKey(sshKeyUuid: string): Promise<void> {
    await this.axios.delete(`/user-resource/ssh_keys/${sshKeyUuid}`);
  }

  // ── Virtual Machines ──────────────────────────────────

  async listVms(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/user-resource/vm/list'));
    return res.data;
  }

  async getVm(vmUuid: string): Promise<any> {
    let res = await this.axios.get(this.locationPath('/user-resource/vm'), {
      params: { uuid: vmUuid }
    });
    return res.data;
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
    return res.data;
  }

  async modifyVm(params: {
    vmUuid: string;
    name?: string;
    vcpu?: number;
    ram?: number;
  }): Promise<any> {
    let body: Record<string, any> = { uuid: params.vmUuid };
    if (params.name !== undefined) body.name = params.name;
    if (params.vcpu !== undefined) body.vcpu = params.vcpu;
    if (params.ram !== undefined) body.ram = params.ram;

    let res = await this.axios.patch(this.locationPath('/user-resource/vm'), body);
    return res.data;
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
    return res.data;
  }

  async stopVm(vmUuid: string, force?: boolean): Promise<any> {
    let body: Record<string, any> = { uuid: vmUuid };
    if (force !== undefined) body.force = force;
    let res = await this.axios.post(this.locationPath('/user-resource/vm/stop'), body);
    return res.data;
  }

  async cloneVm(vmUuid: string, name: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/clone'), {
      uuid: vmUuid,
      name
    });
    return res.data;
  }

  async reinstallVm(vmUuid: string, osName?: string, osVersion?: string): Promise<any> {
    let body: Record<string, any> = { uuid: vmUuid };
    if (osName !== undefined) body.os_name = osName;
    if (osVersion !== undefined) body.os_version = osVersion;
    let res = await this.axios.post(this.locationPath('/user-resource/vm/reinstall'), body);
    return res.data;
  }

  async toggleAutoBackup(vmUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/backup'), {
      uuid: vmUuid
    });
    return res.data;
  }

  async changeVmPassword(vmUuid: string, username: string, password: string): Promise<any> {
    let res = await this.axios.patch(this.locationPath('/user-resource/vm/user'), {
      uuid: vmUuid,
      username,
      password
    });
    return res.data;
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
    return res.data;
  }

  // ── VM Snapshots / Replicas ───────────────────────────

  async listReplicas(vmUuid: string, replicaType?: string): Promise<any[]> {
    let params: Record<string, any> = { uuid: vmUuid };
    if (replicaType) params.r_type = replicaType;
    let res = await this.axios.get(this.locationPath('/user-resource/vm/replica'), { params });
    return res.data;
  }

  async createReplica(vmUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/replica'), {
      uuid: vmUuid
    });
    return res.data;
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
    return res.data;
  }

  // ── VM Storage (attached disks) ───────────────────────

  async addDiskToVm(vmUuid: string, sizeGb: number): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/storage'), {
      uuid: vmUuid,
      size_gb: sizeGb
    });
    return res.data;
  }

  async modifyVmDisk(vmUuid: string, diskUuid: string, sizeGb: number): Promise<any> {
    let res = await this.axios.patch(this.locationPath('/user-resource/vm/storage'), {
      uuid: vmUuid,
      disk_uuid: diskUuid,
      size_gb: sizeGb
    });
    return res.data;
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
    return res.data;
  }

  async getDisk(diskUuid: string): Promise<any> {
    let res = await this.axios.get(this.locationPath(`/storage/disks/${diskUuid}`));
    return res.data;
  }

  async createDisk(params: {
    sizeGb?: number;
    billingAccountId?: number;
    displayName?: string;
    sourceImageType?: string;
    sourceImage?: string;
  }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.sizeGb !== undefined) body.size_gb = params.sizeGb;
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.displayName !== undefined) body.display_name = params.displayName;
    if (params.sourceImageType !== undefined) body.source_image_type = params.sourceImageType;
    if (params.sourceImage !== undefined) body.source_image = params.sourceImage;
    let res = await this.axios.post(this.locationPath('/storage/disks'), body);
    return res.data;
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
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.readOnlyBootable !== undefined)
      body.read_only_bootable = params.readOnlyBootable;
    let res = await this.axios.patch(this.locationPath(`/storage/disks/${diskUuid}`), body);
    return res.data;
  }

  async deleteDisk(diskUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/storage/disks/${diskUuid}`));
  }

  async attachDisk(vmUuid: string, storageUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/storage/attach'), {
      uuid: vmUuid,
      storage_uuid: storageUuid
    });
    return res.data;
  }

  async detachDisk(vmUuid: string, storageUuid: string): Promise<any> {
    let res = await this.axios.post(this.locationPath('/user-resource/vm/storage/detach'), {
      uuid: vmUuid,
      storage_uuid: storageUuid
    });
    return res.data;
  }

  // ── Object Storage (S3) ──────────────────────────────

  async getS3Endpoint(): Promise<string> {
    let res = await this.axios.get('/storage/api/s3');
    return res.data.url;
  }

  async listBuckets(billingAccountId?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (billingAccountId !== undefined) params.billing_account_id = billingAccountId;
    let res = await this.axios.get('/storage/bucket/list', { params });
    return res.data;
  }

  async getBucket(name: string): Promise<any> {
    let res = await this.axios.get('/storage/bucket', {
      params: { name }
    });
    return res.data;
  }

  async createBucket(params: { name: string; billingAccountId?: number }): Promise<any> {
    let body: Record<string, any> = { name: params.name };
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    let res = await this.axios.put('/storage/bucket', body);
    return res.data;
  }

  async modifyBucket(name: string, billingAccountId: number): Promise<any> {
    let res = await this.axios.patch('/storage/bucket', {
      name,
      billing_account_id: billingAccountId
    });
    return res.data;
  }

  async deleteBucket(name: string): Promise<void> {
    await this.axios.delete('/storage/bucket', {
      params: { name }
    });
  }

  async listS3Keys(): Promise<any[]> {
    let res = await this.axios.get('/storage/user/keys');
    return res.data;
  }

  async generateS3Key(): Promise<any[]> {
    let res = await this.axios.post('/storage/user/keys');
    return res.data;
  }

  async deleteS3Key(accessKey: string): Promise<void> {
    await this.axios.delete('/storage/user/keys', {
      data: { access_key: accessKey }
    });
  }

  // ── Networks ──────────────────────────────────────────

  async listNetworks(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/network/networks'));
    return res.data;
  }

  async getNetwork(networkUuid: string): Promise<any> {
    let res = await this.axios.get(this.locationPath(`/network/network/${networkUuid}`));
    return res.data;
  }

  async createNetwork(name?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (name) params.name = name;
    let res = await this.axios.post(this.locationPath('/network/network'), null, { params });
    return res.data;
  }

  async deleteNetwork(networkUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/network/${networkUuid}`));
  }

  async renameNetwork(networkUuid: string, name: string): Promise<any> {
    let res = await this.axios.patch(this.locationPath(`/network/network/${networkUuid}`), {
      name
    });
    return res.data;
  }

  async setDefaultNetwork(networkUuid: string): Promise<any> {
    let res = await this.axios.put(
      this.locationPath(`/network/network/${networkUuid}/default`)
    );
    return res.data;
  }

  // ── Floating IPs ──────────────────────────────────────

  async listFloatingIps(params?: {
    billingAccountId?: number;
    vmUuid?: string;
  }): Promise<any[]> {
    let query: Record<string, any> = {};
    if (params?.billingAccountId !== undefined)
      query.billing_account_id = params.billingAccountId;
    if (params?.vmUuid !== undefined) query.vm_uuid = params.vmUuid;
    let res = await this.axios.get(this.locationPath('/network/ip_addresses'), {
      params: query
    });
    return res.data;
  }

  async getFloatingIp(ipAddress: string): Promise<any> {
    let res = await this.axios.get(this.locationPath(`/network/ip_addresses/${ipAddress}`));
    return res.data;
  }

  async createFloatingIp(params: { billingAccountId: number; name?: string }): Promise<any> {
    let body: Record<string, any> = { billing_account_id: params.billingAccountId };
    if (params.name !== undefined) body.name = params.name;
    let res = await this.axios.post(this.locationPath('/network/ip_addresses'), body);
    return res.data;
  }

  async updateFloatingIp(
    ipAddress: string,
    params: { billingAccountId?: number; name?: string }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.name !== undefined) body.name = params.name;
    let res = await this.axios.patch(
      this.locationPath(`/network/ip_addresses/${ipAddress}`),
      body
    );
    return res.data;
  }

  async deleteFloatingIp(ipAddress: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/ip_addresses/${ipAddress}`));
  }

  async assignFloatingIp(ipAddress: string, vmUuid: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/ip_addresses/${ipAddress}/assign`),
      {
        vm_uuid: vmUuid
      }
    );
    return res.data;
  }

  async unassignFloatingIp(ipAddress: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/ip_addresses/${ipAddress}/unassign`)
    );
    return res.data;
  }

  // ── Firewalls ─────────────────────────────────────────

  async listFirewalls(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/network/firewalls'));
    return res.data;
  }

  async createFirewall(params: {
    displayName: string;
    billingAccountId?: number;
    rules?: Array<{
      protocol: string;
      direction: string;
      portStart?: number;
      portEnd?: number;
      endpointSpecType: string;
      endpointSpec?: string;
    }>;
  }): Promise<any> {
    let body: Record<string, any> = { display_name: params.displayName };
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.rules) {
      body.rules = params.rules.map(r => ({
        protocol: r.protocol,
        direction: r.direction,
        port_start: r.portStart,
        port_end: r.portEnd,
        endpoint_spec_type: r.endpointSpecType,
        endpoint_spec: r.endpointSpec
      }));
    }
    let res = await this.axios.post(this.locationPath('/network/firewalls'), body);
    return res.data;
  }

  async updateFirewall(
    firewallUuid: string,
    params: {
      name?: string;
      description?: string;
      rules?: Array<{
        protocol: string;
        direction: string;
        portStart?: number;
        portEnd?: number;
        endpointSpecType: string;
        endpointSpec?: string;
      }>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.rules) {
      body.rules = params.rules.map(r => ({
        protocol: r.protocol,
        direction: r.direction,
        port_start: r.portStart,
        port_end: r.portEnd,
        endpoint_spec_type: r.endpointSpecType,
        endpoint_spec: r.endpointSpec
      }));
    }
    let res = await this.axios.put(
      this.locationPath(`/network/firewalls/${firewallUuid}`),
      body
    );
    return res.data;
  }

  async deleteFirewall(firewallUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/firewalls/${firewallUuid}`));
  }

  async assignFirewallToVm(firewallUuid: string, vmUuid: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/firewalls/${firewallUuid}/vms`),
      null,
      {
        params: { vm_uuid: vmUuid }
      }
    );
    return res.data;
  }

  async unassignFirewallFromVm(firewallUuid: string, vmUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/firewalls/${firewallUuid}/vms`), {
      params: { vm_uuid: vmUuid }
    });
  }

  // ── Load Balancers ────────────────────────────────────

  async listLoadBalancers(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/network/load_balancers'));
    return res.data;
  }

  async getLoadBalancer(lbUuid: string): Promise<any> {
    let res = await this.axios.get(this.locationPath(`/network/load_balancers/${lbUuid}`));
    return res.data;
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
      name: params.name,
      network_uuid: params.networkUuid
    };
    if (params.billingAccountId !== undefined)
      body.billing_account_id = params.billingAccountId;
    if (params.reservePublicIp !== undefined) body.reserve_public_ip = params.reservePublicIp;
    if (params.sessionPersistence !== undefined)
      body.session_persistence = params.sessionPersistence;
    if (params.connectionLimit !== undefined) body.connection_limit = params.connectionLimit;
    if (params.forwardingRules) {
      body.forwarding_rules = params.forwardingRules.map(r => ({
        source_port: r.sourcePort,
        target_port: r.targetPort
      }));
    }
    if (params.targetVmUuids) body.target_vm_uuids = params.targetVmUuids;
    let res = await this.axios.post(this.locationPath('/network/load_balancers'), body);
    return res.data;
  }

  async renameLoadBalancer(lbUuid: string, name: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/load_balancers/${lbUuid}/rename`),
      { name }
    );
    return res.data;
  }

  async updateLoadBalancerBilling(lbUuid: string, billingAccountId: number): Promise<any> {
    let res = await this.axios.patch(this.locationPath(`/network/load_balancers/${lbUuid}`), {
      billing_account_id: billingAccountId
    });
    return res.data;
  }

  async deleteLoadBalancer(lbUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/load_balancers/${lbUuid}`));
  }

  async addLoadBalancerTarget(lbUuid: string, vmUuid: string): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/load_balancers/${lbUuid}/targets`),
      {
        vm_uuid: vmUuid
      }
    );
    return res.data;
  }

  async removeLoadBalancerTarget(lbUuid: string, vmUuid: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/load_balancers/${lbUuid}/targets`), {
      data: { vm_uuid: vmUuid }
    });
  }

  async addLoadBalancerRule(
    lbUuid: string,
    sourcePort: number,
    targetPort: number
  ): Promise<any> {
    let res = await this.axios.post(
      this.locationPath(`/network/load_balancers/${lbUuid}/rules`),
      {
        source_port: sourcePort,
        target_port: targetPort
      }
    );
    return res.data;
  }

  async removeLoadBalancerRule(lbUuid: string, ruleId: string): Promise<void> {
    await this.axios.delete(this.locationPath(`/network/load_balancers/${lbUuid}/rules`), {
      data: { rule_id: ruleId }
    });
  }

  // ── Platform Config ───────────────────────────────────

  async listLocations(): Promise<any[]> {
    let res = await this.axios.get('/config/locations');
    return res.data;
  }

  async listHostPools(): Promise<any[]> {
    let res = await this.axios.get(this.locationPath('/user-resource/host_pool/list'));
    return res.data;
  }

  async listOsImages(): Promise<any> {
    let res = await this.axios.get('/config/os-images');
    return res.data;
  }

  async listAppImages(): Promise<any> {
    let res = await this.axios.get('/config/app-images');
    return res.data;
  }

  async listBootableMedia(): Promise<any> {
    let res = await this.axios.get('/config/bootable-media');
    return res.data;
  }
}
