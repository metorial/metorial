import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type ProviderRecord = Record<string, unknown>;

export let eventeeError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Eventee',
    reason: 'eventee_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let body = helpers.getResponseWithBody(input)?.data;
      let details: string[] = [];
      helpers.collectDetails(body, details, {
        detailKeys: ['message', 'error', 'code', 'not_authorized'],
        nestedKeys: ['error', 'errors']
      });
      if (helpers.isRecord(body) && helpers.isRecord(body.errors)) {
        for (let value of Object.values(body.errors)) helpers.collectDetails(value, details);
      }
      return details.length ? details.join(' - ') : undefined;
    },
    extractUpstreamCode: (_error, response, helpers) => {
      let body = response?.data;
      if (!helpers.isRecord(body)) return undefined;
      let code = helpers.isRecord(body.error) ? body.error.code : (body.code ?? body.error);
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let requireWholeNumber = (value: unknown, field: string, minimum = 1) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw createApiServiceError(`${field} must be a whole number of at least ${minimum}.`);
  }
  return value;
};

let record = (value: unknown): ProviderRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('Eventee returned an unexpected response object.');
  }
  return value;
};
let records = (value: unknown): ProviderRecord[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError('Eventee returned an unexpected response list.');
  }
  return value.map(record);
};
let text = (value: unknown) => (typeof value === 'string' ? value : '');
let id = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError('Eventee returned a missing or invalid resource ID.');
  }
  return value;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token)) {
      throw createApiServiceError('Provide a valid Eventee Public API token.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://eventee.com/public/api/v1',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      timeout: 30_000,
      errorAdapter: eventeeError
    });
  }

  async request(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: ProviderRecord,
    params?: ProviderRecord
  ): Promise<unknown> {
    let response = await this.axios.request({ method, url: path, data, params });
    return response.data;
  }

  async getContent(params?: ProviderRecord) {
    let raw = record(await this.request('GET', '/content', undefined, params));
    let halls = records(raw.halls ?? []);
    let tracks = records(raw.tracks ?? []);
    let days = records(raw.days ?? []);
    let sessionById = new Map<number, ProviderRecord>();
    for (let item of [
      ...records(raw.lectures ?? []),
      ...records(raw.workshops ?? []),
      ...days.flatMap(day => records(day.lectures ?? []))
    ])
      sessionById.set(id(item.id), item);
    return {
      // Eventee's program endpoint does not return event name/description/date metadata.
      eventName: text(raw.eventName),
      eventDescription: text(raw.eventDescription),
      eventStart: text(raw.eventStart),
      eventEnd: text(raw.eventEnd),
      stages: halls.map(item => ({
        stageId: id(item.id),
        name: text(item.name),
        order: typeof item.order === 'number' ? item.order : 0
      })),
      tracks: tracks.map(item => ({
        trackId: id(item.id),
        name: text(item.name),
        color: text(item.color)
      })),
      sessions: [...sessionById.values()].map(item => ({
        sessionId: id(item.id),
        title: text(item.name),
        description: text(item.description),
        start: text(item.start),
        end: text(item.end),
        stageId: typeof item.hall_id === 'number' ? item.hall_id : 0,
        trackId:
          Array.isArray(item.tracks) && typeof item.tracks[0] === 'number'
            ? item.tracks[0]
            : null,
        speakers: Array.isArray(item.speakers)
          ? item.speakers.filter((value): value is number => typeof value === 'number')
          : []
      })),
      speakers: records(raw.speakers ?? []).map(item => ({
        speakerId: id(item.id),
        firstName: text(item.first_name),
        lastName: text(item.last_name),
        email: text(item.email),
        bio: text(item.bio),
        photoUrl: text(item.photo),
        company: text(item.company),
        jobPosition: text(item.position)
      })),
      raw
    };
  }

  async listParticipants() {
    let raw = records(await this.request('GET', '/participants'));
    return {
      raw,
      participants: raw.map(item => ({
        participantId: id(item.id),
        email: text(item.email),
        firstName: text(item.first_name),
        lastName: text(item.last_name),
        photoUrl: text(item.photo),
        phone: text(item.phone),
        bio: text(item.bio),
        webPage: text(item.web),
        facebookUrl: text(item.facebook_link),
        twitterUrl: text(item.twitter_link),
        linkedinUrl: text(item.linked_in_link ?? item.linkedIn_link),
        jobPosition: text(item.position),
        company: text(item.company),
        checkedIn: Boolean(item.checked_at)
      }))
    };
  }

  async listRegistrations() {
    let raw = records(await this.request('GET', '/registrations'));
    return {
      raw,
      registrations: raw.map(item => ({
        registrationId: id(item.id),
        email: text(item.email),
        firstName: text(item.first_name),
        lastName: text(item.last_name),
        createdAt: text(item.created_at)
      }))
    };
  }

  async inviteAttendees(users: InviteAttendeeUser[]) {
    return record(
      await this.request('PUT', '/attendee/invite', { users: users.map(mapPerson) })
    );
  }
}

export interface InviteAttendeeUser {
  email: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  bio?: string;
  webPage?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  jobPosition?: string;
  company?: string;
  sendEmail?: boolean;
  groupId?: number;
  tickets?: { number: string; title?: string; type?: 'plain' | 'barcode' | 'qr' }[];
}

export let mapPerson = (user: InviteAttendeeUser) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) || user.email.length > 191) {
    throw createApiServiceError(
      'Each person must have a valid email address of at most 191 characters.'
    );
  }
  for (let [value, maximum, field] of [
    [user.firstName, 191, 'firstName'],
    [user.lastName, 191, 'lastName'],
    [user.company, 128, 'company'],
    [user.phone, 32, 'phone'],
    [user.jobPosition, 512, 'jobPosition'],
    [user.webPage, 512, 'webPage'],
    [user.facebookUrl, 512, 'facebookUrl'],
    [user.twitterUrl, 512, 'twitterUrl'],
    [user.linkedinUrl, 512, 'linkedinUrl']
  ] as const) {
    if (value !== undefined && value.length > maximum) {
      throw createApiServiceError(`${field} must be at most ${maximum} characters.`);
    }
  }
  if (user.groupId !== undefined) requireWholeNumber(user.groupId, 'groupId');
  return pickDefined({
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    photo: user.photoUrl,
    phone: user.phone,
    bio: user.bio,
    web: user.webPage,
    facebook_link: user.facebookUrl,
    twitter_link: user.twitterUrl,
    linked_in_link: user.linkedinUrl,
    position: user.jobPosition,
    company: user.company,
    send_email: user.sendEmail,
    group_id: user.groupId,
    tickets: user.tickets
  });
};
