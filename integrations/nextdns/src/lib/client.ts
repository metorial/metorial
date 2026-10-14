import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export class NextDnsClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('Connect a NextDNS account with an API key.', {
        reason: 'nextdns_api_key_required'
      });
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.nextdns.io',
      authHeader: { name: 'X-Api-Key', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'NextDNS',
          reason: 'nextdns_api_error',
          extractResponse: (failure, helpers) => {
            let response = helpers.getResponse(failure);
            if (
              helpers.isRecord(failure) &&
              failure.name === 'SlateError' &&
              helpers.isRecord(failure.data) &&
              helpers.isRecord(failure.data.baggage) &&
              failure.data.baggage.response !== undefined
            ) {
              return { ...response, data: failure.data.baggage.response };
            }
            return response;
          },
          extractUpstreamCode: (_failure, response, helpers) => {
            let data = response?.data;
            if (helpers.isRecord(data) && Array.isArray(data.errors)) {
              let firstError = data.errors[0];
              if (helpers.isRecord(firstError) && typeof firstError.code === 'string') {
                return firstError.code;
              }
            }
            return undefined;
          }
        })
    });

    this.axios.interceptors.response.use(response => {
      if (
        isApiErrorRecord(response.data) &&
        Array.isArray(response.data.errors) &&
        response.data.errors.length > 0
      ) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'NextDNS',
            reason: 'nextdns_api_error',
            operation: `${response.config.method?.toUpperCase() ?? 'request'} ${response.config.url ?? ''}`,
            extractUpstreamCode: () => {
              let firstError = response.data.errors[0];
              return isApiErrorRecord(firstError) && typeof firstError.code === 'string'
                ? firstError.code
                : undefined;
            }
          }
        );
      }

      return response;
    });
  }

  private profilePath(profileId: string) {
    if (!profileId.trim()) {
      throw createApiServiceError('Provide a profile ID from list_profiles.', {
        reason: 'nextdns_profile_id_required'
      });
    }
    return `/profiles/${encodeURIComponent(profileId)}`;
  }

  // ── Profiles ──────────────────────────────────────────

  async listProfiles(params: { cursor?: string; limit?: number } = {}) {
    let response = await this.axios.get('/profiles', { params: pickDefined(params) });
    return response.data;
  }

  async createProfile(name: string) {
    if (!name.trim()) {
      throw createApiServiceError('Provide a non-empty profile name.', {
        reason: 'nextdns_profile_name_required'
      });
    }
    let response = await this.axios.post('/profiles', { name });
    return response.data;
  }

  async getProfile(profileId: string) {
    let response = await this.axios.get(this.profilePath(profileId));
    return response.data;
  }

  async updateProfile(profileId: string, data: { name?: string }) {
    if (data.name !== undefined && !data.name.trim()) {
      throw createApiServiceError('Provide a non-empty profile name.', {
        reason: 'nextdns_profile_name_required'
      });
    }
    let response = await this.axios.patch(this.profilePath(profileId), data);
    return response.data;
  }

  async deleteProfile(profileId: string) {
    let response = await this.axios.delete(this.profilePath(profileId));
    return response.data;
  }

  // ── Security ──────────────────────────────────────────

  async getSecurity(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/security`);
    return response.data;
  }

  async updateSecurity(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`${this.profilePath(profileId)}/security`, data);
    return response.data;
  }

  async getBlockedTlds(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/security/tlds`);
    return response.data;
  }

  async addBlockedTld(profileId: string, tld: string) {
    let response = await this.axios.post(`${this.profilePath(profileId)}/security/tlds`, {
      id: tld
    });
    return response.data;
  }

  async removeBlockedTld(profileId: string, tld: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/security/tlds/${encodeURIComponent(tld)}`
    );
    return response.data;
  }

  // ── Privacy ───────────────────────────────────────────

  async getPrivacy(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/privacy`);
    return response.data;
  }

  async updatePrivacy(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`${this.profilePath(profileId)}/privacy`, data);
    return response.data;
  }

  async getBlocklists(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/privacy/blocklists`);
    return response.data;
  }

  async addBlocklist(profileId: string, blocklistId: string) {
    let response = await this.axios.post(`${this.profilePath(profileId)}/privacy/blocklists`, {
      id: blocklistId
    });
    return response.data;
  }

  async removeBlocklist(profileId: string, blocklistId: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/privacy/blocklists/${encodeURIComponent(blocklistId)}`
    );
    return response.data;
  }

  async getNativeTrackers(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/privacy/natives`);
    return response.data;
  }

  async addNativeTracker(profileId: string, nativeId: string) {
    let response = await this.axios.post(`${this.profilePath(profileId)}/privacy/natives`, {
      id: nativeId
    });
    return response.data;
  }

  async removeNativeTracker(profileId: string, nativeId: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/privacy/natives/${encodeURIComponent(nativeId)}`
    );
    return response.data;
  }

  // ── Parental Controls ─────────────────────────────────

  async getParentalControl(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/parentalControl`);
    return response.data;
  }

  async updateParentalControl(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/parentalControl`,
      data
    );
    return response.data;
  }

  async getBlockedServices(profileId: string) {
    let response = await this.axios.get(
      `${this.profilePath(profileId)}/parentalControl/services`
    );
    return response.data;
  }

  async addBlockedService(profileId: string, serviceId: string, active: boolean = true) {
    let response = await this.axios.post(
      `${this.profilePath(profileId)}/parentalControl/services`,
      {
        id: serviceId,
        active
      }
    );
    return response.data;
  }

  async updateBlockedService(profileId: string, serviceId: string, active: boolean) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/parentalControl/services/${encodeURIComponent(serviceId)}`,
      { active }
    );
    return response.data;
  }

  async removeBlockedService(profileId: string, serviceId: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/parentalControl/services/${encodeURIComponent(serviceId)}`
    );
    return response.data;
  }

  async getBlockedCategories(profileId: string) {
    let response = await this.axios.get(
      `${this.profilePath(profileId)}/parentalControl/categories`
    );
    return response.data;
  }

  async addBlockedCategory(profileId: string, categoryId: string, active: boolean = true) {
    let response = await this.axios.post(
      `${this.profilePath(profileId)}/parentalControl/categories`,
      {
        id: categoryId,
        active
      }
    );
    return response.data;
  }

  async updateBlockedCategory(profileId: string, categoryId: string, active: boolean) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/parentalControl/categories/${encodeURIComponent(categoryId)}`,
      { active }
    );
    return response.data;
  }

  async removeBlockedCategory(profileId: string, categoryId: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/parentalControl/categories/${encodeURIComponent(categoryId)}`
    );
    return response.data;
  }

  // ── Denylist ──────────────────────────────────────────

  async getDenylist(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/denylist`);
    return response.data;
  }

  async addToDenylist(profileId: string, domain: string, active: boolean = true) {
    let response = await this.axios.post(`${this.profilePath(profileId)}/denylist`, {
      id: domain,
      active
    });
    return response.data;
  }

  async updateDenylistEntry(profileId: string, domain: string, active: boolean) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/denylist/${encodeURIComponent(domain)}`,
      {
        active
      }
    );
    return response.data;
  }

  async removeFromDenylist(profileId: string, domain: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/denylist/${encodeURIComponent(domain)}`
    );
    return response.data;
  }

  // ── Allowlist ─────────────────────────────────────────

  async getAllowlist(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/allowlist`);
    return response.data;
  }

  async addToAllowlist(profileId: string, domain: string, active: boolean = true) {
    let response = await this.axios.post(`${this.profilePath(profileId)}/allowlist`, {
      id: domain,
      active
    });
    return response.data;
  }

  async updateAllowlistEntry(profileId: string, domain: string, active: boolean) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/allowlist/${encodeURIComponent(domain)}`,
      {
        active
      }
    );
    return response.data;
  }

  async removeFromAllowlist(profileId: string, domain: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/allowlist/${encodeURIComponent(domain)}`
    );
    return response.data;
  }

  // ── Rewrites ──────────────────────────────────────────

  async getRewrites(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/rewrites`);
    return response.data;
  }

  async addRewrite(profileId: string, name: string, content: string) {
    let response = await this.axios.post(`${this.profilePath(profileId)}/rewrites`, {
      name,
      content
    });
    return response.data;
  }

  async removeRewrite(profileId: string, rewriteId: string) {
    let response = await this.axios.delete(
      `${this.profilePath(profileId)}/rewrites/${encodeURIComponent(rewriteId)}`
    );
    return response.data;
  }

  // ── Settings ──────────────────────────────────────────

  async getSettings(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/settings`);
    return response.data;
  }

  async updateSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`${this.profilePath(profileId)}/settings`, data);
    return response.data;
  }

  async updateLogSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/settings/logs`,
      data
    );
    return response.data;
  }

  async updateBlockPageSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/settings/blockPage`,
      data
    );
    return response.data;
  }

  async updatePerformanceSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(
      `${this.profilePath(profileId)}/settings/performance`,
      data
    );
    return response.data;
  }

  // ── Setup ─────────────────────────────────────────────

  async getSetup(profileId: string) {
    let response = await this.axios.get(`${this.profilePath(profileId)}/setup`);
    return response.data;
  }

  // ── Analytics ─────────────────────────────────────────

  async getAnalytics(
    profileId: string,
    dimension: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ) {
    let queryParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    }
    let response = await this.axios.get(
      `${this.profilePath(profileId)}/analytics/${dimension}`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  // ── Logs ──────────────────────────────────────────────

  async getLogs(
    profileId: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ) {
    let queryParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    }
    let response = await this.axios.get(`${this.profilePath(profileId)}/logs`, {
      params: queryParams
    });
    return response.data;
  }

  async clearLogs(profileId: string) {
    let response = await this.axios.delete(`${this.profilePath(profileId)}/logs`);
    return response.data;
  }
}
