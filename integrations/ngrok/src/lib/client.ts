import { createAxios } from 'slates';

export interface PaginationParams {
  beforeId?: string;
  limit?: number;
}

export interface Ref {
  id: string;
  uri: string;
}

export class NgrokClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.ngrok.com'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Ngrok-Version': '2',
      'Content-Type': 'application/json'
    };
  }

  private paginationQuery(params?: PaginationParams): Record<string, string> {
    let query: Record<string, string> = {};
    if (params?.beforeId) query.before_id = params.beforeId;
    if (params?.limit) query.limit = String(params.limit);
    return query;
  }

  // ---- Reserved Domains ----

  async createDomain(data: {
    domain: string;
    description?: string;
    metadata?: string;
    certificateId?: string;
    certificateManagementPolicy?: { authority: string; privateKeyType?: string };
  }) {
    let body: Record<string, any> = { domain: data.domain };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.certificateId) body.certificate_id = data.certificateId;
    if (data.certificateManagementPolicy) {
      body.certificate_management_policy = {
        authority: data.certificateManagementPolicy.authority,
        private_key_type: data.certificateManagementPolicy.privateKeyType
      };
    }
    let res = await this.axios.post('/reserved_domains', body, { headers: this.headers });
    return res.data;
  }

  async listDomains(params?: PaginationParams) {
    let res = await this.axios.get('/reserved_domains', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getDomain(domainId: string) {
    let res = await this.axios.get(`/reserved_domains/${domainId}`, { headers: this.headers });
    return res.data;
  }

  async updateDomain(
    domainId: string,
    data: {
      description?: string;
      metadata?: string;
      certificateId?: string;
      certificateManagementPolicy?: { authority: string; privateKeyType?: string } | null;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.certificateId !== undefined) body.certificate_id = data.certificateId;
    if (data.certificateManagementPolicy !== undefined) {
      if (data.certificateManagementPolicy === null) {
        body.certificate_management_policy = null;
      } else {
        body.certificate_management_policy = {
          authority: data.certificateManagementPolicy.authority,
          private_key_type: data.certificateManagementPolicy.privateKeyType
        };
      }
    }
    let res = await this.axios.patch(`/reserved_domains/${domainId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteDomain(domainId: string) {
    await this.axios.delete(`/reserved_domains/${domainId}`, { headers: this.headers });
  }

  // ---- Reserved Addresses ----

  async createAddress(data: { description?: string; metadata?: string; region?: string }) {
    let body: Record<string, any> = {};
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.region) body.region = data.region;
    let res = await this.axios.post('/reserved_addrs', body, { headers: this.headers });
    return res.data;
  }

  async listAddresses(params?: PaginationParams) {
    let res = await this.axios.get('/reserved_addrs', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getAddress(addressId: string) {
    let res = await this.axios.get(`/reserved_addrs/${addressId}`, { headers: this.headers });
    return res.data;
  }

  async updateAddress(
    addressId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/reserved_addrs/${addressId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteAddress(addressId: string) {
    await this.axios.delete(`/reserved_addrs/${addressId}`, { headers: this.headers });
  }

  // ---- Endpoints ----

  async createEndpoint(data: {
    url: string;
    type?: string;
    trafficPolicy?: string;
    description?: string;
    metadata?: string;
    bindings?: string[];
  }) {
    let body: Record<string, any> = { url: data.url };
    if (data.type) body.type = data.type;
    if (data.trafficPolicy) body.traffic_policy = data.trafficPolicy;
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.bindings) body.bindings = data.bindings;
    let res = await this.axios.post('/endpoints', body, { headers: this.headers });
    return res.data;
  }

  async listEndpoints(params?: PaginationParams) {
    let res = await this.axios.get('/endpoints', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getEndpoint(endpointId: string) {
    let res = await this.axios.get(`/endpoints/${endpointId}`, { headers: this.headers });
    return res.data;
  }

  async updateEndpoint(
    endpointId: string,
    data: {
      url?: string;
      trafficPolicy?: string;
      description?: string;
      metadata?: string;
      bindings?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.url !== undefined) body.url = data.url;
    if (data.trafficPolicy !== undefined) body.traffic_policy = data.trafficPolicy;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.bindings !== undefined) body.bindings = data.bindings;
    let res = await this.axios.patch(`/endpoints/${endpointId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteEndpoint(endpointId: string) {
    await this.axios.delete(`/endpoints/${endpointId}`, { headers: this.headers });
  }

  // ---- Tunnels ----

  async listTunnels(params?: PaginationParams) {
    let res = await this.axios.get('/tunnels', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getTunnel(tunnelId: string) {
    let res = await this.axios.get(`/tunnels/${tunnelId}`, { headers: this.headers });
    return res.data;
  }

  // ---- Tunnel Sessions ----

  async listTunnelSessions(params?: PaginationParams) {
    let res = await this.axios.get('/tunnel_sessions', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getTunnelSession(sessionId: string) {
    let res = await this.axios.get(`/tunnel_sessions/${sessionId}`, { headers: this.headers });
    return res.data;
  }

  async restartTunnelSession(sessionId: string) {
    await this.axios.post(
      `/tunnel_sessions/${sessionId}/restart`,
      {},
      { headers: this.headers }
    );
  }

  async stopTunnelSession(sessionId: string) {
    await this.axios.post(`/tunnel_sessions/${sessionId}/stop`, {}, { headers: this.headers });
  }

  // ---- API Keys ----

  async createApiKey(data: { description?: string; metadata?: string; ownerId?: string }) {
    let body: Record<string, any> = {};
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.ownerId) body.owner_id = data.ownerId;
    let res = await this.axios.post('/api_keys', body, { headers: this.headers });
    return res.data;
  }

  async listApiKeys(params?: PaginationParams) {
    let res = await this.axios.get('/api_keys', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getApiKey(keyId: string) {
    let res = await this.axios.get(`/api_keys/${keyId}`, { headers: this.headers });
    return res.data;
  }

  async updateApiKey(
    keyId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/api_keys/${keyId}`, body, { headers: this.headers });
    return res.data;
  }

  async deleteApiKey(keyId: string) {
    await this.axios.delete(`/api_keys/${keyId}`, { headers: this.headers });
  }

  // ---- Credentials (Authtokens) ----

  async createCredential(data: {
    description?: string;
    metadata?: string;
    acl?: string[];
    ownerId?: string;
  }) {
    let body: Record<string, any> = {};
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.acl) body.acl = data.acl;
    if (data.ownerId) body.owner_id = data.ownerId;
    let res = await this.axios.post('/credentials', body, { headers: this.headers });
    return res.data;
  }

  async listCredentials(params?: PaginationParams) {
    let res = await this.axios.get('/credentials', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getCredential(credentialId: string) {
    let res = await this.axios.get(`/credentials/${credentialId}`, { headers: this.headers });
    return res.data;
  }

  async updateCredential(
    credentialId: string,
    data: {
      description?: string;
      metadata?: string;
      acl?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.acl !== undefined) body.acl = data.acl;
    let res = await this.axios.patch(`/credentials/${credentialId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteCredential(credentialId: string) {
    await this.axios.delete(`/credentials/${credentialId}`, { headers: this.headers });
  }

  // ---- IP Policies ----

  async createIpPolicy(data: { description?: string; metadata?: string }) {
    let body: Record<string, any> = {};
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/ip_policies', body, { headers: this.headers });
    return res.data;
  }

  async listIpPolicies(params?: PaginationParams) {
    let res = await this.axios.get('/ip_policies', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getIpPolicy(policyId: string) {
    let res = await this.axios.get(`/ip_policies/${policyId}`, { headers: this.headers });
    return res.data;
  }

  async updateIpPolicy(
    policyId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/ip_policies/${policyId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteIpPolicy(policyId: string) {
    await this.axios.delete(`/ip_policies/${policyId}`, { headers: this.headers });
  }

  // ---- IP Policy Rules ----

  async createIpPolicyRule(data: {
    cidr: string;
    ipPolicyId: string;
    action: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, any> = {
      cidr: data.cidr,
      ip_policy_id: data.ipPolicyId,
      action: data.action
    };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/ip_policy_rules', body, { headers: this.headers });
    return res.data;
  }

  async listIpPolicyRules(params?: PaginationParams) {
    let res = await this.axios.get('/ip_policy_rules', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getIpPolicyRule(ruleId: string) {
    let res = await this.axios.get(`/ip_policy_rules/${ruleId}`, { headers: this.headers });
    return res.data;
  }

  async updateIpPolicyRule(
    ruleId: string,
    data: {
      cidr?: string;
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.cidr !== undefined) body.cidr = data.cidr;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/ip_policy_rules/${ruleId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteIpPolicyRule(ruleId: string) {
    await this.axios.delete(`/ip_policy_rules/${ruleId}`, { headers: this.headers });
  }

  // ---- TLS Certificates ----

  async createTlsCertificate(data: {
    certificatePem: string;
    privateKeyPem: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, any> = {
      certificate_pem: data.certificatePem,
      private_key_pem: data.privateKeyPem
    };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/tls_certificates', body, { headers: this.headers });
    return res.data;
  }

  async listTlsCertificates(params?: PaginationParams) {
    let res = await this.axios.get('/tls_certificates', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getTlsCertificate(certId: string) {
    let res = await this.axios.get(`/tls_certificates/${certId}`, { headers: this.headers });
    return res.data;
  }

  async updateTlsCertificate(
    certId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/tls_certificates/${certId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteTlsCertificate(certId: string) {
    await this.axios.delete(`/tls_certificates/${certId}`, { headers: this.headers });
  }

  // ---- Certificate Authorities ----

  async createCertificateAuthority(data: {
    caPem: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, any> = { ca_pem: data.caPem };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/certificate_authorities', body, {
      headers: this.headers
    });
    return res.data;
  }

  async listCertificateAuthorities(params?: PaginationParams) {
    let res = await this.axios.get('/certificate_authorities', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getCertificateAuthority(caId: string) {
    let res = await this.axios.get(`/certificate_authorities/${caId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateCertificateAuthority(
    caId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/certificate_authorities/${caId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteCertificateAuthority(caId: string) {
    await this.axios.delete(`/certificate_authorities/${caId}`, { headers: this.headers });
  }

  // ---- Event Subscriptions ----

  async createEventSubscription(data: {
    description?: string;
    metadata?: string;
    sources: { type: string }[];
    destinationIds: string[];
  }) {
    let body: Record<string, any> = {
      sources: data.sources,
      destination_ids: data.destinationIds
    };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/event_subscriptions', body, { headers: this.headers });
    return res.data;
  }

  async listEventSubscriptions(params?: PaginationParams) {
    let res = await this.axios.get('/event_subscriptions', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getEventSubscription(subscriptionId: string) {
    let res = await this.axios.get(`/event_subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateEventSubscription(
    subscriptionId: string,
    data: {
      description?: string;
      metadata?: string;
      sources?: { type: string }[];
      destinationIds?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.sources !== undefined) body.sources = data.sources;
    if (data.destinationIds !== undefined) body.destination_ids = data.destinationIds;
    let res = await this.axios.patch(`/event_subscriptions/${subscriptionId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteEventSubscription(subscriptionId: string) {
    await this.axios.delete(`/event_subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
  }

  // ---- Event Destinations ----

  async createEventDestination(data: {
    description?: string;
    metadata?: string;
    format?: string;
    target: Record<string, any>;
  }) {
    let body: Record<string, any> = { target: data.target };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.format) body.format = data.format;
    let res = await this.axios.post('/event_destinations', body, { headers: this.headers });
    return res.data;
  }

  async listEventDestinations(params?: PaginationParams) {
    let res = await this.axios.get('/event_destinations', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getEventDestination(destinationId: string) {
    let res = await this.axios.get(`/event_destinations/${destinationId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateEventDestination(
    destinationId: string,
    data: {
      description?: string;
      metadata?: string;
      format?: string;
      target?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.format !== undefined) body.format = data.format;
    if (data.target !== undefined) body.target = data.target;
    let res = await this.axios.patch(`/event_destinations/${destinationId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteEventDestination(destinationId: string) {
    await this.axios.delete(`/event_destinations/${destinationId}`, { headers: this.headers });
  }

  // ---- Bot Users ----

  async createBotUser(data: { name: string; active?: boolean }) {
    let body: Record<string, any> = { name: data.name };
    if (data.active !== undefined) body.active = data.active;
    let res = await this.axios.post('/bot_users', body, { headers: this.headers });
    return res.data;
  }

  async listBotUsers(params?: PaginationParams) {
    let res = await this.axios.get('/bot_users', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getBotUser(botUserId: string) {
    let res = await this.axios.get(`/bot_users/${botUserId}`, { headers: this.headers });
    return res.data;
  }

  async updateBotUser(
    botUserId: string,
    data: {
      name?: string;
      active?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.active !== undefined) body.active = data.active;
    let res = await this.axios.patch(`/bot_users/${botUserId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteBotUser(botUserId: string) {
    await this.axios.delete(`/bot_users/${botUserId}`, { headers: this.headers });
  }

  // ---- SSH Credentials ----

  async createSshCredential(data: {
    publicKey: string;
    description?: string;
    metadata?: string;
    acl?: string[];
    ownerId?: string;
  }) {
    let body: Record<string, any> = { public_key: data.publicKey };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.acl) body.acl = data.acl;
    if (data.ownerId) body.owner_id = data.ownerId;
    let res = await this.axios.post('/ssh_credentials', body, { headers: this.headers });
    return res.data;
  }

  async listSshCredentials(params?: PaginationParams) {
    let res = await this.axios.get('/ssh_credentials', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getSshCredential(credentialId: string) {
    let res = await this.axios.get(`/ssh_credentials/${credentialId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateSshCredential(
    credentialId: string,
    data: {
      description?: string;
      metadata?: string;
      acl?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.acl !== undefined) body.acl = data.acl;
    let res = await this.axios.patch(`/ssh_credentials/${credentialId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteSshCredential(credentialId: string) {
    await this.axios.delete(`/ssh_credentials/${credentialId}`, { headers: this.headers });
  }

  // ---- SSH Certificate Authorities ----

  async createSshCertificateAuthority(data: {
    description?: string;
    metadata?: string;
    privateKeyType?: string;
    ellipticCurve?: string;
    keySize?: number;
  }) {
    let body: Record<string, any> = {};
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.privateKeyType) body.private_key_type = data.privateKeyType;
    if (data.ellipticCurve) body.elliptic_curve = data.ellipticCurve;
    if (data.keySize) body.key_size = data.keySize;
    let res = await this.axios.post('/ssh_certificate_authorities', body, {
      headers: this.headers
    });
    return res.data;
  }

  async listSshCertificateAuthorities(params?: PaginationParams) {
    let res = await this.axios.get('/ssh_certificate_authorities', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getSshCertificateAuthority(caId: string) {
    let res = await this.axios.get(`/ssh_certificate_authorities/${caId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateSshCertificateAuthority(
    caId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/ssh_certificate_authorities/${caId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteSshCertificateAuthority(caId: string) {
    await this.axios.delete(`/ssh_certificate_authorities/${caId}`, { headers: this.headers });
  }

  // ---- SSH Host Certificates ----

  async createSshHostCertificate(data: {
    sshCertificateAuthorityId: string;
    publicKey: string;
    principals?: string[];
    validAfter?: string;
    validUntil?: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, any> = {
      ssh_certificate_authority_id: data.sshCertificateAuthorityId,
      public_key: data.publicKey
    };
    if (data.principals) body.principals = data.principals;
    if (data.validAfter) body.valid_after = data.validAfter;
    if (data.validUntil) body.valid_until = data.validUntil;
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/ssh_host_certificates', body, { headers: this.headers });
    return res.data;
  }

  async listSshHostCertificates(params?: PaginationParams) {
    let res = await this.axios.get('/ssh_host_certificates', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getSshHostCertificate(certId: string) {
    let res = await this.axios.get(`/ssh_host_certificates/${certId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateSshHostCertificate(
    certId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/ssh_host_certificates/${certId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteSshHostCertificate(certId: string) {
    await this.axios.delete(`/ssh_host_certificates/${certId}`, { headers: this.headers });
  }

  // ---- SSH User Certificates ----

  async createSshUserCertificate(data: {
    sshCertificateAuthorityId: string;
    publicKey: string;
    principals?: string[];
    criticalOptions?: Record<string, string>;
    extensions?: Record<string, string>;
    validAfter?: string;
    validUntil?: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, any> = {
      ssh_certificate_authority_id: data.sshCertificateAuthorityId,
      public_key: data.publicKey
    };
    if (data.principals) body.principals = data.principals;
    if (data.criticalOptions) body.critical_options = data.criticalOptions;
    if (data.extensions) body.extensions = data.extensions;
    if (data.validAfter) body.valid_after = data.validAfter;
    if (data.validUntil) body.valid_until = data.validUntil;
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/ssh_user_certificates', body, { headers: this.headers });
    return res.data;
  }

  async listSshUserCertificates(params?: PaginationParams) {
    let res = await this.axios.get('/ssh_user_certificates', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getSshUserCertificate(certId: string) {
    let res = await this.axios.get(`/ssh_user_certificates/${certId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async updateSshUserCertificate(
    certId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/ssh_user_certificates/${certId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteSshUserCertificate(certId: string) {
    await this.axios.delete(`/ssh_user_certificates/${certId}`, { headers: this.headers });
  }

  // ---- IP Restrictions ----

  async createIpRestriction(data: {
    type: string;
    ipPolicyIds: string[];
    description?: string;
    metadata?: string;
    enforced?: boolean;
  }) {
    let body: Record<string, any> = {
      type: data.type,
      ip_policy_ids: data.ipPolicyIds
    };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.enforced !== undefined) body.enforced = data.enforced;
    let res = await this.axios.post('/ip_restrictions', body, { headers: this.headers });
    return res.data;
  }

  async listIpRestrictions(params?: PaginationParams) {
    let res = await this.axios.get('/ip_restrictions', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getIpRestriction(restrictionId: string) {
    let res = await this.axios.get(`/ip_restrictions/${restrictionId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteIpRestriction(restrictionId: string) {
    await this.axios.delete(`/ip_restrictions/${restrictionId}`, { headers: this.headers });
  }

  // ---- Secrets ----

  async createSecret(data: {
    name: string;
    value: string;
    description?: string;
    metadata?: string;
    vaultId?: string;
  }) {
    let body: Record<string, any> = {
      name: data.name,
      value: data.value
    };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    if (data.vaultId) body.vault_id = data.vaultId;
    let res = await this.axios.post('/vault_secrets', body, { headers: this.headers });
    return res.data;
  }

  async listSecrets(params?: PaginationParams) {
    let res = await this.axios.get('/vault_secrets', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getSecret(secretId: string) {
    let res = await this.axios.get(`/vault_secrets/${secretId}`, { headers: this.headers });
    return res.data;
  }

  async updateSecret(
    secretId: string,
    data: {
      name?: string;
      value?: string;
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.value !== undefined) body.value = data.value;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/vault_secrets/${secretId}`, body, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteSecret(secretId: string) {
    await this.axios.delete(`/vault_secrets/${secretId}`, { headers: this.headers });
  }

  // ---- Vaults ----

  async createVault(data: { name: string; description?: string; metadata?: string }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description) body.description = data.description;
    if (data.metadata) body.metadata = data.metadata;
    let res = await this.axios.post('/vaults', body, { headers: this.headers });
    return res.data;
  }

  async listVaults(params?: PaginationParams) {
    let res = await this.axios.get('/vaults', {
      headers: this.headers,
      params: this.paginationQuery(params)
    });
    return res.data;
  }

  async getVault(vaultId: string) {
    let res = await this.axios.get(`/vaults/${vaultId}`, { headers: this.headers });
    return res.data;
  }

  async updateVault(
    vaultId: string,
    data: {
      name?: string;
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.patch(`/vaults/${vaultId}`, body, { headers: this.headers });
    return res.data;
  }

  async deleteVault(vaultId: string) {
    await this.axios.delete(`/vaults/${vaultId}`, { headers: this.headers });
  }
}
