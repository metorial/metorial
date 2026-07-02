import { createAxios } from 'slates';

export class NextDnsClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.nextdns.io',
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Profiles ──────────────────────────────────────────

  async listProfiles() {
    let response = await this.axios.get('/profiles');
    return response.data;
  }

  async createProfile(name: string) {
    let response = await this.axios.post('/profiles', { name });
    return response.data;
  }

  async getProfile(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}`);
    return response.data;
  }

  async updateProfile(profileId: string, data: { name?: string }) {
    let response = await this.axios.patch(`/profiles/${profileId}`, data);
    return response.data;
  }

  async deleteProfile(profileId: string) {
    let response = await this.axios.delete(`/profiles/${profileId}`);
    return response.data;
  }

  // ── Security ──────────────────────────────────────────

  async getSecurity(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/security`);
    return response.data;
  }

  async updateSecurity(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/security`, data);
    return response.data;
  }

  async getBlockedTlds(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/security/tlds`);
    return response.data;
  }

  async addBlockedTld(profileId: string, tld: string) {
    let response = await this.axios.post(`/profiles/${profileId}/security/tlds`, { id: tld });
    return response.data;
  }

  async removeBlockedTld(profileId: string, tld: string) {
    let response = await this.axios.delete(`/profiles/${profileId}/security/tlds/${tld}`);
    return response.data;
  }

  // ── Privacy ───────────────────────────────────────────

  async getPrivacy(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/privacy`);
    return response.data;
  }

  async updatePrivacy(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/privacy`, data);
    return response.data;
  }

  async getBlocklists(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/privacy/blocklists`);
    return response.data;
  }

  async addBlocklist(profileId: string, blocklistId: string) {
    let response = await this.axios.post(`/profiles/${profileId}/privacy/blocklists`, {
      id: blocklistId
    });
    return response.data;
  }

  async removeBlocklist(profileId: string, blocklistId: string) {
    let response = await this.axios.delete(
      `/profiles/${profileId}/privacy/blocklists/${blocklistId}`
    );
    return response.data;
  }

  async getNativeTrackers(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/privacy/natives`);
    return response.data;
  }

  async addNativeTracker(profileId: string, nativeId: string) {
    let response = await this.axios.post(`/profiles/${profileId}/privacy/natives`, {
      id: nativeId
    });
    return response.data;
  }

  async removeNativeTracker(profileId: string, nativeId: string) {
    let response = await this.axios.delete(
      `/profiles/${profileId}/privacy/natives/${nativeId}`
    );
    return response.data;
  }

  // ── Parental Controls ─────────────────────────────────

  async getParentalControl(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/parentalControl`);
    return response.data;
  }

  async updateParentalControl(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/parentalControl`, data);
    return response.data;
  }

  async getBlockedServices(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/parentalControl/services`);
    return response.data;
  }

  async addBlockedService(profileId: string, serviceId: string, active: boolean = true) {
    let response = await this.axios.post(`/profiles/${profileId}/parentalControl/services`, {
      id: serviceId,
      active
    });
    return response.data;
  }

  async updateBlockedService(profileId: string, serviceId: string, active: boolean) {
    let response = await this.axios.patch(
      `/profiles/${profileId}/parentalControl/services/${serviceId}`,
      { active }
    );
    return response.data;
  }

  async removeBlockedService(profileId: string, serviceId: string) {
    let response = await this.axios.delete(
      `/profiles/${profileId}/parentalControl/services/${serviceId}`
    );
    return response.data;
  }

  async getBlockedCategories(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/parentalControl/categories`);
    return response.data;
  }

  async addBlockedCategory(profileId: string, categoryId: string, active: boolean = true) {
    let response = await this.axios.post(`/profiles/${profileId}/parentalControl/categories`, {
      id: categoryId,
      active
    });
    return response.data;
  }

  async updateBlockedCategory(profileId: string, categoryId: string, active: boolean) {
    let response = await this.axios.patch(
      `/profiles/${profileId}/parentalControl/categories/${categoryId}`,
      { active }
    );
    return response.data;
  }

  async removeBlockedCategory(profileId: string, categoryId: string) {
    let response = await this.axios.delete(
      `/profiles/${profileId}/parentalControl/categories/${categoryId}`
    );
    return response.data;
  }

  // ── Denylist ──────────────────────────────────────────

  async getDenylist(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/denylist`);
    return response.data;
  }

  async addToDenylist(profileId: string, domain: string, active: boolean = true) {
    let response = await this.axios.post(`/profiles/${profileId}/denylist`, {
      id: domain,
      active
    });
    return response.data;
  }

  async updateDenylistEntry(profileId: string, domain: string, active: boolean) {
    let response = await this.axios.patch(`/profiles/${profileId}/denylist/${domain}`, {
      active
    });
    return response.data;
  }

  async removeFromDenylist(profileId: string, domain: string) {
    let response = await this.axios.delete(`/profiles/${profileId}/denylist/${domain}`);
    return response.data;
  }

  // ── Allowlist ─────────────────────────────────────────

  async getAllowlist(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/allowlist`);
    return response.data;
  }

  async addToAllowlist(profileId: string, domain: string, active: boolean = true) {
    let response = await this.axios.post(`/profiles/${profileId}/allowlist`, {
      id: domain,
      active
    });
    return response.data;
  }

  async updateAllowlistEntry(profileId: string, domain: string, active: boolean) {
    let response = await this.axios.patch(`/profiles/${profileId}/allowlist/${domain}`, {
      active
    });
    return response.data;
  }

  async removeFromAllowlist(profileId: string, domain: string) {
    let response = await this.axios.delete(`/profiles/${profileId}/allowlist/${domain}`);
    return response.data;
  }

  // ── Rewrites ──────────────────────────────────────────

  async getRewrites(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/rewrites`);
    return response.data;
  }

  async addRewrite(profileId: string, name: string, content: string) {
    let response = await this.axios.post(`/profiles/${profileId}/rewrites`, { name, content });
    return response.data;
  }

  async removeRewrite(profileId: string, rewriteId: string) {
    let response = await this.axios.delete(`/profiles/${profileId}/rewrites/${rewriteId}`);
    return response.data;
  }

  // ── Settings ──────────────────────────────────────────

  async getSettings(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/settings`);
    return response.data;
  }

  async updateSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/settings`, data);
    return response.data;
  }

  async updateLogSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/settings/logs`, data);
    return response.data;
  }

  async updateBlockPageSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/settings/blockPage`, data);
    return response.data;
  }

  async updatePerformanceSettings(profileId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/profiles/${profileId}/settings/performance`, data);
    return response.data;
  }

  // ── Setup ─────────────────────────────────────────────

  async getSetup(profileId: string) {
    let response = await this.axios.get(`/profiles/${profileId}/setup`);
    return response.data;
  }

  // ── Analytics ─────────────────────────────────────────

  async getAnalytics(
    profileId: string,
    dimension: string,
    params: Record<string, string | number | undefined> = {}
  ) {
    let queryParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    }
    let response = await this.axios.get(`/profiles/${profileId}/analytics/${dimension}`, {
      params: queryParams
    });
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
    let response = await this.axios.get(`/profiles/${profileId}/logs`, {
      params: queryParams
    });
    return response.data;
  }

  async clearLogs(profileId: string) {
    let response = await this.axios.delete(`/profiles/${profileId}/logs`);
    return response.data;
  }
}
