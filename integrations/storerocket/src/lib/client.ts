import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface LocationUpdateParams {
  projectId: string;
  locationId: string;
  phone?: string | null;
  name?: string;
  city?: string;
  visible?: boolean;
  hours?: Partial<
    Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string | null>
  > | null;
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('A StoreRocket API token is required.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://storerocket.io/api/v2',
      timeout: 30_000,
      authHeader: { value: `Bearer ${token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'StoreRocket',
          reason: 'storerocket_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          extractMessage: (input, helpers) => {
            let body = helpers.getResponseWithBody(input)?.data;
            let details: string[] = [];
            helpers.collectDetails(body, details);
            if (helpers.isRecord(body) && helpers.isRecord(body.errors)) {
              for (let messages of Object.values(body.errors)) {
                helpers.collectDetails(messages, details);
              }
            }
            return details.length ? details.join(' - ') : undefined;
          }
        })
    });
  }

  async getUserInfo(): Promise<unknown> {
    let response = await this.http.get<unknown>('/user');
    return response.data;
  }

  async getUsers(params?: { limit?: number; offset?: number }): Promise<unknown> {
    let response = await this.http.get<unknown>('/users', { params });
    return response.data;
  }

  async getProjects(): Promise<unknown> {
    let response = await this.http.get<unknown>('/projects');
    return response.data;
  }

  async getProjectLocations(projectId: string): Promise<unknown> {
    let id = projectId.trim();
    if (!id) {
      throw createApiServiceError('Provide a non-empty projectId from list_projects.');
    }
    let response = await this.http.get<unknown>(
      `/projects/${encodeURIComponent(id)}/locations`
    );
    return response.data;
  }

  async updateLocation(params: LocationUpdateParams): Promise<unknown> {
    let projectId = params.projectId.trim();
    let locationId = params.locationId.trim();
    if (!projectId || !locationId) {
      throw createApiServiceError(
        'Provide a projectId from list_projects and a locationId from list_project_locations.'
      );
    }
    for (let key of ['name', 'city'] as const) {
      let value = params[key];
      if (value !== undefined && (!value.trim() || value.length > 255)) {
        throw createApiServiceError(`If supplied, ${key} must contain 1 to 255 characters.`);
      }
    }
    let body = pickDefined({
      phone: params.phone,
      name: params.name,
      city: params.city,
      visible: params.visible,
      hours: params.hours
    });
    if (!Object.keys(body).length) {
      throw createApiServiceError('Provide at least one location field to update.');
    }
    let response = await this.http.patch<unknown>(
      `/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(locationId)}`,
      body
    );
    return response.data;
  }

  async getLocations(params?: {
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
    offset?: number;
  }): Promise<unknown> {
    let response = await this.http.get<unknown>('/locations', {
      params: pickDefined({
        query: params?.query,
        lat: params?.lat,
        lng: params?.lng,
        radius: params?.radius,
        limit: params?.limit,
        offset: params?.offset
      })
    });
    return response.data;
  }

  async ping(): Promise<unknown> {
    let response = await this.http.get<unknown>('/ping');
    return response.data;
  }
}
