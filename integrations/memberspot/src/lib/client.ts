import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://api.memberspot.de/v1';

export interface ListUsersParams {
  lastLoadedId?: string;
  pageLength?: number;
  offerId?: string;
  courseId?: string;
  active?: boolean;
}

export interface GrantAccessParams {
  firstname: string;
  lastname: string;
  email: string;
  offerId: string;
  orderId: string;
}

export interface SetOfferStateParams {
  email: string;
  offerId: string;
  active?: boolean;
}

export interface SetOrderStateParams {
  email: string;
  orderId: string;
  active?: boolean;
}

export interface SetCustomPropertiesParams {
  email: string;
  properties: Array<{ propertyId: string; value: string }>;
}

export interface EnableChapterAccessParams {
  email: string;
  courseId: string;
  chapterId: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Memberspot API key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Memberspot',
          reason: 'memberspot_api_error'
        }),
      headers: {
        'X-API-KEY': config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async getSchool() {
    let response = await this.axios.get('/api-auth', { baseURL: 'https://api.memberspot.de' });
    return response.data;
  }

  async listUsers(params?: ListUsersParams) {
    validatePageLength(params?.pageLength);
    let response = await this.axios.get('/users/list', {
      params: {
        lastLoadedId: params?.lastLoadedId,
        pageLength: params?.pageLength,
        offerId: params?.offerId,
        courseId: params?.courseId,
        active: params?.active
      }
    });
    return response.data;
  }

  async findUserByEmail(email: string) {
    let response = await this.axios.get(`/users/find-by-mail/${encodeURIComponent(email)}`);
    return response.data;
  }

  async grantAccess(params: GrantAccessParams) {
    let response = await this.axios.post('/users/grant-user-offer-by-mail', {
      firstname: params.firstname,
      name: params.lastname,
      email: params.email,
      grantOffer: params.offerId,
      orderId: params.orderId
    });
    return response.data;
  }

  async setOfferState(params: SetOfferStateParams) {
    let response = await this.axios.post('/users/set-offer-state', {
      email: params.email,
      offerId: params.offerId,
      active: params.active
    });
    return response.data;
  }

  async setOrderState(params: SetOrderStateParams) {
    let response = await this.axios.post('/users/set-order-state', {
      email: params.email,
      orderId: params.orderId,
      active: params.active
    });
    return response.data;
  }

  async deleteUsers(emails: string[]) {
    if (emails.length < 1 || emails.length > 10) {
      throw createApiServiceError('Provide between 1 and 10 email addresses to delete users.');
    }
    let response = await this.axios.delete('/users/delete-users', {
      data: { emails }
    });
    return response.data;
  }

  async setCustomProperties(params: SetCustomPropertiesParams) {
    let response = await this.axios.post('/users/set-custom-user-properties', {
      email: params.email,
      properties: params.properties.map(property => ({
        id: property.propertyId,
        value: property.value
      }))
    });
    return response.data;
  }

  async listOffers() {
    let response = await this.axios.get('/offers');
    return response.data;
  }

  async listCourseProgress(
    email: string,
    params?: { lastLoadedCourseId?: string; pageLength?: number }
  ) {
    validatePageLength(params?.pageLength);
    let response = await this.axios.get(
      `/users/course-progress/list/${encodeURIComponent(email)}`,
      { params }
    );
    return response.data;
  }

  async getCourseProgress(courseId: string, email: string) {
    let response = await this.axios.get(
      `/users/course-progress/${encodeURIComponent(courseId)}/${encodeURIComponent(email)}`
    );
    return response.data;
  }

  async enableChapterAccess(params: EnableChapterAccessParams) {
    let response = await this.axios.post('/chapters/chapter-access/enable', {
      email: params.email,
      courseId: params.courseId,
      chapterId: params.chapterId
    });
    return response.data;
  }

  async getExamResults(
    examId: string,
    params?: { lastLoadedId?: string; pageLength?: number }
  ) {
    validatePageLength(params?.pageLength);
    let response = await this.axios.get(`/exams/${encodeURIComponent(examId)}/results`, {
      params
    });
    return response.data;
  }

  async getLoginToken(userId: string) {
    let response = await this.axios.get(`/users/login-token/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async listCourses() {
    let response = await this.axios.get('/courses');
    return response.data;
  }

  async listExams() {
    let response = await this.axios.get('/exams');
    return response.data;
  }

  async setOfferExpiration(params: {
    uid: string;
    offerId: string;
    expiresAt?: string | null;
  }) {
    if (
      params.expiresAt !== undefined &&
      params.expiresAt !== null &&
      (!/^\d{4}-\d{2}-\d{2}T/.test(params.expiresAt) ||
        !Number.isFinite(Date.parse(params.expiresAt)))
    ) {
      throw createApiServiceError(
        'expiresAt must be an ISO 8601 date-time, or null to remove the expiration.'
      );
    }
    let response = await this.axios.patch('/users/set-offer-expires', params);
    return response.data;
  }

  async listCustomProperties() {
    let response = await this.axios.get('/custom-user-properties/list');
    return response.data;
  }
}

let validatePageLength = (value?: number) => {
  if (value !== undefined && (!Number.isFinite(value) || value < 1 || value > 100)) {
    throw createApiServiceError('Memberspot pageLength must be between 1 and 100.');
  }
};
