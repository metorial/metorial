import { createAxios } from 'slates';

let axiosV3 = createAxios({
  baseURL: 'https://app.satismeter.com/api/v3'
});

let axiosLegacy = createAxios({
  baseURL: 'https://app.satismeter.com/api'
});

let axiosV2 = createAxios({
  baseURL: 'https://app.satismeter.com/api/v2'
});

export interface ListResponsesParams {
  projectId: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  pageCursor?: string;
  pageSize?: number;
}

export interface SurveyStatisticsParams {
  projectId: string;
  campaignId: string;
  startDate?: string;
  endDate?: string;
}

export interface UpsertUserParams {
  userId: string;
  traits?: Record<string, unknown>;
  writeKey: string;
}

export interface TrackEventParams {
  userId: string;
  event: string;
  projectId: string;
}

export interface InsertResponseParams {
  writeKey: string;
  campaignId: string;
  userId?: string;
  anonymousId?: string;
  answers: Array<{ questionId: string; value: string | number }>;
  method?: 'In-App' | 'Mobile' | 'Email';
  traits?: Record<string, unknown>;
}

export interface ListUsersParams {
  projectId: string;
  userId?: string;
}

export class SatisMeterClient {
  constructor(
    private token: string,
    private writeKey: string
  ) {}

  async getProject(projectId: string) {
    let response = await axiosV3.get(`/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }

  async listSurveys(projectId: string) {
    let response = await axiosV3.get(`/projects/${projectId}/campaigns`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }

  async getSurvey(projectId: string, campaignId: string) {
    let response = await axiosV3.get(`/projects/${projectId}/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }

  async listResponses(params: ListResponsesParams) {
    let { projectId, campaignId, startDate, endDate, pageCursor, pageSize } = params;

    let queryParams: Record<string, string> = {};
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;
    if (pageCursor) queryParams.pageCursor = pageCursor;
    if (pageSize) queryParams.pageSize = String(pageSize);

    let path = campaignId
      ? `/projects/${projectId}/campaigns/${campaignId}/responses`
      : `/projects/${projectId}/responses`;

    let response = await axiosV3.get(path, {
      headers: { Authorization: `Bearer ${this.token}` },
      params: queryParams
    });
    return response.data;
  }

  async getSurveyStatistics(params: SurveyStatisticsParams) {
    let { projectId, campaignId, startDate, endDate } = params;

    let queryParams: Record<string, string> = {};
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;

    let response = await axiosV3.get(
      `/projects/${projectId}/campaigns/${campaignId}/statistics`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        params: queryParams
      }
    );
    return response.data;
  }

  async listUsers(params: ListUsersParams) {
    let queryParams: Record<string, string> = {
      project: params.projectId
    };
    if (params.userId) queryParams.userId = params.userId;

    let response = await axiosLegacy.get('/users', {
      headers: { Authorization: `Bearer ${this.token}` },
      params: queryParams
    });
    return response.data;
  }

  async upsertUser(params: UpsertUserParams) {
    let response = await axiosLegacy.post(
      '/users',
      {
        userId: params.userId,
        traits: params.traits,
        writeKey: params.writeKey
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteUser(userInternalId: string) {
    let response = await axiosLegacy.delete(`/users/${userInternalId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }

  async trackEvent(params: TrackEventParams) {
    let response = await axiosLegacy.post(
      '/users',
      {
        type: 'track',
        userId: params.userId,
        event: params.event,
        project: params.projectId
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async insertResponse(params: InsertResponseParams) {
    let body: Record<string, unknown> = {
      writeKey: params.writeKey,
      campaign: params.campaignId,
      answers: params.answers.map(a => ({ id: a.questionId, value: a.value }))
    };

    if (params.userId) body.userId = params.userId;
    if (params.anonymousId) body.anonymousId = params.anonymousId;
    if (params.method) body.method = params.method;
    if (params.traits) body.traits = params.traits;

    let response = await axiosLegacy.post('/responses', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getUnsubscribedEmails(projectId: string) {
    let response = await axiosV2.get(`/project-unsubscribes/${projectId}`, {
      auth: { username: this.token, password: '' }
    });
    return response.data;
  }

  async updateUnsubscribedEmails(projectId: string, emails: string[]) {
    let response = await axiosV2.patch(
      `/project-unsubscribes/${projectId}`,
      {
        data: {
          id: projectId,
          type: 'project-unsubscribes',
          attributes: {
            emails
          }
        }
      },
      {
        auth: { username: this.token, password: '' },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async exportResponses(params: {
    projectId: string;
    format: 'json' | 'csv';
    startDate?: string;
    endDate?: string;
  }) {
    let queryParams: Record<string, string> = {
      project: params.projectId,
      format: params.format
    };
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;

    let response = await axiosLegacy.get('/responses', {
      auth: { username: this.token, password: '' },
      params: queryParams
    });
    return response.data;
  }
}
