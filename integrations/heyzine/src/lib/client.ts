import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://heyzine.com/api1'
});

export interface FlipbookConversionOptions {
  pdfUrl: string;
  clientId: string;
  title?: string;
  subtitle?: string;
  description?: string;
  templateFlipbookId?: string;
  logoUrl?: string;
  backgroundColor?: string;
  downloadButton?: boolean;
  fullscreen?: boolean;
  share?: boolean;
  navigationButtons?: boolean;
}

export interface FlipbookConversionResponse {
  id: string;
  url: string;
  thumbnail: string;
  pdf: string;
  state?: string;
}

export interface FlipbookInfo {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  thumbnail: string;
  pdf: string;
  pages: number;
  tags: string;
  created: string;
  links: Record<string, string>;
  oembed: Record<string, any>;
}

export interface BookshelfInfo {
  id: string;
  title: string;
  url: string;
}

export interface AccessListUser {
  user: string;
  password?: string;
}

export interface SocialMetadata {
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface PasswordProtectionOptions {
  flipbookId: string;
  mode: string;
  password?: string;
  usernameLabel?: string;
  passwordLabel?: string;
}

export interface OEmbedData {
  type: string;
  version: string;
  title: string;
  provider_name: string;
  provider_url: string;
  html: string;
  width: number;
  height: number;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

export class HeyzineClient {
  private token: string;
  private clientId: string;

  constructor(config: { token: string; clientId: string }) {
    this.token = config.token;
    this.clientId = config.clientId;
  }

  // --- Flipbook Conversion ---

  async createFlipbookSync(
    options: FlipbookConversionOptions
  ): Promise<FlipbookConversionResponse> {
    let params: Record<string, string> = {
      pdf: options.pdfUrl,
      k: options.clientId || this.clientId
    };

    if (options.title) params.t = options.title;
    if (options.subtitle) params.s = options.subtitle;
    if (options.description) params.d = options.description;
    if (options.templateFlipbookId) params.tpl = options.templateFlipbookId;
    if (options.logoUrl) params.logo = options.logoUrl;
    if (options.backgroundColor) params.bg = options.backgroundColor;
    if (options.downloadButton !== undefined)
      params.download = options.downloadButton ? '1' : '0';
    if (options.fullscreen !== undefined) params.fullscreen = options.fullscreen ? '1' : '0';
    if (options.share !== undefined) params.share = options.share ? '1' : '0';
    if (options.navigationButtons !== undefined)
      params.nav = options.navigationButtons ? '1' : '0';

    let response = await api.get('/rest', { params });
    return response.data;
  }

  async createFlipbookAsync(
    options: FlipbookConversionOptions
  ): Promise<FlipbookConversionResponse> {
    let params: Record<string, string> = {
      pdf: options.pdfUrl,
      k: options.clientId || this.clientId
    };

    if (options.title) params.t = options.title;
    if (options.subtitle) params.s = options.subtitle;
    if (options.description) params.d = options.description;
    if (options.templateFlipbookId) params.tpl = options.templateFlipbookId;
    if (options.logoUrl) params.logo = options.logoUrl;
    if (options.backgroundColor) params.bg = options.backgroundColor;
    if (options.downloadButton !== undefined)
      params.download = options.downloadButton ? '1' : '0';
    if (options.fullscreen !== undefined) params.fullscreen = options.fullscreen ? '1' : '0';
    if (options.share !== undefined) params.share = options.share ? '1' : '0';
    if (options.navigationButtons !== undefined)
      params.nav = options.navigationButtons ? '1' : '0';

    let response = await api.get('/async', { params });
    return response.data;
  }

  // --- Flipbook Management ---

  private bearerHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  async listFlipbooks(search?: string, tags?: string): Promise<FlipbookInfo[]> {
    let params: Record<string, string> = {};
    if (search) params.search = search;
    if (tags) params.tags = tags;

    let response = await api.get('/flipbook-list', {
      headers: this.bearerHeaders(),
      params
    });
    return response.data;
  }

  async getFlipbookDetails(flipbookId: string): Promise<FlipbookInfo> {
    let response = await api.get('/flipbook-details', {
      headers: this.bearerHeaders(),
      params: { id: flipbookId }
    });
    return response.data;
  }

  async deleteFlipbook(
    flipbookId: string
  ): Promise<{ success: boolean; code: number; msg: string }> {
    let response = await api.post(
      '/flipbook-delete',
      { id: flipbookId },
      {
        headers: this.bearerHeaders()
      }
    );
    return response.data;
  }

  async getEmbedCode(
    flipbookId: string,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<{ html: string }> {
    let params: Record<string, string | number> = { id: flipbookId };
    if (maxWidth) params.maxwidth = maxWidth;
    if (maxHeight) params.maxheight = maxHeight;

    let response = await api.get('/embed-code', {
      headers: this.bearerHeaders(),
      params
    });
    return response.data;
  }

  // --- Bookshelf Management ---

  async listBookshelves(): Promise<BookshelfInfo[]> {
    let response = await api.get('/bookshelf-list', {
      headers: this.bearerHeaders()
    });
    return response.data;
  }

  async listBookshelfFlipbooks(bookshelfId: string): Promise<FlipbookInfo[]> {
    let response = await api.get('/bookshelf-flipbooks', {
      headers: this.bearerHeaders(),
      params: { id: bookshelfId }
    });
    return response.data;
  }

  async addFlipbookToBookshelf(
    bookshelfId: string,
    flipbookId: string,
    position?: number
  ): Promise<any> {
    let body: Record<string, any> = {
      id: bookshelfId,
      flipbook_id: flipbookId
    };
    if (position !== undefined) body.position = position;

    let response = await api.post('/bookshelf-add', body, {
      headers: this.bearerHeaders()
    });
    return response.data;
  }

  async removeFlipbookFromBookshelf(bookshelfId: string, flipbookId: string): Promise<any> {
    let response = await api.post(
      '/bookshelf-remove',
      {
        id: bookshelfId,
        flipbook_id: flipbookId
      },
      {
        headers: this.bearerHeaders()
      }
    );
    return response.data;
  }

  // --- Social Metadata ---

  async updateFlipbookSocial(flipbookId: string, metadata: SocialMetadata): Promise<any> {
    let response = await api.post(
      '/flipbook-social',
      {
        id: flipbookId,
        ...metadata
      },
      {
        headers: this.bearerHeaders()
      }
    );
    return response.data;
  }

  async updateBookshelfSocial(bookshelfId: string, metadata: SocialMetadata): Promise<any> {
    let response = await api.post(
      '/bookshelf-social',
      {
        id: bookshelfId,
        ...metadata
      },
      {
        headers: this.bearerHeaders()
      }
    );
    return response.data;
  }

  // --- Password Protection & Access Control ---

  async updatePasswordProtection(options: PasswordProtectionOptions): Promise<any> {
    let body: Record<string, any> = {
      id: options.flipbookId,
      mode: options.mode
    };
    if (options.password) body.password = options.password;
    if (options.usernameLabel) body.username_label = options.usernameLabel;
    if (options.passwordLabel) body.password_label = options.passwordLabel;

    let response = await api.post('/update-password', body, {
      headers: this.bearerHeaders()
    });
    return response.data;
  }

  async updateAccessList(
    flipbookId: string,
    accessType: string,
    users: AccessListUser[],
    action: 'add' | 'remove' = 'add'
  ): Promise<any> {
    let response = await api.post(
      '/access-list',
      {
        id: flipbookId,
        access_type: accessType,
        action,
        users
      },
      {
        headers: this.bearerHeaders()
      }
    );
    return response.data;
  }

  // --- oEmbed ---

  async getOEmbed(url: string, maxWidth?: number, maxHeight?: number): Promise<OEmbedData> {
    let params: Record<string, string | number> = {
      url,
      format: 'json'
    };
    if (maxWidth) params.maxwidth = maxWidth;
    if (maxHeight) params.maxheight = maxHeight;

    let response = await api.get('/oembed', { params });
    return response.data;
  }

  // --- API Limits ---

  async getApiLimits(): Promise<any> {
    let response = await api.get('/limits', {
      headers: this.bearerHeaders()
    });
    return response.data;
  }
}
