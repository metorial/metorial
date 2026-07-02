import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://app.expofp.com/api/v1'
});

export class Client {
  constructor(private token: string) {}

  private async post<T = any>(path: string, data: Record<string, any> = {}): Promise<T> {
    let response = await http.post(path, {
      ...data,
      token: this.token
    });
    return response.data;
  }

  // --- Events ---

  async listEvents(): Promise<ExpoEvent[]> {
    return this.post<ExpoEvent[]>('/list-events');
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
