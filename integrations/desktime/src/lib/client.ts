import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://desktime.com/api/v2/json'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private async get<T = any>(
    path: string,
    params?: Record<string, string | undefined>
  ): Promise<T> {
    let filteredParams: Record<string, string> = { apiKey: this.token };
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          filteredParams[key] = value;
        }
      }
    }
    let response = await http.get(path, { params: filteredParams });
    return response.data;
  }

  private async post<T = any>(
    path: string,
    params?: Record<string, string | undefined>
  ): Promise<T> {
    let filteredParams: Record<string, string> = { apiKey: this.token };
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          filteredParams[key] = value;
        }
      }
    }
    let response = await http.post(path, null, { params: filteredParams });
    return response.data;
  }

  async getCompany(): Promise<any> {
    return this.get('/company');
  }

  async getEmployee(params?: { employeeId?: string; date?: string }): Promise<any> {
    return this.get('/employee', {
      id: params?.employeeId,
      date: params?.date
    });
  }

  async getEmployeeByEmail(email: string, date?: string): Promise<any> {
    return this.get('/employee', {
      email,
      date
    });
  }

  async getEmployees(params?: { date?: string; period?: string }): Promise<any> {
    return this.get('/employees', {
      date: params?.date,
      period: params?.period
    });
  }

  async createProject(project: string, task?: string): Promise<any> {
    return this.post('/create-project', {
      project,
      task
    });
  }

  async startTracking(project: string, task?: string): Promise<any> {
    return this.get('/start-project', {
      project,
      task
    });
  }

  async stopTracking(project: string, task?: string): Promise<any> {
    return this.get('/stop-project', {
      project,
      task
    });
  }

  async ping(): Promise<any> {
    return this.get('/ping');
  }
}
