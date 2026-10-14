import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  setIfDefined
} from 'slates';

let BASE_URL = 'https://api.coassemble.com/api/v1/headless';

export interface ClientConfig {
  token: string;
  userId?: string;
  authScheme: 'bearer' | 'coassemble' | 'workspace';
}

export let getListItems = (result: unknown): Record<string, unknown>[] => {
  let items = Array.isArray(result)
    ? result
    : isApiErrorRecord(result) && Array.isArray(result.data)
      ? result.data
      : undefined;

  if (!items?.every(isApiErrorRecord)) {
    throw createApiServiceError('Coassemble returned an unexpected list response.');
  }

  return items;
};

export class Client {
  private http;
  private authHeader: string;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError('Reconnect Coassemble with a non-empty API credential.');
    }
    if (config.authScheme === 'coassemble' && !config.userId?.trim()) {
      throw createApiServiceError('Reconnect Coassemble with the user ID for your API key.');
    }

    this.authHeader =
      config.authScheme === 'workspace'
        ? config.token
        : config.authScheme === 'coassemble'
          ? `COASSEMBLE-V1-SHA256 UserId=${config.userId}, UserToken=${config.token}`
          : `Bearer ${config.token}`;

    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 120_000,
      authHeader: { value: this.authHeader },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Coassemble',
          reason: 'coassemble_api_error',
          extractResponse: (value, helpers) => {
            let response = helpers.getResponse(value);
            if (isApiErrorRecord(value) && isApiErrorRecord(value.data)) {
              let baggage = value.data.baggage;
              if (isApiErrorRecord(baggage) && baggage.response !== undefined) {
                return { ...response, data: baggage.response };
              }
            }
            return response;
          },
          extractUpstreamCode: (value, response) => {
            if (isApiErrorRecord(response?.data) && isApiErrorRecord(response.data.error)) {
              let code = response.data.error.code;
              if (typeof code === 'string') return code;
            }
            if (isApiErrorRecord(value) && isApiErrorRecord(value.data)) {
              let upstream = value.data.upstream;
              if (isApiErrorRecord(upstream) && typeof upstream.code === 'string') {
                return upstream.code;
              }
            }
            return undefined;
          }
        })
    });
  }

  private validatePagination(params?: { page?: number; length?: number }) {
    if (params?.page !== undefined && (!Number.isInteger(params.page) || params.page < 0)) {
      throw createApiServiceError('page must be a whole number starting at 0.');
    }
    if (
      params?.length !== undefined &&
      (!Number.isInteger(params.length) || params.length < 1)
    ) {
      throw createApiServiceError('length must be a positive whole number.');
    }
  }

  // ─── Courses ───────────────────────────────────────────────

  async listCourses(params?: {
    identifier?: string;
    clientIdentifier?: string;
    title?: string;
    length?: number;
    page?: number;
    deleted?: boolean;
  }) {
    this.validatePagination(params);
    let response = await this.http.get('/courses', { params: pickDefined(params ?? {}) });
    return response.data;
  }

  async getCourse(
    courseId: string,
    params?: { identifier?: string; clientIdentifier?: string }
  ) {
    let response = await this.http.get(`/courses/${encodeURIComponent(courseId)}`, {
      params: pickDefined(params ?? {})
    });
    return response.data;
  }

  async getCourseContent(
    courseId: string,
    params?: { identifier?: string; clientIdentifier?: string }
  ) {
    let response = await this.http.get(`/course/content/${encodeURIComponent(courseId)}`, {
      params: pickDefined(params ?? {})
    });
    return response.data;
  }

  async deleteCourse(courseId: string) {
    let response = await this.http.delete(`/course/${encodeURIComponent(courseId)}`);
    return response.data;
  }

  async restoreCourse(courseId: string) {
    let response = await this.http.post(`/course/${encodeURIComponent(courseId)}/restore`);
    return response.data;
  }

  async duplicateCourse(
    courseId: string,
    body?: {
      identifier?: string;
      clientIdentifier?: string;
    }
  ) {
    let response = await this.http.post(
      `/course/${encodeURIComponent(courseId)}/duplicate`,
      pickDefined(body ?? {})
    );
    return response.data;
  }

  async publishCourse(courseId: string) {
    let response = await this.http.post(`/course/${encodeURIComponent(courseId)}/publish`);
    return response.data;
  }

  async revertCourse(courseId: string) {
    let response = await this.http.post(`/course/${encodeURIComponent(courseId)}/revert`);
    return response.data;
  }

  // ─── Signed URLs ───────────────────────────────────────────

  async getSignedUrl(body: {
    action: 'view' | 'edit';
    id?: string;
    identifier: string;
    clientIdentifier?: string;
    themeId?: number;
    name?: string;
    avatar?: string;
    options?: {
      flow?: string;
      back?: string;
      color?: string;
      translations?: boolean;
      language?: string;
      googleDrive?: boolean;
      oneDrive?: boolean;
      loom?: boolean;
      feedback?: boolean;
      publishing?: boolean;
      narrations?: boolean;
      ai?: boolean;
    };
  }) {
    if (body.action === 'view' && !body.id?.trim()) {
      throw createApiServiceError('courseId is required to generate a course view URL.');
    }
    let response = await this.http.post('/course/url', pickDefined(body));
    return response.data;
  }

  // ─── AI Generation ─────────────────────────────────────────

  async generateCourse(body: {
    prompt: string;
    audience?: string;
    familiarity?: string;
    tone?: string;
    screenCount?: number;
    identifier: string;
    clientIdentifier?: string;
  }) {
    if (
      body.screenCount !== undefined &&
      (!Number.isInteger(body.screenCount) || body.screenCount < 1)
    ) {
      throw createApiServiceError('screenCount must be a positive whole number.');
    }
    let response = await this.http.post('/generate/course', {
      ...pickDefined(body),
      audience: body.audience ?? 'general audience',
      familiarity: body.familiarity ?? 'beginner',
      tone: body.tone ?? 'professional',
      screenCount: body.screenCount ?? 6
    });
    return response.data;
  }

  // ─── SCORM Export ──────────────────────────────────────────

  async exportScorm(
    courseId: string,
    params?: {
      type?: string;
      version?: string;
    }
  ) {
    let response = await this.http.get(`/course/scorm/${encodeURIComponent(courseId)}`, {
      params: pickDefined(params ?? {})
    });
    return response.data;
  }

  getScormDownload(courseId: string, params?: { type?: string; version?: string }) {
    let query: Record<string, string> = {};
    setIfDefined(query, 'type', params?.type);
    setIfDefined(query, 'version', params?.version);
    return {
      url: `${BASE_URL}/course/scorm/${encodeURIComponent(courseId)}`,
      headers: { Authorization: this.authHeader },
      query
    };
  }

  // ─── Tracking ──────────────────────────────────────────────

  async listTrackings(params: {
    id: number;
    identifier?: string;
    clientIdentifier?: string;
    start?: string;
    end?: string;
    completed?: boolean;
    page?: number;
    length?: number;
  }) {
    this.validatePagination(params);
    if (!Number.isInteger(params.id) || params.id < 1) {
      throw createApiServiceError('courseId must be a positive whole number.');
    }
    let response = await this.http.get('/trackings', { params: pickDefined(params) });
    return response.data;
  }

  async getTracking(trackingId: string) {
    let response = await this.http.get(`/tracking/${encodeURIComponent(trackingId)}`);
    return response.data;
  }

  async deleteTracking(courseId: string, identifier: string, clientIdentifier?: string) {
    let id = Number(courseId);
    if (!courseId.trim() || !Number.isInteger(id) || id < 1) {
      throw createApiServiceError('courseId must contain a positive whole-number course ID.');
    }
    let response = await this.http.delete('/tracking', {
      data: pickDefined({ id, identifier, clientIdentifier })
    });
    return response.data;
  }

  // ─── Clients ───────────────────────────────────────────────

  async listClients(params?: { length?: number; page?: number }) {
    this.validatePagination(params);
    let response = await this.http.get('/clients', { params: pickDefined(params ?? {}) });
    return response.data;
  }

  async getClient(clientIdentifier: string) {
    let response = await this.http.get(`/client/${encodeURIComponent(clientIdentifier)}`);
    return response.data;
  }

  async updateClient(
    clientIdentifier: string,
    body: {
      metadata?: Record<string, unknown>;
    }
  ) {
    let response = await this.http.put(
      `/client/${encodeURIComponent(clientIdentifier)}`,
      pickDefined(body)
    );
    return response.data;
  }

  async deleteClient(clientIdentifier: string) {
    let response = await this.http.delete(`/client/${encodeURIComponent(clientIdentifier)}`);
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────

  async listUsers(params?: { length?: number; page?: number; clientIdentifier?: string }) {
    this.validatePagination(params);
    let response = await this.http.get('/users', { params: pickDefined(params ?? {}) });
    return response.data;
  }

  async getUser(identifier: string) {
    let response = await this.http.get(`/user/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async updateUser(
    identifier: string,
    body: {
      clientIdentifier?: string;
      metadata?: Record<string, unknown>;
      name?: string;
      avatar?: string;
    }
  ) {
    let response = await this.http.put(
      `/user/${encodeURIComponent(identifier)}`,
      pickDefined(body)
    );
    return response.data;
  }

  async deleteUser(
    identifier: string,
    params: {
      action: 'reallocate' | 'delete' | 'ignore';
      reallocateTo?: string;
      clientIdentifier?: string;
    }
  ) {
    if (params.action === 'reallocate' && !params.reallocateTo?.trim()) {
      throw createApiServiceError('reallocateTo is required when courseAction is reallocate.');
    }
    let response = await this.http.delete(`/user/${encodeURIComponent(identifier)}`, {
      params: pickDefined(params)
    });
    return response.data;
  }
}
