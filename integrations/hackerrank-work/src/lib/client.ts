import { createAxios } from 'slates';

let BASE_URL = 'https://www.hackerrank.com/x/api/v3';

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page_total: number;
  offset: number;
  total: number;
  previous?: string;
  next?: string;
  first?: string;
  last?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      auth: {
        username: params.token,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- Tests ----

  async listTests(params?: PaginationParams & { fields?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>('/tests', {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.fields ? { fields: params.fields } : {})
      }
    });
    return response.data;
  }

  async getTest(testId: string) {
    let response = await this.axios.get<any>(`/tests/${testId}`);
    return response.data;
  }

  async createTest(data: {
    name: string;
    duration?: number;
    instructions?: string;
    languages?: string[];
    experience?: string;
    candidate_tab_switch?: boolean;
    custom_acknowledge_text?: string;
    cutoff_score?: number;
    master_password?: string;
    hide_compile_test?: boolean;
    tags?: string[];
  }) {
    let response = await this.axios.post<any>('/tests', data);
    return response.data;
  }

  async updateTest(testId: string, data: Record<string, any>) {
    let response = await this.axios.put<any>(`/tests/${testId}`, data);
    return response.data;
  }

  async deleteTest(testId: string) {
    let response = await this.axios.delete<any>(`/tests/${testId}`);
    return response.data;
  }

  async archiveTest(testId: string) {
    let response = await this.axios.post<any>(`/tests/${testId}/archive`);
    return response.data;
  }

  // ---- Candidates ----

  async listCandidates(testId: string, params?: PaginationParams & { fields?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>(
      `/tests/${testId}/candidates`,
      {
        params: {
          limit: params?.limit ?? 100,
          offset: params?.offset ?? 0,
          ...(params?.fields ? { fields: params.fields } : {})
        }
      }
    );
    return response.data;
  }

  async getCandidate(testId: string, candidateId: string) {
    let response = await this.axios.get<any>(`/tests/${testId}/candidates/${candidateId}`);
    return response.data;
  }

  async inviteCandidate(
    testId: string,
    data: {
      email: string;
      full_name?: string;
      force?: boolean;
      send_email?: boolean;
      tags?: string[];
      accommodate?: Record<string, any>;
    }
  ) {
    let response = await this.axios.post<any>(`/tests/${testId}/candidates`, data);
    return response.data;
  }

  async updateCandidate(testId: string, candidateId: string, data: Record<string, any>) {
    let response = await this.axios.put<any>(
      `/tests/${testId}/candidates/${candidateId}`,
      data
    );
    return response.data;
  }

  async getCandidateReportUrl(testId: string, candidateId: string) {
    let response = await this.axios.get<any>(
      `/tests/${testId}/candidates/${candidateId}/pdf`,
      {
        params: { format: 'url' }
      }
    );
    return response.data;
  }

  // ---- Interviews ----

  async listInterviews(params?: PaginationParams & { fields?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>('/interviews', {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.fields ? { fields: params.fields } : {})
      }
    });
    return response.data;
  }

  async getInterview(interviewId: string) {
    let response = await this.axios.get<any>(`/interviews/${interviewId}`);
    return response.data;
  }

  async createInterview(data: {
    title?: string;
    candidate?: string;
    interviewers?: string[];
    send_email?: boolean;
    interview_template_id?: string;
    timezone?: string;
    interview_metadata?: Record<string, any>;
    notes?: string;
    from?: string;
    to?: string;
  }) {
    let response = await this.axios.post<any>('/interviews', data);
    return response.data;
  }

  async updateInterview(interviewId: string, data: Record<string, any>) {
    let response = await this.axios.put<any>(`/interviews/${interviewId}`, data);
    return response.data;
  }

  async deleteInterview(interviewId: string) {
    let response = await this.axios.delete<any>(`/interviews/${interviewId}`);
    return response.data;
  }

  async getInterviewTranscript(interviewId: string) {
    let response = await this.axios.get<any>(`/interviews/${interviewId}/transcript`);
    return response.data;
  }

  // ---- Users ----

  async listUsers(params?: PaginationParams & { fields?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>('/users', {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.fields ? { fields: params.fields } : {})
      }
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get<any>(`/users/${userId}`);
    return response.data;
  }

  async createUser(data: {
    email: string;
    firstname?: string;
    lastname?: string;
    role?: string;
    country?: string;
    phone?: string;
    timezone?: string;
  }) {
    let response = await this.axios.post<any>('/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: Record<string, any>) {
    let response = await this.axios.put<any>(`/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete<any>(`/users/${userId}`);
    return response.data;
  }

  async searchUsers(query: string, params?: PaginationParams) {
    let response = await this.axios.get<PaginatedResponse<any>>('/users/search', {
      params: {
        search: query,
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0
      }
    });
    return response.data;
  }

  // ---- Teams ----

  async listTeams(params?: PaginationParams & { fields?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>('/teams', {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.fields ? { fields: params.fields } : {})
      }
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.get<any>(`/teams/${teamId}`);
    return response.data;
  }

  async createTeam(data: { name: string; description?: string }) {
    let response = await this.axios.post<any>('/teams', data);
    return response.data;
  }

  async updateTeam(teamId: string, data: Record<string, any>) {
    let response = await this.axios.put<any>(`/teams/${teamId}`, data);
    return response.data;
  }

  async deleteTeam(teamId: string) {
    let response = await this.axios.delete<any>(`/teams/${teamId}`);
    return response.data;
  }

  async listTeamMembers(teamId: string, params?: PaginationParams) {
    let response = await this.axios.get<PaginatedResponse<any>>(`/teams/${teamId}/users`, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0
      }
    });
    return response.data;
  }

  // ---- Questions ----

  async listQuestions(params?: PaginationParams & { fields?: string; type?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>('/questions', {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.fields ? { fields: params.fields } : {}),
        ...(params?.type ? { type: params.type } : {})
      }
    });
    return response.data;
  }

  async getQuestion(questionId: string) {
    let response = await this.axios.get<any>(`/questions/${questionId}`);
    return response.data;
  }

  async createQuestion(data: {
    name: string;
    type: string;
    description?: string;
    difficulty?: string;
    tags?: string[];
    [key: string]: any;
  }) {
    let response = await this.axios.post<any>('/questions', data);
    return response.data;
  }

  async updateQuestion(questionId: string, data: Record<string, any>) {
    let response = await this.axios.put<any>(`/questions/${questionId}`, data);
    return response.data;
  }

  // ---- Audit Logs ----

  async listAuditLogs(params?: PaginationParams & { userId?: string }) {
    let response = await this.axios.get<PaginatedResponse<any>>('/audit_log', {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        ...(params?.userId ? { user_id: params.userId } : {})
      }
    });
    return response.data;
  }
}
