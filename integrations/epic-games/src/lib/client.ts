import { createAxios } from 'slates';

export class EosGameServicesClient {
  private http: ReturnType<typeof createAxios>;

  constructor(private params: { token: string; deploymentId: string }) {
    this.http = createAxios({
      baseURL: 'https://api.epicgames.dev',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Connect / Product Users ---

  async queryExternalAccounts(
    accountIds: string[],
    identityProviderId: string,
    environment?: string
  ) {
    let params: Record<string, string | string[]> = {
      accountId: accountIds,
      identityProviderId
    };
    if (environment) {
      params.environment = environment;
    }
    let response = await this.http.get('/user/v1/accounts', { params });
    return response.data;
  }

  async queryProductUsers(productUserIds: string[]) {
    let response = await this.http.get('/user/v1/product-users', {
      params: { productUserId: productUserIds }
    });
    return response.data;
  }

  // --- Sanctions ---

  async getActiveSanctionsForPlayer(productUserId: string, actions?: string[]) {
    let params: Record<string, string | string[]> = {};
    if (actions && actions.length > 0) {
      params.action = actions;
    }
    let response = await this.http.get(`/sanctions/v1/productUser/${productUserId}/active`, {
      params
    });
    return response.data;
  }

  async syncSanctions(lastLogId?: string) {
    let params: Record<string, string> = {};
    if (lastLogId) {
      params.lastLogId = lastLogId;
    }
    let response = await this.http.get('/sanctions/v1/sync', { params });
    return response.data;
  }

  async bulkQueryActiveSanctions(productUserIds: string[], actions: string[]) {
    let response = await this.http.get(
      `/sanctions/v1/${this.params.deploymentId}/active-sanctions`,
      {
        params: {
          productUserId: productUserIds,
          action: actions
        }
      }
    );
    return response.data;
  }

  async createSanctions(
    sanctions: Array<{
      productUserId: string;
      action: string;
      justification: string;
      source: string;
      tags?: string[];
      pending?: boolean;
      metadata?: Record<string, string>;
      displayName?: string;
      identityProvider?: string;
      accountId?: string;
      duration?: number;
    }>
  ) {
    let response = await this.http.post(
      `/sanctions/v1/${this.params.deploymentId}/sanctions`,
      sanctions
    );
    return response.data;
  }

  async querySanctions(limit?: number, offset?: number) {
    let response = await this.http.get(`/sanctions/v1/${this.params.deploymentId}/sanctions`, {
      params: { limit, offset }
    });
    return response.data;
  }

  async queryPlayerSanctions(productUserId: string, limit?: number, offset?: number) {
    let response = await this.http.get(
      `/sanctions/v1/${this.params.deploymentId}/users/${productUserId}`,
      {
        params: { limit, offset }
      }
    );
    return response.data;
  }

  async updateSanctions(
    updates: Array<{
      referenceId: string;
      updates: {
        tags?: string[];
        metadata?: Record<string, string>;
        justification?: string;
      };
    }>
  ) {
    let response = await this.http.patch(
      `/sanctions/v1/${this.params.deploymentId}/sanctions`,
      updates
    );
    return response.data;
  }

  async removeSanctions(referenceIds: string[]) {
    let response = await this.http.delete(
      `/sanctions/v1/${this.params.deploymentId}/sanctions`,
      { data: referenceIds.map(referenceId => ({ referenceId })) }
    );
    return response.data;
  }

  // --- Player Reports ---

  async sendPlayerReport(report: {
    reportingPlayerId: string;
    reportedPlayerId: string;
    time: string;
    reasonId: number;
    message?: string;
    context?: string;
  }) {
    let response = await this.http.post('/player-reports/v1/report', report);
    return response.data;
  }

  async findPlayerReports(params: {
    reportingPlayerId?: string;
    reportedPlayerId?: string;
    reasonId?: number;
    startTime?: string;
    endTime?: string;
    pagination?: boolean;
    offset?: number;
    limit?: number;
    order?: string;
  }) {
    let response = await this.http.get(
      `/player-reports/v1/report/${this.params.deploymentId}`,
      {
        params
      }
    );
    return response.data;
  }

  async getReportReasonDefinitions() {
    let response = await this.http.get('/player-reports/v1/report/reason/definition');
    return response.data;
  }

  // --- Anti-Cheat ---

  async getAntiCheatStatus() {
    let response = await this.http.get(`/anticheat/v1/${this.params.deploymentId}/status`);
    return response.data;
  }

  // --- Voice ---

  async createVoiceRoomTokens(
    roomId: string,
    participants: Array<{
      puid: string;
      clientIp?: string;
      hardMuted?: boolean;
    }>
  ) {
    let response = await this.http.post(`/rtc/v1/${this.params.deploymentId}/room/${roomId}`, {
      participants
    });
    return response.data;
  }

  async removeVoiceParticipant(roomId: string, productUserId: string) {
    let response = await this.http.delete(
      `/rtc/v1/${this.params.deploymentId}/room/${roomId}/participants/${productUserId}`
    );
    return response.data;
  }

  async modifyVoiceParticipant(roomId: string, productUserId: string, hardMuted: boolean) {
    let response = await this.http.post(
      `/rtc/v1/${this.params.deploymentId}/room/${roomId}/participants/${productUserId}`,
      { hardMuted }
    );
    return response.data;
  }
}

export class EosAccountServicesClient {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string; accountId?: string }) {
    this.http = createAxios({
      baseURL: 'https://api.epicgames.dev',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Account Info ---

  async getAccounts(accountIds: string[]) {
    let response = await this.http.get('/epic/id/v2/accounts', {
      params: { accountId: accountIds }
    });
    return response.data;
  }

  // --- Friends ---

  async getFriendsAndBlockList(accountId: string) {
    let response = await this.http.get(`/epic/friends/v1/${accountId}`);
    return response.data;
  }

  async getFriends(accountId: string) {
    let response = await this.http.get(`/epic/friends/v1/${accountId}/friends`);
    return response.data;
  }

  async getBlockList(accountId: string) {
    let response = await this.http.get(`/epic/friends/v1/${accountId}/blocklist`);
    return response.data;
  }

  // --- Ecommerce ---

  async checkOwnership(accountId: string, nsCatalogItemIds?: string[], sandboxId?: string) {
    let params: Record<string, string | string[]> = {};
    if (nsCatalogItemIds && nsCatalogItemIds.length > 0) {
      params.nsCatalogItemId = nsCatalogItemIds;
    }
    if (sandboxId) {
      params.sandboxId = sandboxId;
    }
    let response = await this.http.get(
      `/epic/ecom/v3/platforms/EPIC/identities/${accountId}/ownership`,
      { params }
    );
    return response.data;
  }

  async getEntitlements(
    accountId: string,
    sandboxId: string,
    entitlementNames?: string[],
    includeRedeemed?: boolean
  ) {
    let params: Record<string, string | string[] | boolean> = { sandboxId };
    if (entitlementNames && entitlementNames.length > 0) {
      params.entitlementName = entitlementNames;
    }
    if (includeRedeemed !== undefined) {
      params.includeRedeemed = includeRedeemed;
    }
    let response = await this.http.get(`/epic/ecom/v4/identities/${accountId}/entitlements`, {
      params
    });
    return response.data;
  }

  async redeemEntitlements(accountId: string, entitlementIds: string[], sandboxId: string) {
    let response = await this.http.put(
      `/epic/ecom/v3/identities/${accountId}/entitlements/redeem`,
      { entitlementIds, sandboxId }
    );
    return response.data;
  }
}
