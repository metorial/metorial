import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Proofly API key, then reconnect.', {
        reason: 'proofly_missing_api_key'
      });
    }
    this.axios = createAxios({
      baseURL: 'https://proofly.io/api',
      timeout: 30_000,
      validateStatus: () => true,
      headers: {
        'X-Api-Key': config.token,
        Accept: 'application/json'
      }
    });
  }

  private async request(method: 'GET' | 'PUT' | 'POST', path: string, data?: unknown) {
    try {
      let response = await this.axios.request({ method, url: path, data });
      let body: unknown = response.data;
      if (
        response.status < 200 ||
        response.status >= 300 ||
        (isApiErrorRecord(body) &&
          (body.ok === false || (typeof body.status === 'number' && body.status >= 400)))
      ) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Proofly',
            reason: 'proofly_api_error',
            operation: `${method} ${path}`
          }
        );
      }
      return body;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Proofly',
        reason: 'proofly_api_error',
        operation: `${method} ${path}`,
        extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
      });
    }
  }

  private unwrap(body: unknown) {
    return isApiErrorRecord(body) && 'data' in body ? body.data : body;
  }

  private async list(path: string, aliases: string[] = []) {
    let data = this.unwrap(await this.request('GET', path));
    if (isApiErrorRecord(data)) {
      for (let key of aliases) {
        if (Array.isArray(data[key])) {
          data = data[key];
          break;
        }
      }
    }
    if (!Array.isArray(data)) {
      throw createApiServiceError(`Proofly returned an invalid list for ${path}.`, {
        reason: 'proofly_invalid_response'
      });
    }
    let entries = data.filter(isApiErrorRecord);
    if (entries.length !== data.length) {
      throw createApiServiceError(`Proofly returned an invalid list entry for ${path}.`, {
        reason: 'proofly_invalid_response'
      });
    }
    return entries;
  }

  private resourceId(id: string, label: string) {
    if (!id.trim()) {
      throw createApiServiceError(`Provide a ${label} ID from the discovery tools.`, {
        reason: 'proofly_missing_resource_id'
      });
    }
    return encodeURIComponent(id);
  }

  async getUser() {
    let user = this.unwrap(await this.request('GET', '/user'));
    if (!isApiErrorRecord(user)) {
      throw createApiServiceError('Proofly returned invalid account information.', {
        reason: 'proofly_invalid_response'
      });
    }
    return user;
  }

  getActivityLogs() {
    return this.list('/activity', ['activities', 'logs']);
  }

  listCampaigns() {
    return this.list('/campaigns', ['campaigns']);
  }

  getCampaignNotifications(campaignId: string) {
    return this.list(`/campaign/${this.resourceId(campaignId, 'campaign')}`, [
      'notifications'
    ]);
  }

  async toggleCampaign(campaignId: string) {
    let result = await this.request(
      'PUT',
      `/campaign/${this.resourceId(campaignId, 'campaign')}`
    );
    if (!isApiErrorRecord(result) || result.ok !== true) {
      throw createApiServiceError('Proofly did not confirm that the campaign was toggled.', {
        reason: 'proofly_unconfirmed_toggle'
      });
    }
    return this.unwrap(result);
  }

  async getNotification(notificationId: string) {
    return this.unwrap(
      await this.request(
        'GET',
        `/notification/${this.resourceId(notificationId, 'notification')}`
      )
    );
  }

  getNotificationData(notificationId: string) {
    return this.list(`/data/${this.resourceId(notificationId, 'notification')}`, [
      'data',
      'entries'
    ]);
  }

  async createConversion(notificationId: string, conversionData: Record<string, unknown>) {
    let result = await this.request(
      'POST',
      `/notification/${this.resourceId(notificationId, 'notification')}/conversion`,
      conversionData
    );
    if (!isApiErrorRecord(result) || result.ok !== true) {
      throw createApiServiceError('Proofly did not confirm that the conversion was created.', {
        reason: 'proofly_unconfirmed_conversion'
      });
    }
    return { ok: result.ok };
  }
}
