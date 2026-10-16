import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export type MemberVaultProduct = Record<string, unknown>;

export interface AddUserParams {
  email: string;
  firstName?: string;
  lastName?: string;
  productId: string;
}

export interface RemoveUserParams {
  email: string;
  productId: string;
}

export interface DeleteUserParams {
  email: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private legacyAxios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string; subdomain: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Enter your MemberVault API key.', {
        reason: 'missing_api_key'
      });
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(config.subdomain)) {
      throw createApiServiceError(
        'Enter only your MemberVault account subdomain, without a URL or domain suffix.',
        { reason: 'invalid_subdomain' }
      );
    }
    this.token = config.token;
    this.legacyAxios = createAxios({
      baseURL: `https://${config.subdomain}.mvsite.app/api`
    });
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.mvsite.app/api`,
      timeout: 30_000,
      maxRedirects: 0
    });
  }

  private async request(
    endpoint: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    let data = await requestAxiosData<unknown>(
      endpoint,
      () => this.axios.get(`/${endpoint}`, { params: { ...params, apikey: this.token } }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'MemberVault',
          reason: 'api_request_failed',
          operation,
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          nestedKeys: ['errors', 'error']
        })
    );

    if (
      data === false ||
      (isApiErrorRecord(data) &&
        (data.success === false ||
          (data.error !== undefined &&
            data.error !== null &&
            data.error !== false &&
            data.error !== 0 &&
            data.error !== '') ||
          (Array.isArray(data.errors) && data.errors.length > 0)))
    ) {
      throw buildApiServiceError(
        { response: { data } },
        {
          providerLabel: 'MemberVault',
          reason: 'api_request_failed',
          operation: endpoint,
          nestedKeys: ['errors', 'error'],
          fallbackMessage: 'The provider reported that the operation failed.'
        }
      );
    }

    return data;
  }

  async listProducts(): Promise<MemberVaultProduct[]> {
    return requestAxiosData<MemberVaultProduct[]>(
      'courses',
      () => this.legacyAxios.get('/courses', { params: { apikey: this.token } }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'MemberVault',
          reason: 'api_request_failed',
          operation,
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          nestedKeys: ['errors', 'error']
        })
    );
  }

  async getCourses(): Promise<unknown> {
    return this.request('get_courses');
  }

  async addUserToProduct(params: AddUserParams): Promise<unknown> {
    return this.request('add_user', {
      email: params.email,
      course_id: params.productId,
      ...pickDefined({ first_name: params.firstName, last_name: params.lastName })
    });
  }

  async removeUserFromProduct(params: RemoveUserParams): Promise<unknown> {
    return this.request('remove_user', {
      email: params.email,
      course_id: params.productId
    });
  }

  async deleteUser(params: DeleteUserParams): Promise<unknown> {
    return this.request('delete_user', { email: params.email });
  }
}
