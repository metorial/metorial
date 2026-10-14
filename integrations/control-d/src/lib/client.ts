import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import type {
  AnalyticsEndpoint,
  AnalyticsLevel,
  ApiResponse,
  Proxy as ControlDProxy,
  CustomRule,
  DefaultRule,
  Device,
  Filter,
  IpInfo,
  LearnedIp,
  Organization,
  OrgMember,
  Payment,
  Product,
  Profile,
  ProfileOptionDefinition,
  ProfileRestriction,
  RuleFolder,
  Service,
  ServiceCategory,
  SubOrganization,
  Subscription,
  User
} from './types';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; orgId?: string }) {
    let headers: Record<string, string> = {
      Accept: 'application/json'
    };

    if (config.orgId) {
      headers['X-Force-Org-Id'] = config.orgId;
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.controld.com',
      authHeader: { value: `Bearer ${config.token}` },
      contentType: 'application/x-www-form-urlencoded',
      headers,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Control D',
          reason: 'control_d_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      let data = response.data as ApiResponse<unknown>;
      if (data?.success === false || data?.error) {
        throw createApiServiceError(
          `Control D API request failed: ${data.error?.message || data.message || 'Request was unsuccessful'}`,
          {
            reason: 'control_d_api_error',
            upstreamCode: data.error?.code !== undefined ? String(data.error.code) : undefined
          }
        );
      }
      return response;
    });
  }

  // ─── Profiles ───────────────────────────────────────────────

  async listProfiles(): Promise<Profile[]> {
    let res = await this.axios.get<ApiResponse<{ profiles: Profile[] }>>('/profiles');
    return res.data.body.profiles;
  }

  async createProfile(params: { name: string; cloneProfileId?: string }): Promise<Profile> {
    let data = new URLSearchParams();
    data.append('name', params.name);
    if (params.cloneProfileId) {
      data.append('clone_profile_id', params.cloneProfileId);
    }
    let res = await this.axios.post<ApiResponse<{ profiles: Profile[] }>>('/profiles', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    let profile = res.data.body?.profiles?.[0];
    if (!profile)
      throw createApiServiceError('Control D returned no profile for the completed request');
    return profile;
  }

  async modifyProfile(
    profileId: string,
    params: {
      name?: string;
      disableTtl?: number;
      lockStatus?: number;
      lockMessage?: string;
      password?: string;
    }
  ): Promise<Profile> {
    let data = new URLSearchParams();
    if (params.name !== undefined) data.append('name', params.name);
    if (params.disableTtl !== undefined) data.append('disable_ttl', String(params.disableTtl));
    if (params.lockStatus !== undefined) data.append('lock_status', String(params.lockStatus));
    if (params.lockMessage !== undefined) data.append('lock_message', params.lockMessage);
    if (params.password !== undefined) data.append('password', params.password);
    let res = await this.axios.put<ApiResponse<{ profiles: Profile[] }>>(
      `/profiles/${encodeURIComponent(profileId)}`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    let profile = res.data.body?.profiles?.[0];
    if (!profile)
      throw createApiServiceError('Control D returned no profile for the completed request');
    return profile;
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.axios.delete(`/profiles/${encodeURIComponent(profileId)}`);
  }

  async listProfileRestrictions(): Promise<ProfileRestriction[]> {
    let res = await this.axios.get<ApiResponse<{ restrictions: ProfileRestriction[] }>>(
      '/profiles/restrictions'
    );
    return res.data.body.restrictions;
  }

  async listEnabledProfileRestrictions(profileId: string): Promise<string[]> {
    let res = await this.axios.get<ApiResponse<{ restrictions: string[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/restrictions`
    );
    return res.data.body.restrictions;
  }

  async modifyProfileRestriction(
    profileId: string,
    restrictionId: string,
    enabled: boolean
  ): Promise<string[]> {
    let data = new URLSearchParams({ status: enabled ? '1' : '0' });
    let res = await this.axios.put<ApiResponse<{ restrictions: string[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/restrictions/${encodeURIComponent(restrictionId)}`,
      data
    );
    return res.data.body.restrictions;
  }

  // ─── Profile Options ──────────────────────────────────────

  async listProfileOptions(): Promise<ProfileOptionDefinition[]> {
    let res =
      await this.axios.get<ApiResponse<{ options: ProfileOptionDefinition[] }>>(
        '/profiles/options'
      );
    return res.data.body.options;
  }

  async modifyProfileOption(
    profileId: string,
    optionName: string,
    params: {
      status: number;
      value?: string;
    }
  ): Promise<void> {
    let data = new URLSearchParams();
    data.append('status', String(params.status));
    if (params.value !== undefined) data.append('value', params.value);
    await this.axios.put(
      `/profiles/${encodeURIComponent(profileId)}/options/${encodeURIComponent(optionName)}`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
  }

  // ─── Default Rule ─────────────────────────────────────────

  async getDefaultRule(profileId: string): Promise<DefaultRule> {
    let res = await this.axios.get<ApiResponse<{ default: DefaultRule }>>(
      `/profiles/${encodeURIComponent(profileId)}/default`
    );
    return res.data.body.default;
  }

  async modifyDefaultRule(
    profileId: string,
    params: {
      action: number;
      via?: string;
      status: number;
    }
  ): Promise<DefaultRule> {
    let data = new URLSearchParams();
    data.append('do', String(params.action));
    if (params.via !== undefined) data.append('via', params.via);
    data.append('status', String(params.status));
    let res = await this.axios.put<ApiResponse<{ default: DefaultRule }>>(
      `/profiles/${encodeURIComponent(profileId)}/default`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return res.data.body.default;
  }

  // ─── Filters ──────────────────────────────────────────────

  async listFilters(profileId: string): Promise<Filter[]> {
    let res = await this.axios.get<ApiResponse<{ filters: Filter[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/filters`
    );
    return res.data.body.filters;
  }

  async listExternalFilters(profileId: string): Promise<Filter[]> {
    let res = await this.axios.get<ApiResponse<{ filters: Filter[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/filters/external`
    );
    return res.data.body.filters;
  }

  async batchModifyFilters(
    profileId: string,
    filters: Array<{ filter: string; status: number }>
  ): Promise<Record<string, { do: number; status: number }>> {
    let res = await this.axios.put<
      ApiResponse<{ filters: Record<string, { do: number; status: number }> }>
    >(
      `/profiles/${encodeURIComponent(profileId)}/filters`,
      { filters },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return res.data.body.filters;
  }

  // ─── Services ─────────────────────────────────────────────

  async listServiceCategories(): Promise<ServiceCategory[]> {
    let res =
      await this.axios.get<ApiResponse<{ categories: ServiceCategory[] }>>(
        '/services/categories'
      );
    return res.data.body.categories;
  }

  async listServicesInCategory(category: string): Promise<Service[]> {
    let res = await this.axios.get<ApiResponse<{ services: Service[] }>>(
      `/services/categories/${encodeURIComponent(category)}`
    );
    return res.data.body.services;
  }

  async listProfileServices(profileId: string): Promise<Service[]> {
    let res = await this.axios.get<ApiResponse<{ services: Service[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/services`
    );
    return res.data.body.services;
  }

  async modifyProfileService(
    profileId: string,
    serviceId: string,
    params: {
      action: number;
      status: number;
      via?: string;
      viaV6?: string;
    }
  ): Promise<void> {
    let data = new URLSearchParams();
    data.append('do', String(params.action));
    data.append('status', String(params.status));
    if (params.via !== undefined) data.append('via', params.via);
    if (params.viaV6 !== undefined) data.append('via_v6', params.viaV6);
    await this.axios.put(
      `/profiles/${encodeURIComponent(profileId)}/services/${encodeURIComponent(serviceId)}`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
  }

  // ─── Custom Rules ─────────────────────────────────────────

  async listRuleFolders(profileId: string): Promise<RuleFolder[]> {
    let res = await this.axios.get<ApiResponse<{ groups: RuleFolder[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/groups`
    );
    return res.data.body.groups;
  }

  async createRuleFolder(
    profileId: string,
    params: {
      name: string;
      action: number;
      status: number;
      via?: string;
    }
  ): Promise<RuleFolder> {
    let data = new URLSearchParams();
    data.append('name', params.name);
    data.append('do', String(params.action));
    data.append('status', String(params.status));
    if (params.via !== undefined) data.append('via', params.via);
    let res = await this.axios.post<ApiResponse<{ groups: RuleFolder[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/groups`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    let folder = res.data.body?.groups?.[0];
    if (!folder)
      throw createApiServiceError(
        'Control D returned no rule folder for the completed request'
      );
    return folder;
  }

  async modifyRuleFolder(
    profileId: string,
    folderId: string,
    params: {
      name?: string;
      action: number;
      status: number;
      via?: string;
    }
  ): Promise<RuleFolder> {
    let data = new URLSearchParams();
    if (params.name !== undefined) data.append('name', params.name);
    data.append('do', String(params.action));
    data.append('status', String(params.status));
    if (params.via !== undefined) data.append('via', params.via);
    let res = await this.axios.put<ApiResponse<{ groups: RuleFolder[] }>>(
      `/profiles/${encodeURIComponent(profileId)}/groups/${encodeURIComponent(folderId)}`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    let folder = res.data.body?.groups?.[0];
    if (!folder)
      throw createApiServiceError(
        'Control D returned no rule folder for the completed request'
      );
    return folder;
  }

  async deleteRuleFolder(profileId: string, folderId: string): Promise<void> {
    await this.axios.delete(
      `/profiles/${encodeURIComponent(profileId)}/groups/${encodeURIComponent(folderId)}`
    );
  }

  async listCustomRules(profileId: string, folderId?: string): Promise<CustomRule[]> {
    let path = folderId
      ? `/profiles/${encodeURIComponent(profileId)}/rules/${encodeURIComponent(folderId)}`
      : `/profiles/${encodeURIComponent(profileId)}/rules/0`;
    let res = await this.axios.get<ApiResponse<{ rules: CustomRule[] }>>(path);
    return res.data.body.rules;
  }

  async createCustomRule(
    profileId: string,
    params: {
      hostnames: string[];
      action: number;
      status: number;
      via?: string;
      viaV6?: string;
      group?: number;
    }
  ): Promise<void> {
    let data = new URLSearchParams();
    data.append('do', String(params.action));
    data.append('status', String(params.status));
    for (let hostname of params.hostnames) {
      data.append('hostnames[]', hostname);
    }
    if (params.via !== undefined) data.append('via', params.via);
    if (params.viaV6 !== undefined) data.append('via_v6', params.viaV6);
    if (params.group !== undefined) data.append('group', String(params.group));
    await this.axios.post(`/profiles/${encodeURIComponent(profileId)}/rules`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async modifyCustomRule(
    profileId: string,
    params: {
      hostnames: string[];
      action: number;
      status: number;
      via?: string;
      viaV6?: string;
      group?: number;
    }
  ): Promise<void> {
    let data = new URLSearchParams();
    data.append('do', String(params.action));
    data.append('status', String(params.status));
    for (let hostname of params.hostnames) {
      data.append('hostnames[]', hostname);
    }
    if (params.via !== undefined) data.append('via', params.via);
    if (params.viaV6 !== undefined) data.append('via_v6', params.viaV6);
    if (params.group !== undefined) data.append('group', String(params.group));
    await this.axios.put(`/profiles/${encodeURIComponent(profileId)}/rules`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async deleteCustomRule(profileId: string, hostname: string): Promise<void> {
    await this.axios.delete(
      `/profiles/${encodeURIComponent(profileId)}/rules/${encodeURIComponent(hostname)}`
    );
  }

  // ─── Devices ──────────────────────────────────────────────

  async listDevices(filter?: 'users' | 'routers'): Promise<Device[]> {
    let path = '/devices';
    if (filter === 'users') path = '/devices/users';
    if (filter === 'routers') path = '/devices/routers';
    let res = await this.axios.get<ApiResponse<{ devices: Device[] }>>(path);
    return res.data.body.devices;
  }

  async createDevice(params: {
    name: string;
    profileId: string;
    icon: string;
    clientCount?: string;
    profileId2?: string;
    stats?: number;
    legacyIpv4Status?: number;
    learnIp?: number;
    restricted?: number;
    desc?: string;
    ddnsStatus?: number;
    ddnsSubdomain?: string;
    ddnsExtStatus?: number;
    ddnsExtHost?: string;
  }): Promise<Device> {
    let data = new URLSearchParams();
    data.append('name', params.name);
    data.append('profile_id', params.profileId);
    data.append('icon', params.icon);
    data.append('client_count', params.clientCount ?? '1');
    if (params.profileId2 !== undefined) data.append('profile_id2', params.profileId2);
    if (params.stats !== undefined) data.append('stats', String(params.stats));
    if (params.legacyIpv4Status !== undefined)
      data.append('legacy_ipv4_status', String(params.legacyIpv4Status));
    if (params.learnIp !== undefined) data.append('learn_ip', String(params.learnIp));
    if (params.restricted !== undefined) data.append('restricted', String(params.restricted));
    if (params.desc !== undefined) data.append('desc', params.desc);
    if (params.ddnsStatus !== undefined) data.append('ddns_status', String(params.ddnsStatus));
    if (params.ddnsSubdomain !== undefined)
      data.append('ddns_subdomain', params.ddnsSubdomain);
    if (params.ddnsExtStatus !== undefined)
      data.append('ddns_ext_status', String(params.ddnsExtStatus));
    if (params.ddnsExtHost !== undefined) data.append('ddns_ext_host', params.ddnsExtHost);
    let res = await this.axios.post<ApiResponse<Device | { devices: Device[] }>>(
      '/devices',
      data,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    let body = res.data.body;
    let device = body && 'PK' in body ? body : body?.devices?.[0];
    if (!device?.PK)
      throw createApiServiceError('Control D returned no device for the completed request');
    return device;
  }

  async modifyDevice(
    deviceId: string,
    params: {
      name?: string;
      profileId?: string;
      profileId2?: string;
      stats?: number;
      legacyIpv4Status?: number;
      learnIp?: number;
      restricted?: number;
      desc?: string;
      icon?: string;
      status?: number;
      ddnsStatus?: number;
      ddnsSubdomain?: string;
      ddnsExtStatus?: number;
      ddnsExtHost?: string;
      clientCount?: string;
    }
  ): Promise<Device> {
    let data = new URLSearchParams();
    if (params.name !== undefined) data.append('name', params.name);
    if (params.profileId !== undefined) data.append('profile_id', params.profileId);
    if (params.profileId2 !== undefined) data.append('profile_id2', params.profileId2);
    if (params.stats !== undefined) data.append('stats', String(params.stats));
    if (params.legacyIpv4Status !== undefined)
      data.append('legacy_ipv4_status', String(params.legacyIpv4Status));
    if (params.learnIp !== undefined) data.append('learn_ip', String(params.learnIp));
    if (params.restricted !== undefined) data.append('restricted', String(params.restricted));
    if (params.desc !== undefined) data.append('desc', params.desc);
    if (params.icon !== undefined) data.append('icon', params.icon);
    if (params.status !== undefined) data.append('status', String(params.status));
    if (params.ddnsStatus !== undefined) data.append('ddns_status', String(params.ddnsStatus));
    if (params.ddnsSubdomain !== undefined)
      data.append('ddns_subdomain', params.ddnsSubdomain);
    if (params.ddnsExtStatus !== undefined)
      data.append('ddns_ext_status', String(params.ddnsExtStatus));
    if (params.ddnsExtHost !== undefined) data.append('ddns_ext_host', params.ddnsExtHost);
    if (params.clientCount !== undefined) data.append('client_count', params.clientCount);
    let res = await this.axios.put<ApiResponse<Device | { devices: Device[] }>>(
      `/devices/${encodeURIComponent(deviceId)}`,
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    let body = res.data.body;
    let device = body && 'PK' in body ? body : body?.devices?.[0];
    if (!device?.PK)
      throw createApiServiceError('Control D returned no device for the completed request');
    return device;
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.axios.delete(`/devices/${encodeURIComponent(deviceId)}`);
  }

  async listDeviceTypes(): Promise<Record<string, { name: string; icons: string[] }>> {
    let res =
      await this.axios.get<
        ApiResponse<{ types: Record<string, { name: string; icons: string[] }> }>
      >('/devices/types');
    return res.data.body.types;
  }

  // ─── Access / IP Authorization ────────────────────────────

  async listKnownIps(deviceId: string): Promise<LearnedIp[]> {
    let res = await this.axios.get<ApiResponse<{ ips: LearnedIp[] }>>('/access', {
      params: { device_id: deviceId }
    });
    return res.data.body.ips;
  }

  async authorizeIps(deviceId: string, ips: string[]): Promise<void> {
    let data = new URLSearchParams();
    data.append('device_id', deviceId);
    for (let ip of ips) {
      data.append('ips[]', ip);
    }
    await this.axios.post('/access', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async deauthorizeIps(deviceId: string, ips: string[]): Promise<void> {
    let data = new URLSearchParams();
    data.append('device_id', deviceId);
    for (let ip of ips) {
      data.append('ips[]', ip);
    }
    await this.axios.delete('/access', {
      data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ─── Proxies ──────────────────────────────────────────────

  async listProxies(): Promise<ControlDProxy[]> {
    let res = await this.axios.get<ApiResponse<{ proxies: ControlDProxy[] }>>('/proxies');
    return res.data.body.proxies;
  }

  // ─── Organizations ────────────────────────────────────────

  async getOrganization(): Promise<Organization> {
    let res = await this.axios.get<ApiResponse<{ organization: Organization }>>(
      '/organizations/organization'
    );
    return res.data.body.organization;
  }

  async listMembers(): Promise<OrgMember[]> {
    let res = await this.axios.get<ApiResponse<{ members: OrgMember[] }>>(
      '/organizations/members'
    );
    return res.data.body.members;
  }

  async listSubOrganizations(): Promise<SubOrganization[]> {
    let res = await this.axios.get<ApiResponse<{ sub_organizations: SubOrganization[] }>>(
      '/organizations/sub_organizations'
    );
    return res.data.body.sub_organizations;
  }

  async createSubOrganization(params: {
    name: string;
    contactEmail: string;
    twofaReq: number;
    statsEndpoint: string;
    address?: string;
    website?: string;
    contactName?: string;
    contactPhone?: string;
    parentProfile?: string;
  }): Promise<SubOrganization> {
    let data = new URLSearchParams();
    data.append('name', params.name);
    data.append('contact_email', params.contactEmail);
    data.append('twofa_req', String(params.twofaReq));
    data.append('stats_endpoint', params.statsEndpoint);
    if (params.address !== undefined) data.append('address', params.address);
    if (params.website !== undefined) data.append('website', params.website);
    if (params.contactName !== undefined) data.append('contact_name', params.contactName);
    if (params.contactPhone !== undefined) data.append('contact_phone', params.contactPhone);
    if (params.parentProfile !== undefined)
      data.append('parent_profile', params.parentProfile);
    let res = await this.axios.post<ApiResponse<{ sub_organizations: SubOrganization[] }>>(
      '/organizations/suborg',
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    let organization = res.data.body?.sub_organizations?.[0];
    if (!organization)
      throw createApiServiceError(
        'Control D returned no sub-organization for the completed request'
      );
    return organization;
  }

  async modifyOrganization(params: {
    name?: string;
    contactEmail?: string;
    twofaReq?: number;
    statsEndpoint?: string;
    address?: string;
    website?: string;
    contactName?: string;
    contactPhone?: string;
  }): Promise<Organization> {
    let data = new URLSearchParams();
    if (params.name !== undefined) data.append('name', params.name);
    if (params.contactEmail !== undefined) data.append('contact_email', params.contactEmail);
    if (params.twofaReq !== undefined) data.append('twofa_req', String(params.twofaReq));
    if (params.statsEndpoint !== undefined)
      data.append('stats_endpoint', params.statsEndpoint);
    if (params.address !== undefined) data.append('address', params.address);
    if (params.website !== undefined) data.append('website', params.website);
    if (params.contactName !== undefined) data.append('contact_name', params.contactName);
    if (params.contactPhone !== undefined) data.append('contact_phone', params.contactPhone);
    let res = await this.axios.put<ApiResponse<{ organization: Organization }>>(
      '/organizations',
      data,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return res.data.body.organization;
  }

  // ─── Account ──────────────────────────────────────────────

  async getUser(): Promise<User> {
    let res = await this.axios.get<ApiResponse<User>>('/users');
    return res.data.body;
  }

  // ─── Billing ──────────────────────────────────────────────

  async listPayments(): Promise<Payment[]> {
    let res = await this.axios.get<ApiResponse<{ payments: Payment[] }>>('/billing/payments');
    return res.data.body.payments;
  }

  async listSubscriptions(): Promise<Subscription[]> {
    let res = await this.axios.get<ApiResponse<{ subscriptions: Subscription[] }>>(
      '/billing/subscriptions'
    );
    return res.data.body.subscriptions;
  }

  async listProducts(): Promise<Product[]> {
    let res = await this.axios.get<ApiResponse<{ products: Product[] }>>('/billing/products');
    return res.data.body.products;
  }

  // ─── Analytics ────────────────────────────────────────────

  async listAnalyticsLevels(): Promise<AnalyticsLevel[]> {
    let res =
      await this.axios.get<ApiResponse<{ levels: AnalyticsLevel[] }>>('/analytics/levels');
    return res.data.body.levels;
  }

  async listAnalyticsEndpoints(): Promise<AnalyticsEndpoint[]> {
    let res =
      await this.axios.get<ApiResponse<{ endpoints: AnalyticsEndpoint[] }>>(
        '/analytics/endpoints'
      );
    return res.data.body.endpoints;
  }

  // ─── Network / IP ─────────────────────────────────────────

  async getCurrentIp(): Promise<IpInfo> {
    let res = await this.axios.get<ApiResponse<IpInfo>>('/ip');
    return res.data.body;
  }
}
