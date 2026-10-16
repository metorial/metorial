import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface FlipbookDesignOptions {
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
  privateNote?: string;
  tags?: string;
  showInfo?: boolean;
  pageEffect?: string;
  rightToLeft?: boolean;
}

export interface FlipbookConversionOptions extends FlipbookDesignOptions {
  pdfUrl: string;
  clientId: string;
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
  pages: number;
  tags?: string;
  date: string;
  links: Record<string, string> & { base: string; thumbnail: string; pdf: string };
}

export interface FlipbookDetails extends FlipbookInfo {
  tags: string;
  oembed: Record<string, unknown>;
}

export interface BookshelfInfo {
  id: string;
  title: string;
  links: { url: string };
}

export interface AccessListUser {
  user?: string;
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
  resourceType?: 'flipbook' | 'bookshelf';
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

export interface OperationResult {
  success: boolean;
  code?: number;
  msg?: string;
}

let api = createAuthenticatedAxios({
  baseURL: 'https://heyzine.com/api1',
  timeout: 180_000,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Heyzine',
      reason: 'heyzine_api_error',
      detailKeys: ['msg', 'message', 'error', 'detail', 'code'],
      extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
    })
});

api.interceptors.response.use(response => {
  let data: unknown = response.data;
  if (
    isApiErrorRecord(data) &&
    (data.success === false ||
      data.state === 'failed' ||
      (data.error !== undefined && data.error !== false && data.error !== null) ||
      (typeof data.code === 'number' && data.code >= 400))
  ) {
    throw buildApiServiceError(
      { response: { status: response.status, data } },
      {
        providerLabel: 'Heyzine',
        reason: 'heyzine_api_error',
        detailKeys: ['msg', 'message', 'error', 'detail', 'code', 'state'],
        extractUpstreamCode: () =>
          typeof data.code === 'string' || typeof data.code === 'number'
            ? String(data.code)
            : undefined
      }
    );
  }
  return response;
});

let designPayload = (options: FlipbookDesignOptions) =>
  pickDefined({
    title: options.title,
    subtitle: options.subtitle,
    description: options.description,
    template: options.templateFlipbookId,
    logo: options.logoUrl,
    background_color: options.backgroundColor,
    download: options.downloadButton,
    full_screen: options.fullscreen,
    share: options.share,
    prev_next: options.navigationButtons,
    private_note: options.privateNote,
    tags: options.tags,
    show_info: options.showInfo,
    page_effect: options.pageEffect,
    rtl: options.rightToLeft
  });

export class HeyzineClient {
  constructor(private config: { token: string; clientId: string }) {}

  private bearerHeaders() {
    if (!this.config.token.trim()) {
      throw createApiServiceError('Connect a Heyzine API key before managing publications.');
    }
    return { Authorization: `Bearer ${this.config.token}` };
  }

  private async convert(endpoint: '/rest' | '/async', options: FlipbookConversionOptions) {
    let clientId = options.clientId || this.config.clientId;
    if (!clientId.trim()) {
      throw createApiServiceError('Connect a Heyzine Client ID before converting a document.');
    }
    let response = await api.post<FlipbookConversionResponse>(endpoint, {
      pdf: options.pdfUrl,
      client_id: clientId,
      ...designPayload(options)
    });
    return response.data;
  }

  async createFlipbookSync(options: FlipbookConversionOptions) {
    return this.convert('/rest', options);
  }

  async createFlipbookAsync(options: FlipbookConversionOptions) {
    return this.convert('/async', options);
  }

  async listFlipbooks(search?: string, tags?: string): Promise<FlipbookInfo[]> {
    let response = await api.get<FlipbookInfo[]>('/flipbook-list', {
      headers: this.bearerHeaders(),
      params: pickDefined({ search, tags })
    });
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Heyzine returned an invalid flipbook list.');
    }
    return response.data;
  }

  async getFlipbookDetails(flipbookId: string): Promise<FlipbookDetails> {
    let response = await api.get<FlipbookDetails>('/flipbook-details', {
      headers: this.bearerHeaders(),
      params: { id: flipbookId }
    });
    return response.data;
  }

  async deleteFlipbook(flipbookId: string) {
    let response = await api.post<OperationResult & { msg: string }>(
      '/flipbook-delete',
      { id: flipbookId },
      { headers: this.bearerHeaders() }
    );
    return this.confirmOperation(response.data);
  }

  async updateFlipbookDesign(flipbookId: string, options: FlipbookDesignOptions) {
    let body = designPayload(options);
    if (Object.keys(body).length === 0) {
      throw createApiServiceError('Provide at least one flipbook design setting to update.');
    }
    let response = await api.patch<OperationResult>(
      '/flipbook-design',
      { id: flipbookId, ...body },
      { headers: this.bearerHeaders() }
    );
    return this.confirmOperation(response.data);
  }

  async listBookshelves(): Promise<BookshelfInfo[]> {
    let response = await api.get<BookshelfInfo[]>('/bookshelf-list', {
      headers: this.bearerHeaders()
    });
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Heyzine returned an invalid bookshelf list.');
    }
    return response.data;
  }

  async listBookshelfFlipbooks(bookshelfId: string): Promise<FlipbookInfo[]> {
    let response = await api.get<FlipbookInfo[]>('/bookshelf-flipbooks', {
      headers: this.bearerHeaders(),
      params: { id: bookshelfId }
    });
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Heyzine returned an invalid bookshelf flipbook list.');
    }
    return response.data;
  }

  async addFlipbookToBookshelf(bookshelfId: string, flipbookId: string, position?: number) {
    if (position !== undefined && (!Number.isInteger(position) || position < 0)) {
      throw createApiServiceError('Bookshelf position must be a non-negative whole number.');
    }
    let response = await api.post<OperationResult>(
      '/bookshelf-add',
      pickDefined({ id: bookshelfId, flipbook_id: flipbookId, position }),
      { headers: this.bearerHeaders() }
    );
    return this.confirmOperation(response.data);
  }

  async removeFlipbookFromBookshelf(bookshelfId: string, flipbookId: string) {
    let response = await api.post<OperationResult>(
      '/bookshelf-remove',
      { id: bookshelfId, flipbook_id: flipbookId },
      { headers: this.bearerHeaders() }
    );
    return this.confirmOperation(response.data);
  }

  async updateFlipbookSocial(flipbookId: string, metadata: SocialMetadata) {
    return this.updateSocial('/flipbook-social', flipbookId, metadata);
  }

  async updateBookshelfSocial(bookshelfId: string, metadata: SocialMetadata) {
    return this.updateSocial('/bookshelf-social', bookshelfId, metadata);
  }

  private async updateSocial(endpoint: string, id: string, metadata: SocialMetadata) {
    let fields = pickDefined(metadata);
    if (Object.keys(fields).length === 0) {
      throw createApiServiceError(
        'Provide a social title, description, or thumbnail to update.'
      );
    }
    let response = await api.post<OperationResult>(
      endpoint,
      { id, ...fields },
      { headers: this.bearerHeaders() }
    );
    return this.confirmOperation(response.data);
  }

  async updatePasswordProtection(options: PasswordProtectionOptions) {
    if (options.mode === 'everyone' && !options.password) {
      throw createApiServiceError('A shared password is required when mode is "everyone".');
    }
    let response = await api.post<OperationResult>(
      '/access-setup',
      pickDefined({
        name: options.flipbookId,
        type: options.resourceType,
        mode: options.mode,
        password: options.password,
        text_user: options.usernameLabel,
        text_password: options.passwordLabel
      }),
      { headers: this.bearerHeaders() }
    );
    return this.confirmOperation(response.data);
  }

  async updateAccessList(
    flipbookId: string,
    accessType: string,
    users: AccessListUser[],
    action: 'add' | 'remove' = 'add',
    resourceType?: 'flipbook' | 'bookshelf'
  ) {
    if (users.length === 0) {
      throw createApiServiceError('Provide at least one access-list entry.');
    }
    for (let [index, entry] of users.entries()) {
      let needsUser = !['pass_only', 'otp'].includes(accessType);
      let needsPassword =
        ['pass_only', 'otp'].includes(accessType) ||
        (action === 'add' && ['user_pass', 'webhook_code'].includes(accessType));
      if ((needsUser && !entry.user) || (needsPassword && !entry.password)) {
        throw createApiServiceError(
          `Access-list entry ${index + 1} requires ${needsUser ? 'a user or email' : 'a password'}${needsUser && needsPassword ? ' and a password' : ''} for ${action} with access type "${accessType}".`
        );
      }
    }
    for (let [index, entry] of users.entries()) {
      try {
        let response = await api.post<OperationResult>(
          action === 'add' ? '/access-add' : '/access-remove',
          pickDefined({
            name: flipbookId,
            type: resourceType,
            access_type: action === 'add' ? accessType : undefined,
            user: entry.user,
            password: entry.password
          }),
          { headers: this.bearerHeaders() }
        );
        this.confirmOperation(response.data);
      } catch (error) {
        let failure = buildApiServiceError(error, {
          providerLabel: 'Heyzine',
          reason: 'heyzine_partial_access_update',
          operation: `access-list entry ${index + 1}`
        });
        failure.data.baggage = {
          ...failure.data.baggage,
          completedEntries: index,
          failedEntry: index + 1
        };
        throw failure;
      }
    }
  }

  async getOEmbed(url: string, maxWidth?: number, maxHeight?: number): Promise<OEmbedData> {
    let response = await api.get<OEmbedData>('/oembed', {
      params: pickDefined({ url, format: 'json', maxwidth: maxWidth, maxheight: maxHeight })
    });
    return response.data;
  }

  private confirmOperation<T extends OperationResult>(data: T) {
    if (!isApiErrorRecord(data) || data.success !== true) {
      throw createApiServiceError('Heyzine did not confirm the requested update.');
    }
    return data;
  }
}
