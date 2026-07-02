import { createAxios } from 'slates';

export interface BannerFile {
  id: string;
  url: string;
  status: string;
  name?: string;
  type?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface Banner {
  bannerId: string;
  status: string;
  templateId: string;
  files: BannerFile[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBannerParams {
  templateId: string;
  modes: Record<string, any>;
  sizeIds?: string | string[];
  overrides?: Record<string, any>;
}

export interface AccountInfo {
  userId: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface UserAccessResponse {
  editorURL: string;
  embeddedEditorURL: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.adrapid.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createBanner(params: CreateBannerParams): Promise<Banner> {
    let response = await this.axios.post('/banners', {
      templateId: params.templateId,
      modes: params.modes,
      ...(params.sizeIds !== undefined ? { sizeIds: params.sizeIds } : {}),
      ...(params.overrides !== undefined ? { overrides: params.overrides } : {})
    });

    let data = response.data;
    return this.normalizeBanner(data);
  }

  async getBanner(bannerId: string): Promise<Banner> {
    let response = await this.axios.get(`/banners/${bannerId}`);
    let data = response.data;
    return this.normalizeBanner(data);
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.axios.get('/me');
    let data = response.data;
    return {
      userId: data.id || data._id || '',
      email: data.email,
      name: data.name || data.username,
      ...data
    };
  }

  async getUserAccess(
    userId: string,
    options?: {
      templateId?: string;
      editorOptions?: Record<string, any>;
    }
  ): Promise<UserAccessResponse> {
    let params: Record<string, string> = {};
    if (options?.templateId) {
      params.template_id = options.templateId;
    }
    if (options?.editorOptions) {
      params.options = JSON.stringify(options.editorOptions);
    }

    let response = await this.axios.get(`/v1/api/users/${userId}/access/`, { params });
    return response.data;
  }

  async pollBannerUntilReady(
    bannerId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<Banner> {
    for (let i = 0; i < maxAttempts; i++) {
      let banner = await this.getBanner(bannerId);
      if (banner.status === 'ready' || banner.status === 'failed') {
        return banner;
      }
      await this.sleep(intervalMs);
    }
    let finalBanner = await this.getBanner(bannerId);
    return finalBanner;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private normalizeBanner(data: any): Banner {
    return {
      bannerId: data.id || data._id || '',
      status: data.status || 'unknown',
      templateId: data.templateId || '',
      files: Array.isArray(data.files)
        ? data.files.map((f: any) => ({
            id: f.id || f._id || '',
            url: f.url || '',
            status: f.status || '',
            name: f.name,
            type: f.type,
            size: f.size,
            width: f.width,
            height: f.height
          }))
        : [],
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at
    };
  }
}
