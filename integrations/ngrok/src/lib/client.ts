import { createApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import type { z } from 'zod';
import { eventTargetSecrets } from './event-target';
import type {
  APIKey,
  APIKeyList,
  BotUser,
  CertificateAuthority,
  CertificateAuthorityList,
  Credential,
  CredentialList,
  Endpoint,
  EndpointList,
  EventDestination,
  EventDestinationList,
  EventSubscription,
  EventSubscriptionList,
  IPPolicy,
  IPPolicyList,
  IPPolicyRule,
  IPPolicyRuleList,
  ReservedAddr,
  ReservedAddrList,
  ReservedDomain,
  ReservedDomainList,
  Secret,
  SecretList,
  ServiceUserList,
  SSHCertificateAuthority,
  SSHCertificateAuthorityList,
  SSHCredential,
  SSHCredentialList,
  TLSCertificate,
  TLSCertificateList,
  Tunnel,
  TunnelList,
  TunnelSession,
  TunnelSessionList,
  Vault,
  VaultList
} from './models';
import {
  apiKeyListSchema,
  apiKeySchema,
  botUserSchema,
  certificateAuthorityListSchema,
  certificateAuthoritySchema,
  credentialListSchema,
  credentialSchema,
  endpointListSchema,
  endpointSchema,
  eventDestinationListSchema,
  eventDestinationSchema,
  eventSubscriptionListSchema,
  eventSubscriptionSchema,
  ipPolicyListSchema,
  ipPolicyRuleListSchema,
  ipPolicyRuleSchema,
  ipPolicySchema,
  reservedAddrListSchema,
  reservedAddrSchema,
  reservedDomainListSchema,
  reservedDomainSchema,
  secretListSchema,
  secretSchema,
  serviceUserListSchema,
  sshCertificateAuthorityListSchema,
  sshCertificateAuthoritySchema,
  sshCredentialListSchema,
  sshCredentialSchema,
  tlsCertificateListSchema,
  tlsCertificateSchema,
  tunnelListSchema,
  tunnelSchema,
  tunnelSessionListSchema,
  tunnelSessionSchema,
  vaultListSchema,
  vaultSchema
} from './models';
import {
  ngrokError,
  paginationQuery,
  pathId,
  requireUpdate,
  validateDomainCertificate,
  validateEventTarget
} from './validation';

export interface PaginationParams {
  beforeId?: string;
  limit?: number;
  nextPageUri?: string;
  filter?: string;
}

export interface Ref {
  id: string;
  uri: string;
}

export class NgrokClient {
  private axios;
  private readonly secrets: string[];

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('An ngrok API key is required.');
    this.secrets = [token.trim()];
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.ngrok.com',
      authHeader: { value: `Bearer ${token.trim()}` },
      headers: { 'Ngrok-Version': '2', Accept: 'application/json' },
      errorMapping: {
        extractResponseData: response =>
          isApiErrorRecord(response.data)
            ? { ...response.data, message: response.data.msg }
            : response.data
      },
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error => ngrokError(error, this.secrets)
    });
  }

  private parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
    const result = schema.safeParse(value);
    if (!result.success)
      throw createApiServiceError('ngrok returned an invalid API response.');
    return result.data;
  }

  private protectSecrets(...values: (string | null | undefined)[]) {
    for (const value of values) if (value) this.secrets.push(value);
  }

  // ---- Reserved Domains ----

  async createDomain(data: {
    domain: string;
    description?: string;
    metadata?: string;
    certificateId?: string;
    certificateManagementPolicy?: { authority: string; privateKeyType?: string };
  }) {
    validateDomainCertificate(data);
    let body: Record<string, unknown> = { domain: data.domain };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.certificateId !== undefined) body.certificate_id = data.certificateId;
    if (data.certificateManagementPolicy !== undefined) {
      body.certificate_management_policy = {
        authority: data.certificateManagementPolicy.authority,
        private_key_type: data.certificateManagementPolicy.privateKeyType
      };
    }
    let res = await this.axios.post<ReservedDomain>('/reserved_domains', body);
    return this.parse(reservedDomainSchema, res.data);
  }

  async listDomains(params?: PaginationParams) {
    let res = await this.axios.get<ReservedDomainList>('/reserved_domains', {
      params: paginationQuery('/reserved_domains', params)
    });
    return this.parse(reservedDomainListSchema, res.data);
  }

  async getDomain(domainId: string) {
    let res = await this.axios.get<ReservedDomain>(`/reserved_domains/${pathId(domainId)}`);
    return this.parse(reservedDomainSchema, res.data);
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
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.certificateId !== undefined) body.certificate_id = data.certificateId;
    validateDomainCertificate(data);
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
    requireUpdate(body);
    let res = await this.axios.patch<ReservedDomain>(
      `/reserved_domains/${pathId(domainId)}`,
      body
    );
    return this.parse(reservedDomainSchema, res.data);
  }

  async deleteDomain(domainId: string) {
    await this.axios.delete(`/reserved_domains/${pathId(domainId)}`);
  }

  // ---- Reserved Addresses ----

  async createAddress(data: { description?: string; metadata?: string; region?: string }) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.region !== undefined) body.region = data.region;
    let res = await this.axios.post<ReservedAddr>('/reserved_addrs', body);
    return this.parse(reservedAddrSchema, res.data);
  }

  async listAddresses(params?: PaginationParams) {
    let res = await this.axios.get<ReservedAddrList>('/reserved_addrs', {
      params: paginationQuery('/reserved_addrs', params)
    });
    return this.parse(reservedAddrListSchema, res.data);
  }

  async getAddress(addressId: string) {
    let res = await this.axios.get<ReservedAddr>(`/reserved_addrs/${pathId(addressId)}`);
    return this.parse(reservedAddrSchema, res.data);
  }

  async updateAddress(
    addressId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    requireUpdate(body);
    let res = await this.axios.patch<ReservedAddr>(
      `/reserved_addrs/${pathId(addressId)}`,
      body
    );
    return this.parse(reservedAddrSchema, res.data);
  }

  async deleteAddress(addressId: string) {
    await this.axios.delete(`/reserved_addrs/${pathId(addressId)}`);
  }

  // ---- Endpoints ----

  async createEndpoint(data: {
    url: string;
    type?: string;
    trafficPolicy?: string;
    description?: string;
    metadata?: string;
    bindings?: string[];
    poolingEnabled?: boolean;
  }) {
    if (data.trafficPolicy === undefined)
      throw createApiServiceError(
        'Provide trafficPolicy when creating a cloud endpoint; ngrok requires this field.'
      );
    let body: Record<string, unknown> = {
      url: data.url,
      type: data.type ?? 'cloud',
      traffic_policy: data.trafficPolicy
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.bindings !== undefined) body.bindings = data.bindings;
    if (data.poolingEnabled !== undefined) body.pooling_enabled = data.poolingEnabled;
    let res = await this.axios.post<Endpoint>('/endpoints', body);
    return this.parse(endpointSchema, res.data);
  }

  async listEndpoints(params?: PaginationParams) {
    let res = await this.axios.get<EndpointList>('/endpoints', {
      params: paginationQuery('/endpoints', params)
    });
    return this.parse(endpointListSchema, res.data);
  }

  async getEndpoint(endpointId: string) {
    let res = await this.axios.get<Endpoint>(`/endpoints/${pathId(endpointId)}`);
    return this.parse(endpointSchema, res.data);
  }

  async updateEndpoint(
    endpointId: string,
    data: {
      url?: string;
      trafficPolicy?: string;
      description?: string;
      metadata?: string;
      bindings?: string[];
      poolingEnabled?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.url !== undefined) body.url = data.url;
    if (data.trafficPolicy !== undefined) body.traffic_policy = data.trafficPolicy;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.bindings !== undefined) body.bindings = data.bindings;
    if (data.poolingEnabled !== undefined) body.pooling_enabled = data.poolingEnabled;
    requireUpdate(body);
    let res = await this.axios.patch<Endpoint>(`/endpoints/${pathId(endpointId)}`, body);
    return this.parse(endpointSchema, res.data);
  }

  async deleteEndpoint(endpointId: string) {
    await this.axios.delete(`/endpoints/${pathId(endpointId)}`);
  }

  // ---- Tunnels ----

  async listTunnels(params?: PaginationParams) {
    let res = await this.axios.get<TunnelList>('/tunnels', {
      params: paginationQuery('/tunnels', params)
    });
    return this.parse(tunnelListSchema, res.data);
  }

  async getTunnel(tunnelId: string) {
    let res = await this.axios.get<Tunnel>(`/tunnels/${pathId(tunnelId)}`);
    return this.parse(tunnelSchema, res.data);
  }

  // ---- Tunnel Sessions ----

  async listTunnelSessions(params?: PaginationParams) {
    let res = await this.axios.get<TunnelSessionList>('/tunnel_sessions', {
      params: paginationQuery('/tunnel_sessions', params)
    });
    return this.parse(tunnelSessionListSchema, res.data);
  }

  async getTunnelSession(sessionId: string) {
    let res = await this.axios.get<TunnelSession>(`/tunnel_sessions/${pathId(sessionId)}`);
    return this.parse(tunnelSessionSchema, res.data);
  }

  async restartTunnelSession(sessionId: string) {
    await this.axios.post(`/tunnel_sessions/${pathId(sessionId)}/restart`, {}, {});
  }

  async stopTunnelSession(sessionId: string) {
    await this.axios.post(`/tunnel_sessions/${pathId(sessionId)}/stop`, {});
  }

  // ---- API Keys ----

  async createApiKey(data: { description?: string; metadata?: string; ownerId?: string }) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.ownerId !== undefined) body.owner_id = data.ownerId;
    let res = await this.axios.post<APIKey>('/api_keys', body);
    return this.parse(apiKeySchema, res.data);
  }

  async listApiKeys(params?: PaginationParams) {
    let res = await this.axios.get<APIKeyList>('/api_keys', {
      params: paginationQuery('/api_keys', params)
    });
    return this.parse(apiKeyListSchema, res.data);
  }

  async getApiKey(keyId: string) {
    let res = await this.axios.get<APIKey>(`/api_keys/${pathId(keyId)}`);
    return this.parse(apiKeySchema, res.data);
  }

  async updateApiKey(
    keyId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    requireUpdate(body);
    let res = await this.axios.patch<APIKey>(`/api_keys/${pathId(keyId)}`, body);
    return this.parse(apiKeySchema, res.data);
  }

  async deleteApiKey(keyId: string) {
    await this.axios.delete(`/api_keys/${pathId(keyId)}`);
  }

  // ---- Credentials (Authtokens) ----

  async createCredential(data: {
    description?: string;
    metadata?: string;
    acl?: string[];
    ownerId?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.acl !== undefined) body.acl = data.acl;
    if (data.ownerId !== undefined) body.owner_id = data.ownerId;
    let res = await this.axios.post<Credential>('/credentials', body);
    return this.parse(credentialSchema, res.data);
  }

  async listCredentials(params?: PaginationParams) {
    let res = await this.axios.get<CredentialList>('/credentials', {
      params: paginationQuery('/credentials', params)
    });
    return this.parse(credentialListSchema, res.data);
  }

  async getCredential(credentialId: string) {
    let res = await this.axios.get<Credential>(`/credentials/${pathId(credentialId)}`);
    return this.parse(credentialSchema, res.data);
  }

  async updateCredential(
    credentialId: string,
    data: {
      description?: string;
      metadata?: string;
      acl?: string[];
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.acl !== undefined) body.acl = data.acl;
    requireUpdate(body);
    let res = await this.axios.patch<Credential>(`/credentials/${pathId(credentialId)}`, body);
    return this.parse(credentialSchema, res.data);
  }

  async deleteCredential(credentialId: string) {
    await this.axios.delete(`/credentials/${pathId(credentialId)}`);
  }

  // ---- IP Policies ----

  async createIpPolicy(data: { description?: string; metadata?: string }) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.post<IPPolicy>('/ip_policies', body);
    return this.parse(ipPolicySchema, res.data);
  }

  async listIpPolicies(params?: PaginationParams) {
    let res = await this.axios.get<IPPolicyList>('/ip_policies', {
      params: paginationQuery('/ip_policies', params)
    });
    return this.parse(ipPolicyListSchema, res.data);
  }

  async getIpPolicy(policyId: string) {
    let res = await this.axios.get<IPPolicy>(`/ip_policies/${pathId(policyId)}`);
    return this.parse(ipPolicySchema, res.data);
  }

  async updateIpPolicy(
    policyId: string,
    data: {
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    requireUpdate(body);
    let res = await this.axios.patch<IPPolicy>(`/ip_policies/${pathId(policyId)}`, body);
    return this.parse(ipPolicySchema, res.data);
  }

  async deleteIpPolicy(policyId: string) {
    await this.axios.delete(`/ip_policies/${pathId(policyId)}`);
  }

  // ---- IP Policy Rules ----

  async createIpPolicyRule(data: {
    cidr: string;
    ipPolicyId: string;
    action: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, unknown> = {
      cidr: data.cidr,
      ip_policy_id: data.ipPolicyId,
      action: data.action
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.post<IPPolicyRule>('/ip_policy_rules', body);
    return this.parse(ipPolicyRuleSchema, res.data);
  }

  async listIpPolicyRules(params?: PaginationParams) {
    let res = await this.axios.get<IPPolicyRuleList>('/ip_policy_rules', {
      params: paginationQuery('/ip_policy_rules', params)
    });
    return this.parse(ipPolicyRuleListSchema, res.data);
  }

  async getIpPolicyRule(ruleId: string) {
    let res = await this.axios.get<IPPolicyRule>(`/ip_policy_rules/${pathId(ruleId)}`);
    return this.parse(ipPolicyRuleSchema, res.data);
  }

  async deleteIpPolicyRule(ruleId: string) {
    await this.axios.delete(`/ip_policy_rules/${pathId(ruleId)}`);
  }

  // ---- TLS Certificates ----

  async createTlsCertificate(data: {
    certificatePem: string;
    privateKeyPem: string;
    description?: string;
    metadata?: string;
  }) {
    this.protectSecrets(
      data.privateKeyPem,
      ...data.privateKeyPem.split(/\r?\n/).filter(line => !line.startsWith('-----'))
    );
    let body: Record<string, unknown> = {
      certificate_pem: data.certificatePem,
      private_key_pem: data.privateKeyPem
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.post<TLSCertificate>('/tls_certificates', body);
    return this.parse(tlsCertificateSchema, res.data);
  }

  async listTlsCertificates(params?: PaginationParams) {
    let res = await this.axios.get<TLSCertificateList>('/tls_certificates', {
      params: paginationQuery('/tls_certificates', params)
    });
    return this.parse(tlsCertificateListSchema, res.data);
  }

  async getTlsCertificate(certId: string) {
    let res = await this.axios.get<TLSCertificate>(`/tls_certificates/${pathId(certId)}`);
    return this.parse(tlsCertificateSchema, res.data);
  }

  async deleteTlsCertificate(certId: string) {
    await this.axios.delete(`/tls_certificates/${pathId(certId)}`);
  }

  // ---- Certificate Authorities ----

  async createCertificateAuthority(data: {
    caPem: string;
    description?: string;
    metadata?: string;
  }) {
    let body: Record<string, unknown> = { ca_pem: data.caPem };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.post<CertificateAuthority>('/certificate_authorities', body);
    return this.parse(certificateAuthoritySchema, res.data);
  }

  async listCertificateAuthorities(params?: PaginationParams) {
    let res = await this.axios.get<CertificateAuthorityList>('/certificate_authorities', {
      params: paginationQuery('/certificate_authorities', params)
    });
    return this.parse(certificateAuthorityListSchema, res.data);
  }

  async getCertificateAuthority(caId: string) {
    let res = await this.axios.get<CertificateAuthority>(
      `/certificate_authorities/${pathId(caId)}`
    );
    return this.parse(certificateAuthoritySchema, res.data);
  }

  async deleteCertificateAuthority(caId: string) {
    await this.axios.delete(`/certificate_authorities/${pathId(caId)}`);
  }

  // ---- Event Subscriptions ----

  async createEventSubscription(data: {
    description?: string;
    metadata?: string;
    sources: { type: string }[];
    destinationIds: string[];
  }) {
    let body: Record<string, unknown> = {
      sources: data.sources,
      destination_ids: data.destinationIds
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.post<EventSubscription>('/event_subscriptions', body);
    return this.parse(eventSubscriptionSchema, res.data);
  }

  async listEventSubscriptions(params?: PaginationParams) {
    let res = await this.axios.get<EventSubscriptionList>('/event_subscriptions', {
      params: paginationQuery('/event_subscriptions', params)
    });
    return this.parse(eventSubscriptionListSchema, res.data);
  }

  async getEventSubscription(subscriptionId: string) {
    let res = await this.axios.get<EventSubscription>(
      `/event_subscriptions/${pathId(subscriptionId)}`
    );
    return this.parse(eventSubscriptionSchema, res.data);
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
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.sources !== undefined) body.sources = data.sources;
    if (data.destinationIds !== undefined) body.destination_ids = data.destinationIds;
    requireUpdate(body);
    let res = await this.axios.patch<EventSubscription>(
      `/event_subscriptions/${pathId(subscriptionId)}`,
      body
    );
    return this.parse(eventSubscriptionSchema, res.data);
  }

  async deleteEventSubscription(subscriptionId: string) {
    await this.axios.delete(`/event_subscriptions/${pathId(subscriptionId)}`);
  }

  // ---- Event Destinations ----

  async createEventDestination(data: {
    description?: string;
    metadata?: string;
    format?: string;
    target: unknown;
  }) {
    const target = validateEventTarget(data.target);
    this.protectSecrets(...eventTargetSecrets(target));
    let body: Record<string, unknown> = { target: data.target };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.format !== undefined && data.format.toUpperCase() !== 'JSON')
      throw createApiServiceError('Event destinations support only JSON format.');
    if (data.format !== undefined) body.format = data.format.toUpperCase();
    let res = await this.axios.post<EventDestination>('/event_destinations', body);
    return this.parse(eventDestinationSchema, res.data);
  }

  async listEventDestinations(params?: PaginationParams) {
    let res = await this.axios.get<EventDestinationList>('/event_destinations', {
      params: paginationQuery('/event_destinations', params)
    });
    return this.parse(eventDestinationListSchema, res.data);
  }

  async getEventDestination(destinationId: string) {
    let res = await this.axios.get<EventDestination>(
      `/event_destinations/${pathId(destinationId)}`
    );
    return this.parse(eventDestinationSchema, res.data);
  }

  async deleteEventDestination(destinationId: string) {
    await this.axios.delete(`/event_destinations/${pathId(destinationId)}`);
  }

  // ---- Bot Users ----

  async createBotUser(data: { name: string; active?: boolean }) {
    let body: Record<string, unknown> = { name: data.name };
    if (data.active !== undefined) body.active = data.active;
    let res = await this.axios.post<BotUser>('/service_users', body);
    return this.parse(botUserSchema, res.data);
  }

  async listBotUsers(params?: PaginationParams) {
    let res = await this.axios.get<ServiceUserList>('/service_users', {
      params: paginationQuery('/service_users', params)
    });
    const result = this.parse(serviceUserListSchema, res.data);
    return {
      bot_users: result.service_users,
      uri: result.uri,
      next_page_uri: result.next_page_uri
    };
  }

  async getBotUser(botUserId: string) {
    let res = await this.axios.get<BotUser>(`/service_users/${pathId(botUserId)}`);
    return this.parse(botUserSchema, res.data);
  }

  async updateBotUser(
    botUserId: string,
    data: {
      name?: string;
      active?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.active !== undefined) body.active = data.active;
    requireUpdate(body);
    let res = await this.axios.patch<BotUser>(`/service_users/${pathId(botUserId)}`, body);
    return this.parse(botUserSchema, res.data);
  }

  async deleteBotUser(botUserId: string) {
    await this.axios.delete(`/service_users/${pathId(botUserId)}`);
  }

  // ---- SSH Credentials ----

  async createSshCredential(data: {
    publicKey: string;
    description?: string;
    metadata?: string;
    acl?: string[];
    ownerId?: string;
  }) {
    let body: Record<string, unknown> = { public_key: data.publicKey };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.acl !== undefined) body.acl = data.acl;
    if (data.ownerId !== undefined) body.owner_id = data.ownerId;
    let res = await this.axios.post<SSHCredential>('/ssh_credentials', body);
    return this.parse(sshCredentialSchema, res.data);
  }

  async listSshCredentials(params?: PaginationParams) {
    let res = await this.axios.get<SSHCredentialList>('/ssh_credentials', {
      params: paginationQuery('/ssh_credentials', params)
    });
    return this.parse(sshCredentialListSchema, res.data);
  }

  async getSshCredential(credentialId: string) {
    let res = await this.axios.get<SSHCredential>(`/ssh_credentials/${pathId(credentialId)}`);
    return this.parse(sshCredentialSchema, res.data);
  }

  async deleteSshCredential(credentialId: string) {
    await this.axios.delete(`/ssh_credentials/${pathId(credentialId)}`);
  }

  // ---- SSH Certificate Authorities ----

  async createSshCertificateAuthority(data: {
    description?: string;
    metadata?: string;
    privateKeyType?: string;
    ellipticCurve?: string;
    keySize?: number;
  }) {
    let body: Record<string, unknown> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.privateKeyType !== undefined) body.private_key_type = data.privateKeyType;
    if (data.ellipticCurve !== undefined) body.elliptic_curve = data.ellipticCurve;
    if (data.keySize !== undefined) body.key_size = data.keySize;
    let res = await this.axios.post<SSHCertificateAuthority>(
      '/ssh_certificate_authorities',
      body
    );
    return this.parse(sshCertificateAuthoritySchema, res.data);
  }

  async listSshCertificateAuthorities(params?: PaginationParams) {
    let res = await this.axios.get<SSHCertificateAuthorityList>(
      '/ssh_certificate_authorities',
      {
        params: paginationQuery('/ssh_certificate_authorities', params)
      }
    );
    return this.parse(sshCertificateAuthorityListSchema, res.data);
  }

  async getSshCertificateAuthority(caId: string) {
    let res = await this.axios.get<SSHCertificateAuthority>(
      `/ssh_certificate_authorities/${pathId(caId)}`
    );
    return this.parse(sshCertificateAuthoritySchema, res.data);
  }

  async deleteSshCertificateAuthority(caId: string) {
    await this.axios.delete(`/ssh_certificate_authorities/${pathId(caId)}`);
  }

  // ---- Secrets ----

  async createSecret(data: {
    name: string;
    value: string;
    description?: string;
    metadata?: string;
    vaultId?: string;
  }) {
    this.protectSecrets(data.value);
    let body: Record<string, unknown> = {
      name: data.name,
      value: data.value
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.vaultId !== undefined) body.vault_id = data.vaultId;
    let res = await this.axios.post<Secret>('/vault_secrets', body);
    return this.parse(secretSchema, res.data);
  }

  async listSecrets(params?: PaginationParams) {
    let res = await this.axios.get<SecretList>('/vault_secrets', {
      params: paginationQuery('/vault_secrets', params)
    });
    return this.parse(secretListSchema, res.data);
  }

  async getSecret(secretId: string) {
    let res = await this.axios.get<Secret>(`/vault_secrets/${pathId(secretId)}`);
    return this.parse(secretSchema, res.data);
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
    this.protectSecrets(data.value);
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.value !== undefined) body.value = data.value;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    requireUpdate(body);
    let res = await this.axios.patch<Secret>(`/vault_secrets/${pathId(secretId)}`, body);
    return this.parse(secretSchema, res.data);
  }

  async deleteSecret(secretId: string) {
    await this.axios.delete(`/vault_secrets/${pathId(secretId)}`);
  }

  // ---- Vaults ----

  async createVault(data: { name: string; description?: string; metadata?: string }) {
    let body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    let res = await this.axios.post<Vault>('/vaults', body);
    return this.parse(vaultSchema, res.data);
  }

  async listVaults(params?: PaginationParams) {
    let res = await this.axios.get<VaultList>('/vaults', {
      params: paginationQuery('/vaults', params)
    });
    return this.parse(vaultListSchema, res.data);
  }

  async getVault(vaultId: string) {
    let res = await this.axios.get<Vault>(`/vaults/${pathId(vaultId)}`);
    return this.parse(vaultSchema, res.data);
  }

  async updateVault(
    vaultId: string,
    data: {
      name?: string;
      description?: string;
      metadata?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    requireUpdate(body);
    let res = await this.axios.patch<Vault>(`/vaults/${pathId(vaultId)}`, body);
    return this.parse(vaultSchema, res.data);
  }

  async deleteVault(vaultId: string) {
    await this.axios.delete(`/vaults/${pathId(vaultId)}`);
  }
}
