import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

const legacyEventDateSchema = z.object({
  date_id: z.number(),
  datetime: z.string(),
  status: z.string().optional(),
  timestamp: z.number().optional(),
  zone: z.string().optional(),
  timezone: z.string().optional()
});

export const eventDateSchema = z.object({
  date_id: z.number(),
  status: z.string().optional(),
  datetime: z.string().nullable().optional(),
  timestamp: z.number().nullable().optional(),
  zone: z.string().nullable().optional(),
  timezone: z.string().optional()
});

const eventDateDetailSchema = z.object({
  date_id: z.number(),
  status: z.string(),
  datetime: z.string(),
  timestamp: z.number(),
  zone: z.string()
});

const eventSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  date_id: z.number().optional(),
  timestamp: z.number().optional(),
  zone: z.string().optional(),
  registration_url: z.string().optional(),
  event_dates: z.array(legacyEventDateSchema).optional()
});

const eventDetailSchema = eventSchema.extend({
  type: z.string().optional(),
  next_date_id: z.number().nullable().optional(),
  registrants_stay_registered: z.boolean().optional(),
  dates: z.array(eventDateSchema).optional()
});

const participantSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  attended: z.boolean().optional(),
  custom_fields: z
    .array(z.object({ id: z.string(), name: z.string(), value: z.string() }))
    .optional(),
  joined_at: z.string().optional(),
  left_at: z.string().optional(),
  attendance_minutes: z.number().optional()
});

const pingSchema = z.object({ pong: z.boolean(), sandbox: z.boolean().optional() });
const registerSchema = z.object({ hash: z.string(), join_link: z.string() });

export type DemioEvent = z.infer<typeof eventSchema>;
export type DemioEventDate = z.infer<typeof eventDateSchema>;
export type DemioEventDetail = z.infer<typeof eventDetailSchema>;
export type DemioParticipant = z.infer<typeof participantSchema>;

export interface RegisterInput {
  id?: number;
  name: string;
  email: string;
  date_id?: number;
  ref_url?: string;
  [key: string]: string | number | undefined;
}

export class DemioClient {
  private http;

  constructor(credentials: { token: string; apiSecret: string }) {
    if (!credentials.token.trim() || !credentials.apiSecret.trim()) {
      throw createApiServiceError('A Demio API key and API secret are required.');
    }
    this.http = createAxios({
      baseURL: 'https://my.demio.com/api/v1',
      headers: {
        'Api-Key': credentials.token,
        'Api-Secret': credentials.apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(
    method: 'GET' | 'PUT',
    path: string,
    schema: z.ZodType<T>,
    options: { params?: Record<string, string | boolean>; data?: RegisterInput } = {}
  ): Promise<T> {
    try {
      let response = await this.http.request<unknown>({ method, url: path, ...options });
      let parsed = schema.safeParse(response.data);
      if (!parsed.success) {
        throw createApiServiceError(
          'Demio returned an unexpected response. Try again later.',
          {
            reason: 'demio_invalid_response'
          }
        );
      }
      return parsed.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Demio',
        reason: 'demio_api_error',
        operation: `${method} ${path}`,
        extractResponse: (upstream, helpers) => helpers.getResponseWithBody(upstream),
        nestedKeys: ['messages', 'errors']
      });
    }
  }

  private identifier(value: string, label: string) {
    if (!/^\d+$/.test(value) || !/[1-9]/.test(value)) {
      throw createApiServiceError(`${label} must be a positive numeric Demio ID.`);
    }
    return encodeURIComponent(value);
  }

  async ping() {
    let response = await this.request('GET', '/ping', pingSchema);
    if (!response.pong) {
      throw createApiServiceError(
        'Demio did not validate the API credentials. Reconnect your account.'
      );
    }
    return response;
  }

  async listEvents(params?: { type?: string }) {
    return this.request('GET', '/events', z.array(eventSchema), {
      params: params?.type === undefined ? undefined : { type: params.type }
    });
  }

  async getEvent(eventId: string, active?: boolean) {
    return this.request(
      'GET',
      `/event/${this.identifier(eventId, 'eventId')}`,
      eventDetailSchema,
      { params: active === undefined ? undefined : { active } }
    );
  }

  async getEventSession(eventId: string, dateId: string) {
    return this.request(
      'GET',
      `/event/${this.identifier(eventId, 'eventId')}/date/${this.identifier(dateId, 'dateId')}`,
      eventDateDetailSchema
    );
  }

  async register(data: RegisterInput) {
    return this.request('PUT', '/event/register', registerSchema, { data });
  }

  async getEventDateParticipants(dateId: string, status?: string) {
    let response = await this.request(
      'GET',
      `/report/${this.identifier(dateId, 'dateId')}/participants`,
      z.object({ participants: z.array(participantSchema) }),
      { params: status === undefined ? undefined : { status } }
    );
    return response.participants;
  }
}
