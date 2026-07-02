import { createAxios } from 'slates';

export class DemioClient {
  private http;

  constructor(credentials: { token: string; apiSecret: string }) {
    this.http = createAxios({
      baseURL: 'https://my.demio.com/api/v1',
      headers: {
        'Api-Key': credentials.token,
        'Api-Secret': credentials.apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  async ping(): Promise<{ pong: boolean }> {
    let response = await this.http.get('/ping');
    return response.data;
  }

  async listEvents(params?: { type?: string }): Promise<DemioEvent[]> {
    let response = await this.http.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string): Promise<DemioEventDetail> {
    let response = await this.http.get(`/event/${eventId}`);
    return response.data;
  }

  async register(data: RegisterInput): Promise<RegisterResponse> {
    let response = await this.http.put('/event/register', data);
    return response.data;
  }

  async getEventDateParticipants(dateId: string): Promise<DemioParticipant[]> {
    let response = await this.http.get(`/report/${dateId}/participants`);
    return response.data;
  }

  async registerWebhook(url: string, events: string[]): Promise<WebhookRegistrationResponse> {
    let response = await this.http.post('/webhooks', { url, events });
    return response.data;
  }
}

export interface DemioEvent {
  id: number;
  name: string;
  status?: string;
  event_dates?: DemioEventDate[];
}

export interface DemioEventDate {
  date_id: number;
  datetime: string;
  status?: string;
  timezone?: string;
}

export interface DemioEventDetail {
  id: number;
  name: string;
  status?: string;
  type?: string;
  registration_url?: string;
  event_dates?: DemioEventDate[];
}

export interface RegisterInput {
  id?: number;
  name: string;
  email: string;
  date_id?: number;
  ref_url?: string;
  [key: string]: unknown;
}

export interface RegisterResponse {
  hash: string;
  join_link: string;
}

export interface DemioParticipant {
  name?: string;
  email?: string;
  status?: string;
  joined_at?: string;
  left_at?: string;
  attendance_minutes?: number;
  [key: string]: unknown;
}

export interface WebhookRegistrationResponse {
  id?: string;
  [key: string]: unknown;
}
