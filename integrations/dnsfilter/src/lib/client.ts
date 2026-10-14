import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.dnsfilter.com/v1';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('Provide a DNSFilter API key.');
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DNSFilter',
          reason: 'dnsfilter_api_error'
        })
    });
  }

  // ── Organizations ──

  async listOrganizations(): Promise<any[]> {
    let res = await this.axios.get('/organizations');
    return res.data?.data ?? res.data ?? [];
  }

  async getOrganization(organizationId: string): Promise<any> {
    let res = await this.axios.get(`/organizations/${organizationId}`);
    return res.data?.data ?? res.data;
  }

  async createOrganization(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/organizations', { organization: params });
    return res.data?.data ?? res.data;
  }

  async updateOrganization(organizationId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/organizations/${organizationId}`, {
      organization: params
    });
    return res.data?.data ?? res.data;
  }

  // ── Policies ──

  async listPolicies(organizationIds?: string[]): Promise<any[]> {
    let organizations = organizationIds?.length ? [...new Set(organizationIds)] : [undefined];
    let policies = await Promise.all(
      organizations.map(async organizationId => {
        let res = await this.axios.get('/policies', {
          params: pickDefined({ organization_id: organizationId })
        });
        return res.data?.data ?? res.data ?? [];
      })
    );
    return policies.flat();
  }

  async getPolicy(policyId: string): Promise<any> {
    let res = await this.axios.get(`/policies/${policyId}`);
    return res.data?.data ?? res.data;
  }

  async createPolicy(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/policies', { policy: params });
    return res.data?.data ?? res.data;
  }

  async updatePolicy(policyId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/policies/${policyId}`, { policy: params });
    return res.data?.data ?? res.data;
  }

  async deletePolicy(policyId: string): Promise<void> {
    await this.axios.delete(`/policies/${policyId}`);
  }

  // ── Scheduled Policies ──

  async listScheduledPolicies(): Promise<any[]> {
    let res = await this.axios.get('/scheduled_policies');
    return res.data?.data ?? res.data ?? [];
  }

  async createScheduledPolicy(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/scheduled_policies', params);
    return res.data?.data ?? res.data;
  }

  async updateScheduledPolicy(
    scheduledPolicyId: string,
    params: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.patch(`/scheduled_policies/${scheduledPolicyId}`, params);
    return res.data?.data ?? res.data;
  }

  async deleteScheduledPolicy(scheduledPolicyId: string): Promise<void> {
    await this.axios.delete(`/scheduled_policies/${scheduledPolicyId}`);
  }

  // ── Networks ──

  async listNetworks(params?: { organizationId?: string; msp?: boolean }): Promise<any[]> {
    let url = '/networks';
    let queryParams: Record<string, any> = {};
    if (params?.msp) {
      if (!params.organizationId) {
        throw createApiServiceError(
          'organizationId is required when msp is true. Call list_organizations to discover organization IDs.'
        );
      }
      url = '/networks/msp';
      if (params.organizationId) {
        queryParams.organization_id = params.organizationId;
      }
    }
    let res = await this.axios.get(url, { params: queryParams });
    return res.data?.data ?? res.data ?? [];
  }

  async getNetwork(networkId: string): Promise<any> {
    let res = await this.axios.get(`/networks/${networkId}`);
    return res.data?.data ?? res.data;
  }

  async createNetwork(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/networks', { network: params });
    return res.data?.data ?? res.data;
  }

  async updateNetwork(networkId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/networks/${networkId}`, { network: params });
    return res.data?.data ?? res.data;
  }

  async deleteNetwork(networkId: string): Promise<void> {
    await this.axios.delete(`/networks/${networkId}`);
  }

  async generateNetworkSecretKey(networkId: string): Promise<any> {
    let res = await this.axios.post(`/networks/${networkId}/secret_key`);
    return res.data?.data ?? res.data;
  }

  async rotateNetworkSecretKey(networkId: string): Promise<any> {
    let res = await this.axios.patch(`/networks/${networkId}/secret_key`);
    return res.data?.data ?? res.data;
  }

  async revokeNetworkSecretKey(networkId: string): Promise<void> {
    await this.axios.delete(`/networks/${networkId}/secret_key`);
  }

  // ── IP Addresses ──

  async listIpAddresses(): Promise<any[]> {
    let res = await this.axios.get('/ip_addresses');
    return res.data?.data ?? res.data ?? [];
  }

  async createIpAddress(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/ip_addresses', { ip_address: params });
    return res.data?.data ?? res.data;
  }

  async updateIpAddress(ipAddressId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/ip_addresses/${ipAddressId}`, { ip_address: params });
    return res.data?.data ?? res.data;
  }

  async deleteIpAddress(ipAddressId: string): Promise<void> {
    await this.axios.delete(`/ip_addresses/${ipAddressId}`);
  }

  async verifyIpAddress(params: Record<string, any>): Promise<any> {
    let res = await this.axios.get('/ip_addresses/verify', { data: { ip_address: params } });
    return res.data;
  }

  async getCurrentUser(): Promise<any> {
    let res = await this.axios.get('/current_user');
    return res.data?.data ?? res.data;
  }

  async getMyIp(): Promise<any> {
    let res = await this.axios.get('/ip_addresses/myip');
    return res.data?.data ?? res.data;
  }

  // ── Roaming Clients ──

  async listRoamingClients(params?: { page?: number; perPage?: number }): Promise<any> {
    let res = await this.axios.get('/user_agents', {
      params: pickDefined({ 'page[number]': params?.page, 'page[size]': params?.perPage })
    });
    return res.data;
  }

  async getRoamingClient(clientId: string): Promise<any> {
    let res = await this.axios.get(`/user_agents/${clientId}`);
    return res.data?.data ?? res.data;
  }

  async updateRoamingClient(clientId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/user_agents/${clientId}`, { user_agent: params });
    return res.data?.data ?? res.data;
  }

  async deleteRoamingClient(clientId: string): Promise<void> {
    await this.axios.delete(`/user_agents/${clientId}`);
  }

  // ── Agent Local Users ──

  async listAgentLocalUsers(): Promise<any[]> {
    let res = await this.axios.get('/agent_local_users');
    return res.data?.data ?? res.data ?? [];
  }

  async getAgentLocalUser(userId: string): Promise<any> {
    let res = await this.axios.get(`/agent_local_users/${userId}`);
    return res.data?.data ?? res.data;
  }

  async updateAgentLocalUser(userId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/agent_local_users/${userId}`, { data: params });
    return res.data?.data ?? res.data;
  }

  async deleteAgentLocalUser(userId: string): Promise<void> {
    await this.axios.delete(`/agent_local_users/${userId}`);
  }

  // ── Organization Users ──

  async listOrganizationUsers(organizationId: string): Promise<any[]> {
    let res = await this.axios.get(`/organizations/${organizationId}/users`);
    return res.data?.users ?? res.data?.data ?? res.data ?? [];
  }

  async getOrganizationUser(organizationId: string, userId: string): Promise<any> {
    let res = await this.axios.get(`/organizations/${organizationId}/users/${userId}`);
    return res.data?.user ?? res.data?.data ?? res.data;
  }

  async addOrganizationUser(
    organizationId: string,
    params: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(`/organizations/${organizationId}/users`, {
      user: params
    });
    return res.data?.user ?? res.data?.data ?? res.data;
  }

  async updateOrganizationUser(
    organizationId: string,
    userId: string,
    params: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.patch(`/organizations/${organizationId}/users/${userId}`, {
      user: params
    });
    return res.data?.user ?? res.data?.data ?? res.data;
  }

  async removeOrganizationUser(organizationId: string, userId: string): Promise<void> {
    await this.axios.delete(`/organizations/${organizationId}/users/${userId}`);
  }

  // ── Collections ──

  async listCollections(): Promise<any[]> {
    let res = await this.axios.get('/collections');
    return res.data?.data ?? res.data ?? [];
  }

  async createCollection(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/collections', { data: params });
    return res.data?.data ?? res.data;
  }

  async updateCollection(collectionId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/collections/${collectionId}`, { data: params });
    return res.data?.data ?? res.data;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.axios.delete(`/collections/${collectionId}`);
  }

  async listCollectionUsers(collectionId: string): Promise<any[]> {
    let res = await this.axios.get(`/collections/${collectionId}/users`);
    return res.data?.data ?? res.data ?? [];
  }

  async addCollectionUser(collectionId: string, params: Record<string, any>): Promise<any> {
    let { user_id, ...attributes } = params;
    let res = await this.axios.post(`/collections/${collectionId}/users`, {
      collection_id: collectionId,
      id: user_id,
      ...attributes
    });
    return res.data?.data ?? res.data;
  }

  async removeCollectionUser(collectionId: string, userId: string): Promise<void> {
    await this.axios.delete(`/collections/${collectionId}/users/${userId}`);
  }

  // ── Block Pages ──

  async listBlockPages(): Promise<any[]> {
    let res = await this.axios.get('/block_pages');
    return res.data?.data ?? res.data ?? [];
  }

  async getBlockPage(blockPageId: string): Promise<any> {
    let res = await this.axios.get(`/block_pages/${blockPageId}`);
    return res.data?.data ?? res.data;
  }

  async createBlockPage(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/block_pages', params);
    return res.data?.data ?? res.data;
  }

  async updateBlockPage(blockPageId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/block_pages/${blockPageId}`, params);
    return res.data?.data ?? res.data;
  }

  async deleteBlockPage(blockPageId: string): Promise<void> {
    await this.axios.delete(`/block_pages/${blockPageId}`);
  }

  // ── Domains ──

  async lookupDomain(fqdn: string): Promise<any> {
    let res = await this.axios.get('/domains/user_lookup', { params: { fqdn } });
    return res.data?.data ?? res.data;
  }

  async bulkLookupDomains(fqdns: string[]): Promise<any> {
    let res = await this.axios.get('/domains/bulk_lookup', {
      params: { fqdns: fqdns.join(',') }
    });
    return res.data?.data ?? res.data;
  }

  async suggestDomainCategories(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/domains/suggest_categories', params);
    return res.data?.data ?? res.data;
  }

  async suggestDomainThreat(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/domains/suggest_threat', null, {
      params: pickDefined({
        fqdn: params.domain,
        notes: params.threat_type
          ? `${params.notes} (Threat type: ${params.threat_type})`
          : params.notes,
        categories: params.category_ids?.join(',')
      })
    });
    return res.data?.data ?? res.data;
  }

  // ── Categories & Applications ──

  async listCategories(): Promise<any[]> {
    let res = await this.axios.get('/categories');
    return res.data?.data ?? res.data ?? [];
  }

  async listApplications(): Promise<any[]> {
    let res = await this.axios.get('/applications');
    return res.data?.data ?? res.data ?? [];
  }

  async listApplicationCategories(): Promise<any[]> {
    let res = await this.axios.get('/application_categories');
    return res.data?.data ?? res.data ?? [];
  }

  // ── MAC Addresses ──

  async listMacAddresses(): Promise<any[]> {
    let res = await this.axios.get('/mac_addresses');
    return res.data?.data ?? res.data ?? [];
  }

  async createMacAddress(params: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/mac_addresses', { mac_address: params });
    return res.data?.data ?? res.data;
  }

  async updateMacAddress(macAddressId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/mac_addresses/${macAddressId}`, {
      mac_address: params
    });
    return res.data?.data ?? res.data;
  }

  async deleteMacAddress(macAddressId: string): Promise<void> {
    await this.axios.delete(`/mac_addresses/${macAddressId}`);
  }

  // ── Traffic & Reports ──

  async getTrafficReport(params: Record<string, any>): Promise<any> {
    let res = await this.axios.get('/traffic_reports/total_requests', { params });
    return res.data?.data ?? res.data;
  }

  async getQueryLog(params: Record<string, any>): Promise<any> {
    let res = await this.axios.get('/traffic_reports/query_logs', { params });
    return res.data?.data ?? res.data;
  }

  // ── Invoices & Billing ──

  async listInvoices(organizationId: string): Promise<any[]> {
    let res = await this.axios.get('/invoices', {
      params: { organization_id: organizationId }
    });
    return res.data?.data ?? res.data ?? [];
  }

  async getCurrentInvoice(): Promise<any> {
    let res = await this.axios.get('/invoices/current');
    return res.data?.data ?? res.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let res = await this.axios.get(`/invoices/${invoiceId}`);
    return res.data?.data ?? res.data;
  }

  async getBilling(organizationId: string): Promise<any> {
    let res = await this.axios.get('/billing', {
      params: { organization_id: organizationId }
    });
    return res.data?.data ?? res.data;
  }

  // ── Network Subnets ──

  async listNetworkSubnets(networkId: string): Promise<any[]> {
    let res = await this.axios.get(`/networks/${networkId}/subnets`);
    return res.data?.data ?? res.data ?? [];
  }

  async createNetworkSubnet(networkId: string, params: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/networks/${networkId}/subnets`, {
      network_subnet: params
    });
    return res.data?.data ?? res.data;
  }

  async updateNetworkSubnet(
    networkId: string,
    subnetId: string,
    params: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.patch(`/networks/${networkId}/subnets/${subnetId}`, {
      network_subnet: params
    });
    return res.data?.data ?? res.data;
  }

  async deleteNetworkSubnet(networkId: string, subnetId: string): Promise<void> {
    await this.axios.delete(`/networks/${networkId}/subnets/${subnetId}`);
  }

  // ── Network LAN IPs ──

  async listNetworkLanIps(networkId: string): Promise<any[]> {
    let res = await this.axios.get(`/networks/${networkId}/lan_ips`);
    return res.data?.data ?? res.data ?? [];
  }

  async updateNetworkLanIp(
    networkId: string,
    lanIpId: string,
    params: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.patch(`/networks/${networkId}/lan_ips/${lanIpId}`, {
      network_lan_ip: params
    });
    return res.data?.data ?? res.data;
  }
}
