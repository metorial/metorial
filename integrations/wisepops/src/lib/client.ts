import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface WisepopsContact {
  collected_at: string;
  wisepop_id: number;
  form_session?: string;
  ip: string;
  country_code: string;
  fields: Record<string, string>;
}

export interface WisepopsCampaign {
  id: number;
  label: string;
  created_at: string;
  activated: boolean;
  display_count: number;
  click_count: number;
  email_count: number;
}

export interface WisepopsHook {
  id: number;
  event: string;
  target_url: string;
  wisepop_id?: number;
}

export interface CreateHookParams {
  event: 'email' | 'phone' | 'survey';
  targetUrl: string;
  wisepopId?: number;
}

export interface DeleteUserDataParams {
  email?: string;
  phone?: string;
}

export interface ListContactsParams {
  collectedAfter?: string;
  wisepopId?: number;
  pageSize?: number;
}

export class Client {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Wisepops API key is required. Reconnect with a valid API key.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.wisepops.com/api2',
      timeout: 30_000,
      authHeader: { value: `WISEPOPS-API key="${token}"` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Wisepops',
          reason: 'wisepops_api_error'
        })
    });
  }

  async listContacts(params?: ListContactsParams): Promise<WisepopsContact[]> {
    let queryParams: Record<string, string> = {};

    if (params?.collectedAfter !== undefined) {
      queryParams.collected_after = params.collectedAfter;
    }
    if (params?.wisepopId !== undefined) {
      if (!Number.isInteger(params.wisepopId) || params.wisepopId < 1) {
        throw createApiServiceError(
          'The campaign ID must be a positive whole number. Call list_campaigns to find a campaign ID.'
        );
      }
      queryParams.wisepop_id = String(params.wisepopId);
    }
    if (params?.pageSize !== undefined) {
      if (
        !Number.isInteger(params.pageSize) ||
        params.pageSize < 1 ||
        params.pageSize > 1000
      ) {
        throw createApiServiceError('The page size must be a whole number from 1 to 1000.');
      }
      queryParams.page_size = String(params.pageSize);
    }

    let response = await this.axios.get('/contacts', { params: queryParams });
    return response.data;
  }

  async listCampaigns(): Promise<WisepopsCampaign[]> {
    let response = await this.axios.get('/wisepops');
    return response.data;
  }

  async listHooks(): Promise<WisepopsHook[]> {
    let response = await this.axios.get('/hooks');
    return response.data;
  }

  async createHook(params: CreateHookParams): Promise<{ id: number }> {
    if (
      params.wisepopId !== undefined &&
      (!Number.isInteger(params.wisepopId) || params.wisepopId < 1)
    ) {
      throw createApiServiceError(
        'The campaign ID must be a positive whole number. Call list_campaigns to find a campaign ID.'
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(params.targetUrl);
    } catch {
      throw createApiServiceError('The webhook target URL must be a valid HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      throw createApiServiceError('The webhook target URL must use HTTP or HTTPS.');
    }

    let response = await this.axios.post(
      '/hooks',
      {
        event: params.event,
        target_url: params.targetUrl,
        ...(params.wisepopId !== undefined ? { wisepop_id: params.wisepopId } : {})
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteHook(hookId: number): Promise<void> {
    if (!Number.isInteger(hookId) || hookId < 1) {
      throw createApiServiceError(
        'The webhook ID must be a positive whole number. Call list_webhooks to find a webhook ID.'
      );
    }

    await this.axios.delete('/hooks', {
      params: { hook_id: String(hookId) }
    });
  }

  async deleteUserData(params: DeleteUserDataParams): Promise<{ deleted: number }> {
    if (!params.email?.trim() && !params.phone?.trim()) {
      throw createApiServiceError('At least one of email or phone must be provided.');
    }
    if (params.phone !== undefined && !/^\+\d+$/.test(params.phone)) {
      throw createApiServiceError(
        'The phone number must use international format with a leading +, digits, and no whitespace.'
      );
    }

    let body: Record<string, string> = {};
    if (params.email) {
      body.email = params.email;
    }
    if (params.phone) {
      body.phone = params.phone;
    }

    let response = await this.axios.delete('/data-privacy', {
      headers: { 'Content-Type': 'application/json' },
      data: body
    });
    return response.data;
  }
}
