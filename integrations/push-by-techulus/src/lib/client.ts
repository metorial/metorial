import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface NotificationOptions {
  title: string;
  body: string;
  sound?: string;
  channel?: string;
  link?: string;
  image?: string;
  timeSensitive?: boolean;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  responses?: {
    success: boolean;
    message?: string;
    [key: string]: unknown;
  }[];
}

export interface TeamManagementResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Connect a Push by Techulus API key before continuing.', {
        reason: 'push_by_techulus_api_key_required'
      });
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://push.techulus.com/api',
      timeout: 30_000,
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Push by Techulus',
          reason: 'push_by_techulus_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.error === 'string'
              ? response.data.error
              : undefined
        })
    });

    this.axios.interceptors.response.use(response => {
      if (response.data?.success !== true) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Push by Techulus',
            reason: 'push_by_techulus_api_error',
            operation: response.config.url ?? 'request',
            fallbackMessage: 'The API did not confirm a successful operation.',
            extractUpstreamCode: (_error, upstream, helpers) =>
              helpers.isRecord(upstream?.data) && typeof upstream.data.error === 'string'
                ? upstream.data.error
                : undefined
          }
        );
      }
      return response;
    });
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResponse> {
    let response = await this.axios.post('/v1/notify', options);
    return response.data;
  }

  async sendNotificationAsync(options: NotificationOptions): Promise<NotificationResponse> {
    let response = await this.axios.post('/v1/notify-async', options);
    return response.data;
  }

  async sendGroupNotification(
    groupId: string,
    options: NotificationOptions
  ): Promise<NotificationResponse> {
    if (!groupId.trim()) {
      throw createApiServiceError('Provide the device group ID from your Push account.', {
        reason: 'push_by_techulus_group_id_required'
      });
    }

    let response = await this.axios.post(
      `/v1/notify/group/${encodeURIComponent(groupId)}`,
      options
    );
    return response.data;
  }

  async inviteTeamMember(teamApiKey: string, email: string): Promise<TeamManagementResponse> {
    let response = await this.axios.post('/management/v1/teams/invite', {
      team: teamApiKey,
      email
    });
    return response.data;
  }

  async removeTeamMember(teamApiKey: string, email: string): Promise<TeamManagementResponse> {
    let response = await this.axios.delete('/management/v1/teams/invite', {
      data: {
        team: teamApiKey,
        email
      }
    });
    return response.data;
  }
}
