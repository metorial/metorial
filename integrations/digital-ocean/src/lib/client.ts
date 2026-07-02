import { createAxios } from '@slates/provider';
import { digitalOceanApiError } from './errors';

let responseArray = <T = any>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.digitalocean.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(digitalOceanApiError(error))
    );
  }

  // ─── Account ────────────────────────────────────────────────────

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data.account;
  }

  // ─── Droplets ───────────────────────────────────────────────────

  async listDroplets(params?: {
    page?: number;
    perPage?: number;
    tagName?: string;
    name?: string;
    type?: 'droplets' | 'gpus';
  }): Promise<{ droplets: any[]; meta: any }> {
    let response = await this.axios.get('/droplets', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20,
        tag_name: params?.tagName,
        name: params?.name,
        type: params?.type
      }
    });
    return { droplets: response.data.droplets, meta: response.data.meta };
  }

  async getDroplet(dropletId: number): Promise<any> {
    let response = await this.axios.get(`/droplets/${dropletId}`);
    return response.data.droplet;
  }

  async createDroplet(params: {
    name: string;
    region: string;
    size: string;
    image: string | number;
    sshKeys?: (string | number)[];
    backups?: boolean;
    ipv6?: boolean;
    monitoring?: boolean;
    userData?: string;
    vpcUuid?: string;
    tags?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/droplets', {
      name: params.name,
      region: params.region,
      size: params.size,
      image: params.image,
      ssh_keys: params.sshKeys,
      backups: params.backups,
      ipv6: params.ipv6,
      monitoring: params.monitoring,
      user_data: params.userData,
      vpc_uuid: params.vpcUuid,
      tags: params.tags
    });
    return response.data.droplet;
  }

  async deleteDroplet(dropletId: number): Promise<void> {
    await this.axios.delete(`/droplets/${dropletId}`);
  }

  async performDropletAction(
    dropletId: number,
    action: {
      type: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/droplets/${dropletId}/actions`, action);
    return response.data.action;
  }

  async resizeDroplet(
    dropletId: number,
    size: string,
    resizeDisk: boolean = true
  ): Promise<any> {
    return this.performDropletAction(dropletId, {
      type: 'resize',
      size,
      disk: resizeDisk
    });
  }

  async rebuildDroplet(dropletId: number, image: string | number): Promise<any> {
    return this.performDropletAction(dropletId, {
      type: 'rebuild',
      image
    });
  }

  async renameDroplet(dropletId: number, name: string): Promise<any> {
    return this.performDropletAction(dropletId, {
      type: 'rename',
      name
    });
  }

  async createDropletSnapshot(dropletId: number, name: string): Promise<any> {
    return this.performDropletAction(dropletId, {
      type: 'snapshot',
      name
    });
  }

  // ─── SSH Keys ───────────────────────────────────────────────────

  async listSSHKeys(): Promise<any[]> {
    let response = await this.axios.get('/account/keys');
    return response.data.ssh_keys;
  }

  async createSSHKey(params: { name: string; publicKey: string }): Promise<any> {
    let response = await this.axios.post('/account/keys', {
      name: params.name,
      public_key: params.publicKey
    });
    return response.data.ssh_key;
  }

  async deleteSSHKey(keyIdOrFingerprint: string | number): Promise<void> {
    await this.axios.delete(`/account/keys/${keyIdOrFingerprint}`);
  }

  // ─── Domains & DNS ─────────────────────────────────────────────

  async listDomains(): Promise<any[]> {
    let response = await this.axios.get('/domains');
    return response.data.domains;
  }

  async getDomain(domainName: string): Promise<any> {
    let response = await this.axios.get(`/domains/${domainName}`);
    return response.data.domain;
  }

  async createDomain(params: { name: string; ipAddress?: string }): Promise<any> {
    let response = await this.axios.post('/domains', {
      name: params.name,
      ip_address: params.ipAddress
    });
    return response.data.domain;
  }

  async deleteDomain(domainName: string): Promise<void> {
    await this.axios.delete(`/domains/${domainName}`);
  }

  async listDomainRecords(
    domainName: string,
    params?: {
      page?: number;
      perPage?: number;
      type?: string;
      name?: string;
    }
  ): Promise<{ records: any[]; meta: any }> {
    let response = await this.axios.get(`/domains/${domainName}/records`, {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20,
        type: params?.type,
        name: params?.name
      }
    });
    return { records: response.data.domain_records, meta: response.data.meta };
  }

  async createDomainRecord(
    domainName: string,
    params: {
      type: string;
      name: string;
      data: string;
      priority?: number;
      port?: number;
      ttl?: number;
      weight?: number;
      flags?: number;
      tag?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/domains/${domainName}/records`, params);
    return response.data.domain_record;
  }

  async updateDomainRecord(
    domainName: string,
    recordId: number,
    params: {
      type?: string;
      name?: string;
      data?: string;
      priority?: number;
      port?: number;
      ttl?: number;
      weight?: number;
      flags?: number;
      tag?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/domains/${domainName}/records/${recordId}`,
      params
    );
    return response.data.domain_record;
  }

  async deleteDomainRecord(domainName: string, recordId: number): Promise<void> {
    await this.axios.delete(`/domains/${domainName}/records/${recordId}`);
  }

  // ─── Databases ─────────────────────────────────────────────────

  async listDatabaseClusters(params?: {
    page?: number;
    perPage?: number;
    tagName?: string;
  }): Promise<{ databases: any[]; meta: any }> {
    let response = await this.axios.get('/databases', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20,
        tag_name: params?.tagName
      }
    });
    return { databases: responseArray(response.data.databases), meta: response.data.meta };
  }

  async getDatabaseCluster(databaseId: string): Promise<any> {
    let response = await this.axios.get(`/databases/${databaseId}`);
    return response.data.database;
  }

  async createDatabaseCluster(params: {
    name: string;
    engine: string;
    version?: string;
    size: string;
    region: string;
    numNodes: number;
    tags?: string[];
    privateNetworkUuid?: string;
  }): Promise<any> {
    let response = await this.axios.post('/databases', {
      name: params.name,
      engine: params.engine,
      version: params.version,
      size: params.size,
      region: params.region,
      num_nodes: params.numNodes,
      tags: params.tags,
      private_network_uuid: params.privateNetworkUuid
    });
    return response.data.database;
  }

  async deleteDatabaseCluster(databaseId: string): Promise<void> {
    await this.axios.delete(`/databases/${databaseId}`);
  }

  async resizeDatabaseCluster(
    databaseId: string,
    params: {
      size: string;
      numNodes: number;
    }
  ): Promise<void> {
    await this.axios.put(`/databases/${databaseId}/resize`, {
      size: params.size,
      num_nodes: params.numNodes
    });
  }

  async listDatabaseUsers(databaseId: string): Promise<any[]> {
    let response = await this.axios.get(`/databases/${databaseId}/users`);
    return response.data.users;
  }

  async createDatabaseUser(
    databaseId: string,
    params: {
      name: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/databases/${databaseId}/users`, {
      name: params.name
    });
    return response.data.user;
  }

  async deleteDatabaseUser(databaseId: string, userName: string): Promise<void> {
    await this.axios.delete(`/databases/${databaseId}/users/${userName}`);
  }

  async listDatabaseDBs(databaseId: string): Promise<any[]> {
    let response = await this.axios.get(`/databases/${databaseId}/dbs`);
    return response.data.dbs;
  }

  async createDatabaseDB(databaseId: string, name: string): Promise<any> {
    let response = await this.axios.post(`/databases/${databaseId}/dbs`, { name });
    return response.data.db;
  }

  async deleteDatabaseDB(databaseId: string, dbName: string): Promise<void> {
    await this.axios.delete(`/databases/${databaseId}/dbs/${dbName}`);
  }

  async listDatabaseFirewallRules(databaseId: string): Promise<any[]> {
    let response = await this.axios.get(`/databases/${databaseId}/firewall`);
    return response.data.rules;
  }

  async updateDatabaseFirewallRules(
    databaseId: string,
    rules: Array<{
      type: string;
      value: string;
    }>
  ): Promise<void> {
    await this.axios.put(`/databases/${databaseId}/firewall`, { rules });
  }

  // ─── Kubernetes ────────────────────────────────────────────────

  async listKubernetesClusters(): Promise<any[]> {
    let response = await this.axios.get('/kubernetes/clusters');
    return response.data.kubernetes_clusters;
  }

  async getKubernetesCluster(clusterId: string): Promise<any> {
    let response = await this.axios.get(`/kubernetes/clusters/${clusterId}`);
    return response.data.kubernetes_cluster;
  }

  async createKubernetesCluster(params: {
    name: string;
    region: string;
    version: string;
    nodePools: Array<{
      name: string;
      size: string;
      count: number;
      tags?: string[];
      autoScale?: boolean;
      minNodes?: number;
      maxNodes?: number;
    }>;
    tags?: string[];
    vpcUuid?: string;
    maintenancePolicy?: {
      startTime: string;
      day: string;
    };
  }): Promise<any> {
    let response = await this.axios.post('/kubernetes/clusters', {
      name: params.name,
      region: params.region,
      version: params.version,
      node_pools: params.nodePools.map(np => ({
        name: np.name,
        size: np.size,
        count: np.count,
        tags: np.tags,
        auto_scale: np.autoScale,
        min_nodes: np.minNodes,
        max_nodes: np.maxNodes
      })),
      tags: params.tags,
      vpc_uuid: params.vpcUuid,
      maintenance_policy: params.maintenancePolicy
        ? {
            start_time: params.maintenancePolicy.startTime,
            day: params.maintenancePolicy.day
          }
        : undefined
    });
    return response.data.kubernetes_cluster;
  }

  async deleteKubernetesCluster(clusterId: string): Promise<void> {
    await this.axios.delete(`/kubernetes/clusters/${clusterId}`);
  }

  async getKubernetesKubeconfig(clusterId: string): Promise<string> {
    let response = await this.axios.get(`/kubernetes/clusters/${clusterId}/kubeconfig`);
    return response.data;
  }

  async listKubernetesNodePools(clusterId: string): Promise<any[]> {
    let response = await this.axios.get(`/kubernetes/clusters/${clusterId}/node_pools`);
    return response.data.node_pools;
  }

  async addKubernetesNodePool(
    clusterId: string,
    params: {
      name: string;
      size: string;
      count: number;
      tags?: string[];
      autoScale?: boolean;
      minNodes?: number;
      maxNodes?: number;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/kubernetes/clusters/${clusterId}/node_pools`, {
      name: params.name,
      size: params.size,
      count: params.count,
      tags: params.tags,
      auto_scale: params.autoScale,
      min_nodes: params.minNodes,
      max_nodes: params.maxNodes
    });
    return response.data.node_pool;
  }

  async deleteKubernetesNodePool(clusterId: string, nodePoolId: string): Promise<void> {
    await this.axios.delete(`/kubernetes/clusters/${clusterId}/node_pools/${nodePoolId}`);
  }

  async listKubernetesVersions(): Promise<any> {
    let response = await this.axios.get('/kubernetes/options');
    return response.data.options;
  }

  // ─── App Platform ──────────────────────────────────────────────

  async listApps(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ apps: any[]; meta: any }> {
    let response = await this.axios.get('/apps', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { apps: response.data.apps || [], meta: response.data.meta };
  }

  async getApp(appId: string): Promise<any> {
    let response = await this.axios.get(`/apps/${appId}`);
    return response.data.app;
  }

  async createApp(appSpec: any): Promise<any> {
    let response = await this.axios.post('/apps', { spec: appSpec });
    return response.data.app;
  }

  async updateApp(appId: string, appSpec: any): Promise<any> {
    let response = await this.axios.put(`/apps/${appId}`, { spec: appSpec });
    return response.data.app;
  }

  async deleteApp(appId: string): Promise<void> {
    await this.axios.delete(`/apps/${appId}`);
  }

  async listAppDeployments(
    appId: string,
    params?: { page?: number; perPage?: number }
  ): Promise<{ deployments: any[]; meta: any }> {
    let response = await this.axios.get(`/apps/${appId}/deployments`, {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { deployments: response.data.deployments || [], meta: response.data.meta };
  }

  async createAppDeployment(appId: string): Promise<any> {
    let response = await this.axios.post(`/apps/${appId}/deployments`);
    return response.data.deployment;
  }

  // ─── Volumes (Block Storage) ───────────────────────────────────

  async listVolumes(params?: {
    page?: number;
    perPage?: number;
    region?: string;
    name?: string;
  }): Promise<{ volumes: any[]; meta: any }> {
    let response = await this.axios.get('/volumes', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20,
        region: params?.region,
        name: params?.name
      }
    });
    return { volumes: response.data.volumes, meta: response.data.meta };
  }

  async getVolume(volumeId: string): Promise<any> {
    let response = await this.axios.get(`/volumes/${volumeId}`);
    return response.data.volume;
  }

  async createVolume(params: {
    name: string;
    region: string;
    sizeGigabytes: number;
    description?: string;
    filesystemType?: string;
    filesystemLabel?: string;
    tags?: string[];
    snapshotId?: string;
  }): Promise<any> {
    let response = await this.axios.post('/volumes', {
      name: params.name,
      region: params.region,
      size_gigabytes: params.sizeGigabytes,
      description: params.description,
      filesystem_type: params.filesystemType,
      filesystem_label: params.filesystemLabel,
      tags: params.tags,
      snapshot_id: params.snapshotId
    });
    return response.data.volume;
  }

  async deleteVolume(volumeId: string): Promise<void> {
    await this.axios.delete(`/volumes/${volumeId}`);
  }

  async attachVolume(volumeId: string, dropletId: number, region?: string): Promise<any> {
    let response = await this.axios.post(`/volumes/${volumeId}/actions`, {
      type: 'attach',
      droplet_id: dropletId,
      region
    });
    return response.data.action;
  }

  async detachVolume(volumeId: string, dropletId: number, region?: string): Promise<any> {
    let response = await this.axios.post(`/volumes/${volumeId}/actions`, {
      type: 'detach',
      droplet_id: dropletId,
      region
    });
    return response.data.action;
  }

  async resizeVolume(volumeId: string, sizeGigabytes: number, region?: string): Promise<any> {
    let response = await this.axios.post(`/volumes/${volumeId}/actions`, {
      type: 'resize',
      size_gigabytes: sizeGigabytes,
      region
    });
    return response.data.action;
  }

  // ─── Load Balancers ────────────────────────────────────────────

  async listLoadBalancers(): Promise<any[]> {
    let response = await this.axios.get('/load_balancers');
    return response.data.load_balancers;
  }

  async getLoadBalancer(loadBalancerId: string): Promise<any> {
    let response = await this.axios.get(`/load_balancers/${loadBalancerId}`);
    return response.data.load_balancer;
  }

  async createLoadBalancer(params: {
    name: string;
    region: string;
    forwardingRules: Array<{
      entryProtocol: string;
      entryPort: number;
      targetProtocol: string;
      targetPort: number;
      certificateId?: string;
      tlsPassthrough?: boolean;
    }>;
    healthCheck?: {
      protocol: string;
      port: number;
      path?: string;
      checkIntervalSeconds?: number;
      responseTimeoutSeconds?: number;
      unhealthyThreshold?: number;
      healthyThreshold?: number;
    };
    dropletIds?: number[];
    tag?: string;
    vpcUuid?: string;
    algorithm?: string;
    stickySession?: {
      type: string;
      cookieName?: string;
      cookieTtlSeconds?: number;
    };
  }): Promise<any> {
    let response = await this.axios.post('/load_balancers', {
      name: params.name,
      region: params.region,
      forwarding_rules: params.forwardingRules.map(r => ({
        entry_protocol: r.entryProtocol,
        entry_port: r.entryPort,
        target_protocol: r.targetProtocol,
        target_port: r.targetPort,
        certificate_id: r.certificateId,
        tls_passthrough: r.tlsPassthrough
      })),
      health_check: params.healthCheck
        ? {
            protocol: params.healthCheck.protocol,
            port: params.healthCheck.port,
            path: params.healthCheck.path,
            check_interval_seconds: params.healthCheck.checkIntervalSeconds,
            response_timeout_seconds: params.healthCheck.responseTimeoutSeconds,
            unhealthy_threshold: params.healthCheck.unhealthyThreshold,
            healthy_threshold: params.healthCheck.healthyThreshold
          }
        : undefined,
      droplet_ids: params.dropletIds,
      tag: params.tag,
      vpc_uuid: params.vpcUuid,
      algorithm: params.algorithm,
      sticky_sessions: params.stickySession
        ? {
            type: params.stickySession.type,
            cookie_name: params.stickySession.cookieName,
            cookie_ttl_seconds: params.stickySession.cookieTtlSeconds
          }
        : undefined
    });
    return response.data.load_balancer;
  }

  async deleteLoadBalancer(loadBalancerId: string): Promise<void> {
    await this.axios.delete(`/load_balancers/${loadBalancerId}`);
  }

  async updateLoadBalancer(loadBalancerId: string, params: any): Promise<any> {
    let response = await this.axios.put(`/load_balancers/${loadBalancerId}`, params);
    return response.data.load_balancer;
  }

  async addDropletsToLoadBalancer(
    loadBalancerId: string,
    dropletIds: number[]
  ): Promise<void> {
    await this.axios.post(`/load_balancers/${loadBalancerId}/droplets`, {
      droplet_ids: dropletIds
    });
  }

  async removeDropletsFromLoadBalancer(
    loadBalancerId: string,
    dropletIds: number[]
  ): Promise<void> {
    await this.axios.delete(`/load_balancers/${loadBalancerId}/droplets`, {
      data: { droplet_ids: dropletIds }
    });
  }

  // ─── Firewalls ─────────────────────────────────────────────────

  async listFirewalls(): Promise<any[]> {
    let response = await this.axios.get('/firewalls');
    return response.data.firewalls;
  }

  async getFirewall(firewallId: string): Promise<any> {
    let response = await this.axios.get(`/firewalls/${firewallId}`);
    return response.data.firewall;
  }

  async createFirewall(params: {
    name: string;
    inboundRules?: Array<{
      protocol: string;
      ports: string;
      sources: {
        addresses?: string[];
        dropletIds?: number[];
        tags?: string[];
        loadBalancerUids?: string[];
      };
    }>;
    outboundRules?: Array<{
      protocol: string;
      ports: string;
      destinations: {
        addresses?: string[];
        dropletIds?: number[];
        tags?: string[];
        loadBalancerUids?: string[];
      };
    }>;
    dropletIds?: number[];
    tags?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/firewalls', {
      name: params.name,
      inbound_rules: params.inboundRules?.map(r => ({
        protocol: r.protocol,
        ports: r.ports,
        sources: {
          addresses: r.sources.addresses,
          droplet_ids: r.sources.dropletIds,
          tags: r.sources.tags,
          load_balancer_uids: r.sources.loadBalancerUids
        }
      })),
      outbound_rules: params.outboundRules?.map(r => ({
        protocol: r.protocol,
        ports: r.ports,
        destinations: {
          addresses: r.destinations.addresses,
          droplet_ids: r.destinations.dropletIds,
          tags: r.destinations.tags,
          load_balancer_uids: r.destinations.loadBalancerUids
        }
      })),
      droplet_ids: params.dropletIds,
      tags: params.tags
    });
    return response.data.firewall;
  }

  async deleteFirewall(firewallId: string): Promise<void> {
    await this.axios.delete(`/firewalls/${firewallId}`);
  }

  async updateFirewall(firewallId: string, params: any): Promise<any> {
    let response = await this.axios.put(`/firewalls/${firewallId}`, params);
    return response.data.firewall;
  }

  // ─── VPCs ──────────────────────────────────────────────────────

  async listVPCs(): Promise<any[]> {
    let response = await this.axios.get('/vpcs');
    return response.data.vpcs;
  }

  async getVPC(vpcId: string): Promise<any> {
    let response = await this.axios.get(`/vpcs/${vpcId}`);
    return response.data.vpc;
  }

  async createVPC(params: {
    name: string;
    region: string;
    description?: string;
    ipRange?: string;
  }): Promise<any> {
    let response = await this.axios.post('/vpcs', {
      name: params.name,
      region: params.region,
      description: params.description,
      ip_range: params.ipRange
    });
    return response.data.vpc;
  }

  async deleteVPC(vpcId: string): Promise<void> {
    await this.axios.delete(`/vpcs/${vpcId}`);
  }

  async updateVPC(
    vpcId: string,
    params: {
      name?: string;
      description?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/vpcs/${vpcId}`, params);
    return response.data.vpc;
  }

  // ─── Projects ──────────────────────────────────────────────────

  async listProjects(): Promise<any[]> {
    let response = await this.axios.get('/projects');
    return response.data.projects;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data.project;
  }

  async createProject(params: {
    name: string;
    description?: string;
    purpose?: string;
    environment?: string;
  }): Promise<any> {
    let response = await this.axios.post('/projects', params);
    return response.data.project;
  }

  async updateProject(
    projectId: string,
    params: {
      name?: string;
      description?: string;
      purpose?: string;
      environment?: string;
      isDefault?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/projects/${projectId}`, {
      name: params.name,
      description: params.description,
      purpose: params.purpose,
      environment: params.environment,
      is_default: params.isDefault
    });
    return response.data.project;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`);
  }

  async listProjectResources(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/resources`);
    return response.data.resources;
  }

  async assignResourcesToProject(projectId: string, resources: string[]): Promise<any[]> {
    let response = await this.axios.post(`/projects/${projectId}/resources`, {
      resources
    });
    return response.data.resources;
  }

  // ─── Tags ──────────────────────────────────────────────────────

  async listTags(): Promise<any[]> {
    let response = await this.axios.get('/tags');
    return response.data.tags;
  }

  async createTag(name: string): Promise<any> {
    let response = await this.axios.post('/tags', { name });
    return response.data.tag;
  }

  async deleteTag(tagName: string): Promise<void> {
    await this.axios.delete(`/tags/${tagName}`);
  }

  async tagResources(
    tagName: string,
    resources: Array<{
      resourceId: string;
      resourceType: string;
    }>
  ): Promise<void> {
    await this.axios.post(`/tags/${tagName}/resources`, {
      resources: resources.map(r => ({
        resource_id: r.resourceId,
        resource_type: r.resourceType
      }))
    });
  }

  async untagResources(
    tagName: string,
    resources: Array<{
      resourceId: string;
      resourceType: string;
    }>
  ): Promise<void> {
    await this.axios.delete(`/tags/${tagName}/resources`, {
      data: {
        resources: resources.map(r => ({
          resource_id: r.resourceId,
          resource_type: r.resourceType
        }))
      }
    });
  }

  // ─── Snapshots ─────────────────────────────────────────────────

  async listSnapshots(params?: {
    resourceType?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ snapshots: any[]; meta: any }> {
    let response = await this.axios.get('/snapshots', {
      params: {
        resource_type: params?.resourceType,
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { snapshots: response.data.snapshots, meta: response.data.meta };
  }

  async getSnapshot(snapshotId: string): Promise<any> {
    let response = await this.axios.get(`/snapshots/${snapshotId}`);
    return response.data.snapshot;
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this.axios.delete(`/snapshots/${snapshotId}`);
  }

  // ─── Images ────────────────────────────────────────────────────

  async listImages(params?: {
    type?: string;
    private_?: boolean;
    page?: number;
    perPage?: number;
    tagName?: string;
  }): Promise<{ images: any[]; meta: any }> {
    let response = await this.axios.get('/images', {
      params: {
        type: params?.type,
        private: params?.private_,
        page: params?.page || 1,
        per_page: params?.perPage || 20,
        tag_name: params?.tagName
      }
    });
    return { images: response.data.images, meta: response.data.meta };
  }

  async getImage(imageId: number | string): Promise<any> {
    let response = await this.axios.get(`/images/${imageId}`);
    return response.data.image;
  }

  async deleteImage(imageId: number): Promise<void> {
    await this.axios.delete(`/images/${imageId}`);
  }

  // ─── Reserved IPs ─────────────────────────────────────────────

  async listReservedIPs(): Promise<any[]> {
    let response = await this.axios.get('/reserved_ips');
    return response.data.reserved_ips;
  }

  async createReservedIP(params: {
    region?: string;
    dropletId?: number;
    projectId?: string;
  }): Promise<any> {
    let body: any = {};
    if (params.region) body.region = params.region;
    if (params.dropletId) body.droplet_id = params.dropletId;
    if (params.projectId) body.project_id = params.projectId;
    let response = await this.axios.post('/reserved_ips', body);
    return response.data.reserved_ip;
  }

  async deleteReservedIP(reservedIp: string): Promise<void> {
    await this.axios.delete(`/reserved_ips/${reservedIp}`);
  }

  async assignReservedIP(reservedIp: string, dropletId: number): Promise<any> {
    let response = await this.axios.post(`/reserved_ips/${reservedIp}/actions`, {
      type: 'assign',
      droplet_id: dropletId
    });
    return response.data.action;
  }

  async unassignReservedIP(reservedIp: string): Promise<any> {
    let response = await this.axios.post(`/reserved_ips/${reservedIp}/actions`, {
      type: 'unassign'
    });
    return response.data.action;
  }

  // ─── Container Registry ────────────────────────────────────────

  async getContainerRegistry(): Promise<any> {
    let response = await this.axios.get('/registry');
    return response.data.registry;
  }

  async listRegistryRepositories(registryName: string): Promise<any[]> {
    let response = await this.axios.get(`/registry/${registryName}/repositoriesV2`);
    return response.data.repositories;
  }

  async listRegistryRepositoryTags(
    registryName: string,
    repositoryName: string
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/registry/${registryName}/repositories/${repositoryName}/tags`
    );
    return response.data.tags;
  }

  async deleteRegistryRepositoryTag(
    registryName: string,
    repositoryName: string,
    tag: string
  ): Promise<void> {
    await this.axios.delete(
      `/registry/${registryName}/repositories/${repositoryName}/tags/${tag}`
    );
  }

  async runRegistryGarbageCollection(registryName: string): Promise<any> {
    let response = await this.axios.post(`/registry/${registryName}/garbage-collection`);
    return response.data.garbage_collection;
  }

  // ─── Monitoring ────────────────────────────────────────────────

  async listAlertPolicies(): Promise<any[]> {
    let response = await this.axios.get('/monitoring/alerts');
    return response.data.policies;
  }

  async getAlertPolicy(alertId: string): Promise<any> {
    let response = await this.axios.get(`/monitoring/alerts/${alertId}`);
    return response.data.policy;
  }

  async createAlertPolicy(params: {
    type: string;
    description: string;
    compare: string;
    value: number;
    window: string;
    entities: string[];
    tags: string[];
    alerts: {
      email: string[];
      slack: Array<{ url: string; channel: string }>;
    };
    enabled: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/monitoring/alerts', params);
    return response.data.policy;
  }

  async deleteAlertPolicy(alertId: string): Promise<void> {
    await this.axios.delete(`/monitoring/alerts/${alertId}`);
  }

  // ─── Uptime ────────────────────────────────────────────────────

  async listUptimeChecks(): Promise<any[]> {
    let response = await this.axios.get('/uptime/checks');
    return response.data.checks;
  }

  async getUptimeCheck(checkId: string): Promise<any> {
    let response = await this.axios.get(`/uptime/checks/${checkId}`);
    return response.data.check;
  }

  async createUptimeCheck(params: {
    name: string;
    target: string;
    type?: string;
    regions?: string[];
    enabled?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/uptime/checks', params);
    return response.data.check;
  }

  async deleteUptimeCheck(checkId: string): Promise<void> {
    await this.axios.delete(`/uptime/checks/${checkId}`);
  }

  async updateUptimeCheck(
    checkId: string,
    params: {
      name?: string;
      target?: string;
      type?: string;
      regions?: string[];
      enabled?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/uptime/checks/${checkId}`, params);
    return response.data.check;
  }

  // ─── Billing ───────────────────────────────────────────────────

  async getBalance(): Promise<any> {
    let response = await this.axios.get('/customers/my/balance');
    return response.data;
  }

  async getBillingHistory(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ billingHistory: any[]; meta: any }> {
    let response = await this.axios.get('/customers/my/billing_history', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { billingHistory: response.data.billing_history, meta: response.data.meta };
  }

  async listInvoices(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ invoices: any[]; meta: any }> {
    let response = await this.axios.get('/customers/my/invoices', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { invoices: response.data.invoices, meta: response.data.meta };
  }

  // ─── Regions & Sizes ───────────────────────────────────────────

  async listRegions(): Promise<any[]> {
    let response = await this.axios.get('/regions');
    return response.data.regions;
  }

  async listSizes(): Promise<any[]> {
    let response = await this.axios.get('/sizes');
    return response.data.sizes;
  }

  // ─── Functions (Serverless) ────────────────────────────────────

  async listFunctionNamespaces(): Promise<any[]> {
    let response = await this.axios.get('/functions/namespaces');
    return response.data.namespaces || [];
  }

  async getFunctionNamespace(namespaceId: string): Promise<any> {
    let response = await this.axios.get(`/functions/namespaces/${namespaceId}`);
    return response.data.namespace;
  }

  async createFunctionNamespace(params: { label: string; region: string }): Promise<any> {
    let response = await this.axios.post('/functions/namespaces', params);
    return response.data.namespace;
  }

  async deleteFunctionNamespace(namespaceId: string): Promise<void> {
    await this.axios.delete(`/functions/namespaces/${namespaceId}`);
  }

  async listFunctionTriggers(namespaceId: string): Promise<any[]> {
    let response = await this.axios.get(`/functions/namespaces/${namespaceId}/triggers`);
    return response.data.triggers || [];
  }

  async createFunctionTrigger(
    namespaceId: string,
    params: {
      name: string;
      function: string;
      type: string;
      isEnabled: boolean;
      scheduledDetails?: { cron: string; body: any };
    }
  ): Promise<any> {
    let response = await this.axios.post(`/functions/namespaces/${namespaceId}/triggers`, {
      name: params.name,
      function: params.function,
      type: params.type,
      is_enabled: params.isEnabled,
      scheduled_details: params.scheduledDetails
    });
    return response.data.trigger;
  }

  async deleteFunctionTrigger(namespaceId: string, triggerName: string): Promise<void> {
    await this.axios.delete(`/functions/namespaces/${namespaceId}/triggers/${triggerName}`);
  }

  // ─── CDN & Certificates ───────────────────────────────────────

  async listCdnEndpoints(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ endpoints: any[]; meta: any }> {
    let response = await this.axios.get('/cdn/endpoints', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { endpoints: response.data.endpoints || [], meta: response.data.meta };
  }

  async listCertificates(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ certificates: any[]; meta: any }> {
    let response = await this.axios.get('/certificates', {
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 20
      }
    });
    return { certificates: response.data.certificates || [], meta: response.data.meta };
  }
}
