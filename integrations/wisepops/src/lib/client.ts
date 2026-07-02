import { createAxios } from 'slates';

export interface WisepopsContact {
  collected_at: string;
  wisepop_id: number;
  form_session: string;
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

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://app.wisepops.com/api2',
      headers: {
        Authorization: `WISEPOPS-API key="${this.token}"`
      }
    });
  }

  async listContacts(params?: ListContactsParams): Promise<WisepopsContact[]> {
    let queryParams: Record<string, string> = {};

    if (params?.collectedAfter) {
      queryParams.collected_after = params.collectedAfter;
    }
    if (params?.wisepopId) {
      queryParams.wisepop_id = String(params.wisepopId);
    }
    if (params?.pageSize) {
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
    let response = await this.axios.post(
      '/hooks',
      {
        event: params.event,
        target_url: params.targetUrl,
        ...(params.wisepopId ? { wisepop_id: params.wisepopId } : {})
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteHook(hookId: number): Promise<void> {
    await this.axios.delete('/hooks', {
      params: { hook_id: String(hookId) }
    });
  }

  async deleteUserData(params: DeleteUserDataParams): Promise<{ deleted: number }> {
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
