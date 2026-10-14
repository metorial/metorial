import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface CreateLinkParams {
  destinationUrl: string;
  domain: string;
  slug?: string;
  tags?: { name: string; id?: string }[];
}

export interface UpdateLinkParams {
  destinationUrl?: string;
  tags?: { name: string; id?: string }[];
}

export interface TagResponse {
  id?: string;
  name: string;
}

export interface DomainResponse {
  id: string;
  name: string;
}

export interface LinkResponse {
  id: string;
  createdAt: string;
  destinationUrl: string;
  title?: string;
  slug: string;
  domain: DomainResponse;
  shortUrl: string;
  clickCount?: number;
  tags: TagResponse[];
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('Connect Short Menu with a valid API key.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.shortmenu.com',
      timeout: 30_000,
      authHeader: { name: 'x-api-key', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Short Menu',
          reason: 'short_menu_api_error',
          detailKeys: ['errorDescription', 'message', 'error', 'code'],
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
          extractUpstreamCode: (_failure, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        })
    });
  }

  private linkPath(linkId: string) {
    if (!linkId.trim()) {
      throw createApiServiceError('Provide a link ID returned by create_link or update_link.');
    }
    return `/links/${encodeURIComponent(linkId)}`;
  }

  private validateDestinationUrl(destinationUrl: string) {
    try {
      new URL(destinationUrl);
    } catch {
      throw createApiServiceError(
        'Provide a valid destination URL including its scheme, such as https://example.com.'
      );
    }
  }

  async createLink(params: CreateLinkParams): Promise<LinkResponse> {
    this.validateDestinationUrl(params.destinationUrl);
    if (!params.domain.trim()) {
      throw createApiServiceError('Provide a short-link domain name, such as shm.to.');
    }

    let response = await this.axios.post<LinkResponse>(
      '/links',
      pickDefined({
        destinationUrl: params.destinationUrl,
        domain: params.domain.trim(),
        slug: params.slug,
        tags: params.tags ?? []
      })
    );
    return response.data;
  }

  async updateLink(linkId: string, params: UpdateLinkParams): Promise<LinkResponse> {
    if (params.destinationUrl === undefined && params.tags === undefined) {
      throw createApiServiceError(
        'Provide a destination URL or tags to update the short link.'
      );
    }
    if (params.destinationUrl !== undefined) {
      this.validateDestinationUrl(params.destinationUrl);
    }

    let response = await this.axios.put<LinkResponse>(
      this.linkPath(linkId),
      pickDefined(params)
    );
    return response.data;
  }

  async deleteLink(linkId: string): Promise<void> {
    await this.axios.delete(this.linkPath(linkId));
  }
}
