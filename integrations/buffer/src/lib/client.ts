import { createAxios } from 'slates';

export interface BufferUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: string;
  timezone: string;
  createdAt: string;
}

export interface BufferProfile {
  id: string;
  avatar: string;
  avatarHttps: string;
  createdAt: number;
  default: boolean;
  formattedService: string;
  formattedUsername: string;
  service: string;
  serviceId: string;
  serviceUsername: string;
  userId: string;
  counts: {
    sent: number;
    pending: number;
    drafts: number;
    daily_suggestions: number;
  };
  schedules: ScheduleEntry[];
  teamMembers: string[];
}

export interface ScheduleEntry {
  days: string[];
  times: string[];
}

export interface BufferUpdate {
  id: string;
  createdAt: number;
  day: string;
  dueAt: number;
  dueTime: string;
  profileId: string;
  profileService: string;
  sentAt: number;
  serviceUpdateId: string;
  statistics: Record<string, number>;
  status: string;
  text: string;
  textFormatted: string;
  textMd5: string;
  type: string;
  updatedAt: number;
  userId: string;
  via: string;
  media?: {
    link?: string;
    title?: string;
    description?: string;
    picture?: string;
    photo?: string;
    thumbnail?: string;
  };
}

export interface BufferInteraction {
  id: string;
  createdAt: number;
  event: string;
  interactionId: string;
  user: {
    username: string;
    avatar: string;
    avatarHttps: string;
    followers: number;
  };
}

export interface BufferConfiguration {
  services: Record<
    string,
    {
      types: Record<
        string,
        {
          character_limit: number;
          schedule_limit: number;
          icons: Record<string, string>;
          urls: Record<string, string>;
        }
      >;
      urls: Record<string, string>;
      icons: Record<string, string>;
    }
  >;
}

export interface CreateUpdateParams {
  text: string;
  profileIds: string[];
  shorten?: boolean;
  now?: boolean;
  top?: boolean;
  media?: {
    link?: string;
    title?: string;
    description?: string;
    picture?: string;
    photo?: string;
    thumbnail?: string;
  };
  scheduledAt?: string;
  attachment?: boolean;
}

export interface EditUpdateParams {
  text?: string;
  now?: boolean;
  media?: {
    link?: string;
    title?: string;
    description?: string;
    picture?: string;
    photo?: string;
    thumbnail?: string;
  };
  scheduledAt?: string;
  utc?: boolean;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.bufferapp.com/1',
      params: {
        access_token: config.token
      }
    });
  }

  // ---- User ----

  async getUser(): Promise<BufferUser> {
    let response = await this.http.get('/user.json');
    return response.data;
  }

  async deauthorize(): Promise<{ success: boolean }> {
    let response = await this.http.post('/user/deauthorize.json');
    return response.data;
  }

  // ---- Profiles ----

  async getProfiles(): Promise<BufferProfile[]> {
    let response = await this.http.get('/profiles.json');
    return response.data;
  }

  async getProfile(profileId: string): Promise<BufferProfile> {
    let response = await this.http.get(`/profiles/${profileId}.json`);
    return response.data;
  }

  async getProfileSchedules(profileId: string): Promise<ScheduleEntry[]> {
    let response = await this.http.get(`/profiles/${profileId}/schedules.json`);
    return response.data;
  }

  async setProfileSchedules(
    profileId: string,
    schedules: ScheduleEntry[]
  ): Promise<{ success: boolean }> {
    let params: Record<string, string> = {};
    schedules.forEach((schedule, i) => {
      schedule.days.forEach((day, j) => {
        params[`schedules[${i}][days][${j}]`] = day;
      });
      schedule.times.forEach((time, j) => {
        params[`schedules[${i}][times][${j}]`] = time;
      });
    });

    let response = await this.http.post(
      `/profiles/${profileId}/schedules/update.json`,
      params
    );
    return response.data;
  }

  // ---- Updates ----

  async getUpdate(updateId: string): Promise<BufferUpdate> {
    let response = await this.http.get(`/updates/${updateId}.json`);
    return response.data;
  }

  async getPendingUpdates(
    profileId: string,
    options?: {
      page?: number;
      count?: number;
      since?: string;
      utc?: boolean;
    }
  ): Promise<{ total: number; updates: BufferUpdate[] }> {
    let response = await this.http.get(`/profiles/${profileId}/updates/pending.json`, {
      params: {
        ...(options?.page !== undefined && { page: options.page }),
        ...(options?.count !== undefined && { count: options.count }),
        ...(options?.since && { since: options.since }),
        ...(options?.utc !== undefined && { utc: options.utc })
      }
    });
    return response.data;
  }

  async getSentUpdates(
    profileId: string,
    options?: {
      page?: number;
      count?: number;
      since?: string;
      utc?: boolean;
      filter?: string;
    }
  ): Promise<{ total: number; updates: BufferUpdate[] }> {
    let response = await this.http.get(`/profiles/${profileId}/updates/sent.json`, {
      params: {
        ...(options?.page !== undefined && { page: options.page }),
        ...(options?.count !== undefined && { count: options.count }),
        ...(options?.since && { since: options.since }),
        ...(options?.utc !== undefined && { utc: options.utc }),
        ...(options?.filter && { filter: options.filter })
      }
    });
    return response.data;
  }

  async createUpdate(params: CreateUpdateParams): Promise<{
    success: boolean;
    updates: BufferUpdate[];
    buffer_count: number;
    buffer_percentage: number;
  }> {
    let body: Record<string, any> = {
      text: params.text,
      profile_ids: params.profileIds
    };

    if (params.shorten !== undefined) body.shorten = params.shorten;
    if (params.now !== undefined) body.now = params.now;
    if (params.top !== undefined) body.top = params.top;
    if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
    if (params.attachment !== undefined) body.attachment = params.attachment;

    if (params.media) {
      if (params.media.link) body['media[link]'] = params.media.link;
      if (params.media.title) body['media[title]'] = params.media.title;
      if (params.media.description) body['media[description]'] = params.media.description;
      if (params.media.picture) body['media[picture]'] = params.media.picture;
      if (params.media.photo) body['media[photo]'] = params.media.photo;
      if (params.media.thumbnail) body['media[thumbnail]'] = params.media.thumbnail;
    }

    let response = await this.http.post('/updates/create.json', body);
    return response.data;
  }

  async editUpdate(
    updateId: string,
    params: EditUpdateParams
  ): Promise<{ success: boolean; update: BufferUpdate }> {
    let body: Record<string, any> = {};

    if (params.text !== undefined) body.text = params.text;
    if (params.now !== undefined) body.now = params.now;
    if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
    if (params.utc !== undefined) body.utc = params.utc;

    if (params.media) {
      if (params.media.link) body['media[link]'] = params.media.link;
      if (params.media.title) body['media[title]'] = params.media.title;
      if (params.media.description) body['media[description]'] = params.media.description;
      if (params.media.picture) body['media[picture]'] = params.media.picture;
      if (params.media.photo) body['media[photo]'] = params.media.photo;
      if (params.media.thumbnail) body['media[thumbnail]'] = params.media.thumbnail;
    }

    let response = await this.http.post(`/updates/${updateId}/update.json`, body);
    return response.data;
  }

  async deleteUpdate(updateId: string): Promise<{ success: boolean }> {
    let response = await this.http.post(`/updates/${updateId}/destroy.json`);
    return response.data;
  }

  async shareUpdate(updateId: string): Promise<{ success: boolean }> {
    let response = await this.http.post(`/updates/${updateId}/share.json`);
    return response.data;
  }

  async moveUpdateToTop(
    updateId: string
  ): Promise<{ success: boolean; update: BufferUpdate }> {
    let response = await this.http.post(`/updates/${updateId}/move_to_top.json`);
    return response.data;
  }

  async reorderUpdates(
    profileId: string,
    order: string[],
    options?: {
      offset?: number;
      utc?: boolean;
    }
  ): Promise<{ success: boolean; updates: BufferUpdate[] }> {
    let body: Record<string, any> = {};
    order.forEach((id, i) => {
      body[`order[${i}]`] = id;
    });
    if (options?.offset !== undefined) body.offset = options.offset;
    if (options?.utc !== undefined) body.utc = options.utc;

    let response = await this.http.post(`/profiles/${profileId}/updates/reorder.json`, body);
    return response.data;
  }

  async shuffleUpdates(
    profileId: string
  ): Promise<{ success: boolean; updates: BufferUpdate[] }> {
    let response = await this.http.post(`/profiles/${profileId}/updates/shuffle.json`);
    return response.data;
  }

  // ---- Interactions ----

  async getInteractions(
    updateId: string,
    event: string,
    options?: {
      page?: number;
      count?: number;
    }
  ): Promise<{ total: number; interactions: BufferInteraction[] }> {
    let response = await this.http.get(`/updates/${updateId}/interactions.json`, {
      params: {
        event,
        ...(options?.page !== undefined && { page: options.page }),
        ...(options?.count !== undefined && { count: options.count })
      }
    });
    return response.data;
  }

  // ---- Links ----

  async getLinkShares(url: string): Promise<{ shares: number }> {
    let response = await this.http.get('/links/shares.json', {
      params: { url }
    });
    return response.data;
  }

  // ---- Configuration ----

  async getConfiguration(): Promise<BufferConfiguration> {
    let response = await this.http.get('/info/configuration.json');
    return response.data;
  }
}
