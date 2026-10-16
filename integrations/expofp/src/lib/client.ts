import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://app.expofp.com/api/v1',
  timeout: 30_000
});

let offlineHttp = createAxios({ baseURL: 'https://app.expofp.com', timeout: 30_000 });

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'ExpoFP',
    reason: 'expofp_api_error',
    operation,
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    detailKeys: ['message', 'Message', 'detail', 'title', 'error', 'code'],
    nestedKeys: ['errors', 'error'],
    extractUpstreamCode: (_failure, response, helpers) => {
      let body = response?.data;
      if (!helpers.isRecord(body)) return undefined;
      let code = body.code ?? body.errorCode;
      if (code === undefined && helpers.isRecord(body.error)) code = body.error.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

let validateIds = (data: object) => {
  for (let [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'id' || (key.endsWith('Id') && key !== 'externalId')) {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw createApiServiceError(`${key} must be a positive whole-number ID.`);
      }
    } else if (Array.isArray(value)) {
      if (key.endsWith('Ids') || key === 'ids' || key === 'categories') {
        for (let id of value) validateIds({ id });
      } else if (key === 'sessions' || key === 'tracks' || key === 'speakers') {
        for (let item of value) validateIds(item);
      }
    }
  }
};

let idSchema = z.object({ id: z.number() });
let categorySchema = z.object({ id: z.number(), name: z.string() });
let metadataSchema = z.record(z.string(), z.string());
let exhibitorFields = {
  id: z.number(),
  name: z.string(),
  externalId: z.string(),
  boothNames: z.array(z.string())
};

// These checks preserve the existing tool output contracts without inventing
// empty strings, zero IDs, false flags, or empty relationships for absent data.
let responseSchemas: Record<string, z.ZodType> = {
  '/list-events': z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      expoKey: z.string(),
      date: z.string(),
      location: z.string()
    })
  ),
  '/list-exhibitors': z.array(z.object(exhibitorFields)),
  '/get-exhibitor': z.object({
    ...exhibitorFields,
    description: z.string(),
    featured: z.boolean(),
    advertised: z.boolean(),
    country: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    phone1: z.string(),
    phone2: z.string(),
    publicEmail: z.string(),
    privateEmail: z.string(),
    website: z.string(),
    contactName: z.string(),
    contactPhone: z.string(),
    adminNotes: z.string(),
    categories: z.array(z.number()),
    tags: z.array(z.string()),
    metadata: metadataSchema,
    facebookUrl: z.string(),
    twitterUrl: z.string(),
    linkedInUrl: z.string(),
    instagramUrl: z.string(),
    youtubeUrl: z.string()
  }),
  '/get-exhibitor-id': idSchema,
  '/add-exhibitor': idSchema,
  '/list-booths': z.array(
    z.object({
      name: z.string(),
      exhibitors: z.array(z.string()),
      isSpecialSection: z.boolean()
    })
  ),
  '/get-booth': z.object({
    name: z.string(),
    adminNotes: z.string(),
    isOnHold: z.boolean(),
    isSpecialSection: z.boolean(),
    metadata: metadataSchema,
    exhibitors: z.array(categorySchema)
  }),
  '/list-categories': z.array(categorySchema),
  '/add-category': idSchema,
  '/list-extras': z.array(
    z.object({ id: z.number(), name: z.string(), price: z.number(), type: z.string() })
  ),
  '/list-exhibitor-extras': z.array(
    z.object({ extraId: z.number(), name: z.string(), quantity: z.number() })
  ),
  '/sessions/get': z.array(
    z.object({
      id: z.number(),
      externalId: z.string(),
      name: z.string(),
      description: z.string(),
      dates: z.array(z.string()),
      logo: z.string(),
      boothId: z.number(),
      boothName: z.string(),
      speakerIds: z.array(z.number()),
      trackIds: z.array(z.number())
    })
  ),
  '/session-tracks/get': z.array(categorySchema),
  '/session-speakers/get': z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      company: z.string(),
      jobTitle: z.string(),
      position: z.string(),
      photo: z.string(),
      linkedInUrl: z.string(),
      twitterUrl: z.string()
    })
  )
};

export class Client {
  constructor(private token: string) {
    if (typeof token !== 'string' || !token.trim()) {
      throw createApiServiceError('Enter the API token from your ExpoFP profile page.');
    }
  }

  private async post<T>(path: string, data: object = {}, validateFields = true): Promise<T> {
    validateIds(data);
    let result = await requestAxiosData<T>(
      path,
      () => http.post<T>(path, { ...data, token: this.token }),
      apiError
    );
    let schema = validateFields ? responseSchemas[path] : undefined;
    if (schema) {
      let parsed = schema.safeParse(result);
      if (!parsed.success) {
        let fields = parsed.error.issues.map(issue => issue.path.join('.')).slice(0, 5);
        throw createApiServiceError(
          `ExpoFP returned an incomplete or invalid response for ${path}: ${fields.join(', ')}.`,
          { reason: 'expofp_invalid_response' }
        );
      }
    }
    return result;
  }

  // --- Events ---

  async listEvents(): Promise<ExpoEvent[]> {
    return this.post<ExpoEvent[]>('/list-events');
  }

  async getEventCount(): Promise<number> {
    let events = await this.post<unknown>('/list-events', {}, false);
    if (!Array.isArray(events)) {
      throw createApiServiceError(
        'ExpoFP did not return an event list. Check your API token.',
        {
          reason: 'expofp_invalid_response'
        }
      );
    }
    return events.length;
  }

  // --- Exhibitors ---

  async listExhibitors(eventId: number): Promise<ExhibitorSummary[]> {
    return this.post<ExhibitorSummary[]>('/list-exhibitors', { eventId });
  }

  async getExhibitor(exhibitorId: number): Promise<ExhibitorDetail> {
    return this.post<ExhibitorDetail>('/get-exhibitor', { id: exhibitorId });
  }

  async getExhibitorId(eventId: number, externalId: string): Promise<{ id: number }> {
    return this.post<{ id: number }>('/get-exhibitor-id', { eventId, externalId });
  }

  async addExhibitor(params: AddExhibitorParams): Promise<{ id: number }> {
    return this.post<{ id: number }>('/add-exhibitor', params);
  }

  async updateExhibitor(params: UpdateExhibitorParams): Promise<void> {
    return this.post<void>('/update-exhibitor', params);
  }

  async deleteExhibitor(exhibitorId: number): Promise<void> {
    return this.post<void>('/delete-exhibitor', { id: exhibitorId });
  }

  // --- Booths ---

  async listBooths(expoId: number): Promise<BoothSummary[]> {
    return this.post<BoothSummary[]>('/list-booths', { expoId });
  }

  async getBooth(eventId: number, name: string): Promise<BoothDetail> {
    return this.post<BoothDetail>('/get-booth', { eventId, name });
  }

  async updateBooth(params: UpdateBoothParams): Promise<void> {
    return this.post<void>('/update-booth', params);
  }

  async addExhibitorBooth(
    eventId: number,
    exhibitorId: number,
    boothName: string
  ): Promise<void> {
    return this.post<void>('/add-exhibitor-booth', { eventId, exhibitorId, boothName });
  }

  async removeExhibitorBooth(
    eventId: number,
    exhibitorId: number,
    boothName: string
  ): Promise<void> {
    return this.post<void>('/remove-exhibitor-booth', { eventId, exhibitorId, boothName });
  }

  // --- Categories ---

  async listCategories(eventId: number): Promise<Category[]> {
    return this.post<Category[]>('/list-categories', { eventId });
  }

  async addCategory(eventId: number, name: string): Promise<{ id: number }> {
    return this.post<{ id: number }>('/add-category', { eventId, name });
  }

  async updateCategory(categoryId: number, name: string): Promise<void> {
    return this.post<void>('/update-category', { id: categoryId, name });
  }

  async removeCategory(categoryId: number): Promise<void> {
    return this.post<void>('/remove-category', { id: categoryId });
  }

  // --- Extras ---

  async listExtras(eventId: number): Promise<ExtraDefinition[]> {
    return this.post<ExtraDefinition[]>('/list-extras', { eventId });
  }

  async listExhibitorExtras(exhibitorId: number): Promise<ExhibitorExtra[]> {
    return this.post<ExhibitorExtra[]>('/list-exhibitor-extras', { id: exhibitorId });
  }

  async addExhibitorExtra(
    exhibitorId: number,
    extraId: number,
    quantity: number
  ): Promise<void> {
    return this.post<void>('/add-exhibitor-extra', { exhibitorId, extraId, quantity });
  }

  async removeExhibitorExtra(exhibitorId: number, extraId: number): Promise<void> {
    return this.post<void>('/remove-exhibitor-extra', { exhibitorId, extraId });
  }

  // --- Sessions ---

  async getSessions(expoId: number): Promise<Session[]> {
    return this.post<Session[]>('/sessions/get', { expoId });
  }

  async upsertSessions(expoId: number, sessions: SessionUpsert[]): Promise<void> {
    return this.post<void>('/sessions/upsert', { expoId, sessions });
  }

  async deleteSessions(expoId: number, sessionIds: number[]): Promise<void> {
    return this.post<void>('/sessions/delete', { expoId, ids: sessionIds });
  }

  // --- Session Tracks ---

  async getSessionTracks(expoId: number): Promise<SessionTrack[]> {
    return this.post<SessionTrack[]>('/session-tracks/get', { expoId });
  }

  async upsertSessionTracks(expoId: number, tracks: SessionTrackUpsert[]): Promise<void> {
    return this.post<void>('/session-tracks/upsert', { expoId, tracks });
  }

  async deleteSessionTracks(expoId: number, trackIds: number[]): Promise<void> {
    return this.post<void>('/session-tracks/delete', { expoId, ids: trackIds });
  }

  // --- Session Speakers ---

  async getSessionSpeakers(expoId: number): Promise<SessionSpeaker[]> {
    return this.post<SessionSpeaker[]>('/session-speakers/get', { expoId });
  }

  async upsertSessionSpeakers(
    expoId: number,
    speakers: SessionSpeakerUpsert[]
  ): Promise<void> {
    return this.post<void>('/session-speakers/upsert', { expoId, speakers });
  }

  async deleteSessionSpeakers(expoId: number, speakerIds: number[]): Promise<void> {
    return this.post<void>('/session-speakers/delete', { expoId, ids: speakerIds });
  }

  // --- Webhooks ---

  async setWebhookUrl(eventId: number, webhookUrl: string): Promise<void> {
    return this.post<void>('/set-webhook-url', { eventId, webhookUrl });
  }
}

export let getOfflinePlanState = (expoKey: string, prepare: boolean) => {
  if (!expoKey.trim() || expoKey.includes('/') || expoKey === '.' || expoKey === '..') {
    throw createApiServiceError('Use an ExpoFP expo key, such as demo, rather than a URL.');
  }
  let path = `/api/v2/expo-offline/${encodeURIComponent(expoKey)}/${prepare ? 'get-or-create' : 'get'}/latest`;
  return requestAxiosData<unknown>(path, () => offlineHttp.get(path), apiError);
};

// --- Types ---

export interface ExpoEvent {
  id: number;
  name: string;
  expoKey: string;
  date: string;
  location: string;
}

export interface ExhibitorSummary {
  id: number;
  name: string;
  externalId: string;
  boothNames: string[];
}

export interface ExhibitorDetail {
  id: number;
  name: string;
  description: string;
  featured: boolean;
  advertised: boolean;
  country: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone1: string;
  phone2: string;
  publicEmail: string;
  privateEmail: string;
  vat: string;
  website: string;
  contactName: string;
  contactPhone: string;
  adminNotes: string;
  externalId: string;
  autoLoginUrl: string;
  categories: number[];
  tags: string[];
  metadata: Record<string, string>;
  boothNames: string[];
  facebookUrl: string;
  twitterUrl: string;
  linkedInUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  pinterestUrl: string;
  snapchatUrl: string;
}

export interface ExhibitorParams {
  name?: string;
  description?: string;
  featured?: boolean;
  advertised?: boolean;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone1?: string;
  phone2?: string;
  publicEmail?: string;
  privateEmail?: string;
  vat?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  adminNotes?: string;
  externalId?: string;
  autoLoginUrl?: string;
  categories?: number[];
  tags?: string[];
  metadata?: Record<string, string>;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedInUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  pinterestUrl?: string;
  snapchatUrl?: string;
}

export interface AddExhibitorParams extends ExhibitorParams {
  eventId: number;
}

export interface UpdateExhibitorParams extends ExhibitorParams {
  id: number;
}

export interface BoothSummary {
  name: string;
  exhibitors: string[];
  isSpecialSection: boolean;
}

export interface BoothDetail {
  name: string;
  adminNotes: string;
  isOnHold: boolean;
  isSpecialSection: boolean;
  metadata: Record<string, string>;
  exhibitors: BoothExhibitor[];
}

export interface BoothExhibitor {
  id: number;
  name: string;
}

export interface UpdateBoothParams {
  eventId: number;
  name: string;
  adminNotes?: string;
  isOnHold?: boolean;
  metadata?: Record<string, string>;
}

export interface Category {
  id: number;
  name: string;
}

export interface ExtraDefinition {
  id: number;
  name: string;
  price: number;
  type: string;
}

export interface ExhibitorExtra {
  extraId: number;
  name: string;
  quantity: number;
}

export interface Session {
  id: number;
  externalId: string;
  name: string;
  description: string;
  dates: string[];
  logo: string;
  boothId: number;
  boothName: string;
  speakerIds: number[];
  trackIds: number[];
}

export interface SessionUpsert {
  id?: number;
  externalId?: string;
  name: string;
  description?: string;
  dates?: string[];
  logo?: string;
  boothId?: number;
  boothName?: string;
  speakerIds?: number[];
  trackIds?: number[];
}

export interface SessionTrack {
  id: number;
  name: string;
}

export interface SessionTrackUpsert {
  id?: number;
  name: string;
}

export interface SessionSpeaker {
  id: number;
  name: string;
  company: string;
  jobTitle: string;
  position: string;
  photo: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedInUrl: string;
  tiktokUrl: string;
  pinterestUrl: string;
  snapchatUrl: string;
}

export interface SessionSpeakerUpsert {
  id?: number;
  name: string;
  company?: string;
  jobTitle?: string;
  position?: string;
  photo?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedInUrl?: string;
  tiktokUrl?: string;
  pinterestUrl?: string;
  snapchatUrl?: string;
}
