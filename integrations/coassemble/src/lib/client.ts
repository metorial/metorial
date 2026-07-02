import { createAxios } from 'slates';

let BASE_URL = 'https://api.coassemble.com/api/v1/headless';

export interface ClientConfig {
  token: string;
  userId?: string;
  authScheme: 'bearer' | 'coassemble';
}

export class Client {
  private http;

  constructor(config: ClientConfig) {
    let authHeader =
      config.authScheme === 'coassemble'
        ? `COASSEMBLE-V1-SHA256 UserId=${config.userId}, UserToken=${config.token}`
        : `Bearer ${config.token}`;

    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
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
    let response = await this.http.get('/courses', { params });
    return response.data;
  }

  async getCourse(courseId: string) {
    let response = await this.http.get(`/courses/${courseId}`);
    return response.data;
  }

  async deleteCourse(courseId: string) {
    let response = await this.http.delete(`/course/${courseId}`);
    return response.data;
  }

  async restoreCourse(courseId: string) {
    let response = await this.http.post(`/course/${courseId}/restore`);
    return response.data;
  }

  async duplicateCourse(
    courseId: string,
    body?: {
      identifier?: string;
      clientIdentifier?: string;
    }
  ) {
    let response = await this.http.post(`/course/${courseId}/duplicate`, body ?? {});
    return response.data;
  }

  async publishCourse(courseId: string) {
    let response = await this.http.post(`/course/${courseId}/publish`);
    return response.data;
  }

  async revertCourse(courseId: string) {
    let response = await this.http.post(`/course/${courseId}/revert`);
    return response.data;
  }

  // ─── Signed URLs ───────────────────────────────────────────

  async getSignedUrl(body: {
    action: 'view' | 'edit';
    id?: string;
    identifier: string;
    clientIdentifier?: string;
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
    let response = await this.http.post('/course/url', body);
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
    let response = await this.http.post('/course/generate', body);
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
    let response = await this.http.get(`/course/scorm/${courseId}`, { params });
    return response.data;
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
    let response = await this.http.get('/trackings', { params });
    return response.data;
  }

  async getTracking(trackingId: string) {
    let response = await this.http.get(`/tracking/${trackingId}`);
    return response.data;
  }

  async deleteTracking(courseId: string, identifier: string) {
    let response = await this.http.delete('/tracking', {
      data: { id: courseId, identifier }
    });
    return response.data;
  }

  // ─── Clients ───────────────────────────────────────────────

  async listClients(params?: { length?: number; page?: number }) {
    let response = await this.http.get('/clients', { params });
    return response.data;
  }

  async updateClient(
    clientIdentifier: string,
    body: {
      metadata?: Record<string, unknown>;
    }
  ) {
    let response = await this.http.put(`/client/${clientIdentifier}`, body);
    return response.data;
  }

  async deleteClient(clientIdentifier: string) {
    let response = await this.http.delete(`/client/${clientIdentifier}`);
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────

  async listUsers(params?: { length?: number; page?: number; clientIdentifier?: string }) {
    let response = await this.http.get('/users', { params });
    return response.data;
  }

  async updateUser(
    identifier: string,
    body: {
      clientIdentifier?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    let response = await this.http.put(`/user/${identifier}`, body);
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
    let response = await this.http.delete(`/user/${identifier}`, { params });
    return response.data;
  }
}
