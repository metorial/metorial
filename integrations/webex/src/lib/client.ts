import { createApiServiceError, isApiErrorRecord, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import { apiError, nextPage, pageUrl, protect, required, segment, webexHttp } from './http';

const resourceSchema = z.object({
  id: z.string().min(1),
  agenda: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  allowAnyUserToBeCoHost: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  avatar: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  classificationId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  coHost: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  createTime: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  created: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  creatorId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  department: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  description: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  displayName: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  downloadUrl: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  durationSeconds: z
    .number()
    .nullish()
    .transform(v => v ?? undefined),
  email: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  enabledAutoRecordMeeting: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  end: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  firstName: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  format: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  from: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  hostDisplayName: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  hostEmail: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  html: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  isAnnouncementOnly: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  isLocked: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  isModerator: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  isPublic: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  isReadOnly: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  isRoomHidden: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  lastActivity: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  lastName: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  markdown: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  max: z
    .number()
    .nullish()
    .transform(v => v ?? undefined),
  meetingId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  meetingNumber: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  meetingSeriesId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  meetingType: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  membershipId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  messageId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  name: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  orgId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  ownerId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  parentId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  password: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  personDisplayName: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  personEmail: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  personId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  personIds: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  personOrgId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  playbackUrl: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  recordingId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  recurrence: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  roomId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  roomType: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  scheduledMeetingId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  sendEmail: z
    .boolean()
    .nullish()
    .transform(v => v ?? undefined),
  sipAddress: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  siteUrl: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  sizeBytes: z
    .number()
    .nullish()
    .transform(v => v ?? undefined),
  spaceId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  start: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  state: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  status: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  teamId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  text: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  timeRecorded: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  timezone: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  title: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  to: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  toPersonEmail: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  toPersonId: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  topic: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  type: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  updated: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  webLink: z
    .string()
    .nullish()
    .transform(v => v ?? undefined),
  files: z
    .array(z.string())
    .nullish()
    .transform(v => v ?? undefined),
  attachments: z
    .array(z.unknown())
    .nullish()
    .transform(v => v ?? undefined),
  emails: z
    .array(z.string())
    .nullish()
    .transform(v => v ?? undefined),
  mentionedPeople: z
    .array(z.string())
    .nullish()
    .transform(v => v ?? undefined),
  mentionedGroups: z
    .array(z.string())
    .nullish()
    .transform(v => v ?? undefined),
  temporaryDirectDownloadLinks: z
    .object({
      recordingDownloadLink: z.string().optional(),
      expiration: z.string().optional()
    })
    .optional()
});
export type WebexResource = z.infer<typeof resourceSchema>;

export class WebexClient {
  private token: string;
  private api: ReturnType<typeof webexHttp>;

  constructor(config: { token: string }) {
    this.token = required(config.token, 'access token');
    this.api = webexHttp(this.token);
    this.api.interceptors.request.use(request => {
      protect({ url: request.url, params: request.params, data: request.data }, [this.token]);
      return request;
    });
    this.api.interceptors.response.use(
      response => {
        if (response.status !== 200 && response.status !== 204)
          throw apiError({ response: { status: response.status } }, 'request');
        return response;
      },
      error => Promise.reject(apiError(error, 'request'))
    );
  }

  private resource(response: { status: number; data: unknown }, expectedId?: string) {
    if (response.status !== 200)
      throw createApiServiceError(
        'Webex returned no resource receipt. A write outcome may be uncertain.'
      );
    const result = resourceSchema.safeParse(response.data);
    if (!result.success || (expectedId !== undefined && result.data.id !== expectedId))
      throw createApiServiceError(
        'Webex returned an invalid or mismatched resource receipt. Reconcile writes before repeating them.'
      );
    return result.data;
  }
  private messageResource(response: { status: number; data: unknown }, expectedId?: string) {
    const resource = this.resource(response, expectedId);
    return { ...resource, roomId: required(resource.roomId, 'message room ID') };
  }
  private oneTarget(value: object, fields: string[]) {
    const record = value as Record<string, unknown>;
    if (fields.filter(k => record[k] !== undefined).length !== 1)
      throw createApiServiceError(`Provide exactly one of ${fields.join(', ')}.`);
    for (const field of fields)
      if (record[field] !== undefined) required(record[field], field);
  }
  private hasChanges(body: object) {
    if (!Object.keys(pickDefined(body)).length)
      throw createApiServiceError('Provide at least one property to update.');
    protect(body, [this.token]);
  }
  private dates(body: { start?: string; end?: string; from?: string; to?: string }) {
    for (const date of [body.start, body.end, body.from, body.to])
      if (
        date !== undefined &&
        (!Number.isFinite(Date.parse(date)) || !/^\d{4}-\d{2}-\d{2}T/.test(date))
      )
        throw createApiServiceError('Use ISO 8601 date-times.');
    const start = body.start ?? body.from,
      end = body.end ?? body.to;
    if (start && end && Date.parse(start) >= Date.parse(end))
      throw createApiServiceError('The end date-time must be after the start.');
  }
  private async page(path: string, params?: Record<string, unknown>) {
    const { nextPageUrl: next, ...filters } = pickDefined(params ?? {});
    if (next !== undefined && Object.keys(filters).length)
      throw createApiServiceError(
        'Use nextPageUrl alone to preserve the native page filters.'
      );
    if (
      filters.max !== undefined &&
      (!Number.isInteger(filters.max) || Number(filters.max) < 1 || Number(filters.max) > 1000)
    )
      throw createApiServiceError('max must be an integer from 1 to 1000.');
    this.dates(filters);
    const target =
      next === undefined ? path : pageUrl(required(next, 'next-page URL'), path).toString();
    const response = await requestAxios(
      'list',
      () => this.api.get(target, { params: filters }),
      apiError
    );
    if (!isApiErrorRecord(response.data) || !Array.isArray(response.data.items))
      throw createApiServiceError('Webex returned an invalid collection receipt.');
    const items = response.data.items.map(item =>
      this.resource({ status: response.status, data: item })
    );
    return { items, nextPageUrl: nextPage(response.headers, path) };
  }
  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ---- Messages ----

  async listMessages(params: {
    roomId?: string;
    parentId?: string;
    mentionedPeople?: string;
    before?: string;
    beforeMessage?: string;
    max?: number;
    nextPageUrl?: string;
  }) {
    if (!params.nextPageUrl) required(params.roomId, 'roomId');
    return this.page('/messages', params);
  }

  async listDirectMessages(params: {
    personId?: string;
    personEmail?: string;
    parentId?: string;
    nextPageUrl?: string;
  }) {
    if (!params.nextPageUrl) this.oneTarget(params, ['personId', 'personEmail']);
    return this.page('/messages/direct', params);
  }

  async createMessage(body: {
    roomId?: string;
    toPersonId?: string;
    toPersonEmail?: string;
    parentId?: string;
    text?: string;
    markdown?: string;
    files?: string[];
    attachments?: unknown[];
  }) {
    this.oneTarget(body, ['roomId', 'toPersonId', 'toPersonEmail']);
    if (!body.text && !body.markdown && !body.files?.length && !body.attachments?.length)
      throw createApiServiceError('Provide text, markdown, a file URL or an Adaptive Card.');
    if (body.files && body.files.length > 1)
      throw createApiServiceError('Webex accepts one remote file per message.');
    for (const file of body.files ?? []) {
      let url: URL;
      try {
        url = new URL(file);
      } catch {
        throw createApiServiceError('Provide a public HTTP(S) file URL.');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw createApiServiceError('Provide a public HTTP(S) file URL without credentials.');
    }
    protect(body, [this.token]);
    let response = await this.api.post('/messages', body, {
      headers: this.headers()
    });
    const result = this.messageResource(response);
    if (body.roomId !== undefined && result.roomId !== body.roomId)
      throw createApiServiceError(
        'The created message receipt belongs to a different space. Do not repeat the send; reconcile the accepted resource.'
      );
    if (
      (body.toPersonId && result.toPersonId && body.toPersonId !== result.toPersonId) ||
      (body.toPersonEmail &&
        result.toPersonEmail &&
        body.toPersonEmail.toLowerCase() !== result.toPersonEmail.toLowerCase())
    )
      throw createApiServiceError(
        'The direct-message receipt has a different recipient. Do not repeat the send.'
      );
    return result;
  }

  async getMessage(messageId: string) {
    let response = await this.api.get(`/messages/${segment(messageId)}`, {
      headers: this.headers()
    });
    return this.messageResource(response, messageId);
  }

  async updateMessage(
    messageId: string,
    body: {
      roomId: string;
      text?: string;
      markdown?: string;
    }
  ) {
    if (!body.text && !body.markdown)
      throw createApiServiceError('Provide updated text or markdown.');
    const existing = await this.getMessage(messageId);
    if (existing.roomId !== body.roomId)
      throw createApiServiceError('The message belongs to a different space.');
    if (existing.files?.length || existing.attachments?.length)
      throw createApiServiceError(
        'Webex cannot edit messages containing files or Adaptive Cards.'
      );
    let response = await this.api.put(`/messages/${segment(messageId)}`, body, {
      headers: this.headers()
    });
    return this.messageResource(response, messageId);
  }

  async deleteMessage(messageId: string) {
    const response = await this.api.delete(`/messages/${segment(messageId)}`, {
      headers: this.headers()
    });
    if (response.status !== 204)
      throw createApiServiceError(
        'Webex did not confirm the deletion request. Reconcile its outcome before retrying.'
      );
  }

  // ---- Rooms / Spaces ----

  async listRooms(params?: {
    teamId?: string;
    type?: string;
    sortBy?: string;
    max?: number;
    nextPageUrl?: string;
  }) {
    return this.page('/rooms', params);
  }

  async createRoom(body: {
    title: string;
    teamId?: string;
    classificationId?: string;
    isLocked?: boolean;
    isPublic?: boolean;
    description?: string;
    isAnnouncementOnly?: boolean;
  }) {
    required(body.title, 'space title');
    if (body.isPublic && !body.description?.trim())
      throw createApiServiceError('Public spaces require a description.');
    if (body.isAnnouncementOnly && body.isLocked !== true)
      throw createApiServiceError('Announcement-only spaces must be moderated.');
    let response = await this.api.post('/rooms', body, {
      headers: this.headers()
    });
    return this.resource(response);
  }

  async getRoom(roomId: string) {
    let response = await this.api.get(`/rooms/${segment(roomId)}`, {
      headers: this.headers()
    });
    return this.resource(response, roomId);
  }

  async updateRoom(
    roomId: string,
    body: {
      title?: string;
      classificationId?: string;
      teamId?: string;
      isLocked?: boolean;
      isPublic?: boolean;
      description?: string;
      isAnnouncementOnly?: boolean;
      isReadOnly?: boolean;
    }
  ) {
    this.hasChanges(body);
    const existing = await this.getRoom(roomId);
    if (body.title === undefined)
      body = { ...body, title: required(existing.title, 'current space title') };
    if (body.isAnnouncementOnly && (body.isLocked ?? existing.isLocked) !== true)
      throw createApiServiceError('Announcement-only spaces must be moderated.');
    let response = await this.api.put(`/rooms/${segment(roomId)}`, body, {
      headers: this.headers()
    });
    return this.resource(response, roomId);
  }

  async deleteRoom(roomId: string) {
    const existing = await this.getRoom(roomId);
    const response = await this.api.delete(`/rooms/${segment(roomId)}`, {
      headers: this.headers()
    });
    if (response.status !== 204)
      throw createApiServiceError(
        'Webex did not confirm the deletion request. Reconcile its outcome before retrying.'
      );
    return existing.teamId
      ? ('archive_requested' as const)
      : ('delete_or_leave_requested' as const);
  }

  // ---- Memberships ----

  async listMemberships(params?: {
    roomId?: string;
    personId?: string;
    personEmail?: string;
    max?: number;
    nextPageUrl?: string;
  }) {
    if ((params?.personId || params?.personEmail) && !params.roomId && !params.nextPageUrl)
      throw createApiServiceError('Person membership filters require roomId.');
    return this.page('/memberships', params);
  }

  async createMembership(body: {
    roomId: string;
    personId?: string;
    personEmail?: string;
    isModerator?: boolean;
  }) {
    required(body.roomId, 'roomId');
    this.oneTarget(body, ['personId', 'personEmail']);
    let response = await this.api.post('/memberships', body, {
      headers: this.headers()
    });
    const result = this.resource(response);
    if (
      result.roomId !== body.roomId ||
      (body.personId !== undefined && result.personId !== body.personId) ||
      (body.personEmail !== undefined &&
        result.personEmail?.toLowerCase() !== body.personEmail.toLowerCase())
    )
      throw createApiServiceError(
        'Webex returned a mismatched membership receipt. Reconcile the accepted membership before retrying.'
      );
    return result;
  }

  async getMembership(membershipId: string) {
    let response = await this.api.get(`/memberships/${segment(membershipId)}`, {
      headers: this.headers()
    });
    return this.resource(response, membershipId);
  }

  async updateMembership(
    membershipId: string,
    body: {
      isModerator?: boolean;
      isRoomHidden?: boolean;
    }
  ) {
    this.hasChanges(body);
    const existing = await this.getMembership(membershipId);
    body = {
      isModerator: body.isModerator ?? existing.isModerator,
      isRoomHidden: body.isRoomHidden ?? existing.isRoomHidden
    };
    if (typeof body.isModerator !== 'boolean' || typeof body.isRoomHidden !== 'boolean')
      throw createApiServiceError(
        'Webex requires both membership settings. Supply isModerator and isRoomHidden explicitly when the existing membership omits either.'
      );
    let response = await this.api.put(`/memberships/${segment(membershipId)}`, body, {
      headers: this.headers()
    });
    return this.resource(response, membershipId);
  }

  async deleteMembership(membershipId: string) {
    const response = await this.api.delete(`/memberships/${segment(membershipId)}`, {
      headers: this.headers()
    });
    if (response.status !== 204)
      throw createApiServiceError(
        'Webex did not confirm the deletion request. Reconcile its outcome before retrying.'
      );
  }

  // ---- People ----

  async listPeople(params?: {
    email?: string;
    displayName?: string;
    id?: string;
    orgId?: string;
    max?: number;
    nextPageUrl?: string;
  }) {
    return this.page('/people', params);
  }

  async getPerson(personId: string) {
    let response = await this.api.get(`/people/${segment(personId)}`, {
      headers: this.headers()
    });
    return this.resource(response, personId);
  }

  async getMe() {
    let response = await this.api.get('/people/me', {
      headers: this.headers()
    });
    return this.resource(response);
  }

  // ---- Meetings ----

  async listMeetings(params?: {
    meetingNumber?: string;
    webLink?: string;
    roomId?: string;
    meetingType?: string;
    state?: string;
    from?: string;
    to?: string;
    hostEmail?: string;
    max?: number;
    nextPageUrl?: string;
  }) {
    return this.page('/meetings', params);
  }

  async createMeeting(body: {
    title: string;
    agenda?: string;
    password?: string;
    start?: string;
    end?: string;
    timezone?: string;
    recurrence?: string;
    enabledAutoRecordMeeting?: boolean;
    allowAnyUserToBeCoHost?: boolean;
    enabledJoinBeforeHost?: boolean;
    enableConnectAudioBeforeHost?: boolean;
    joinBeforeHostMinutes?: number;
    excludePassword?: boolean;
    publicMeeting?: boolean;
    reminderTime?: number;
    sendEmail?: boolean;
    hostEmail?: string;
    siteUrl?: string;
    invitees?: Array<{ email: string; displayName?: string; coHost?: boolean }>;
  }) {
    required(body.title, 'meeting title');
    required(body.start, 'meeting start');
    required(body.end, 'meeting end');
    this.dates(body);
    let response = await this.api.post('/meetings', body, {
      headers: this.headers()
    });
    return this.resource(response);
  }

  async getMeeting(
    meetingId: string,
    params?: {
      current?: boolean;
      hostEmail?: string;
    }
  ) {
    let response = await this.api.get(`/meetings/${segment(meetingId)}`, {
      headers: this.headers(),
      params
    });
    return this.resource(response, meetingId);
  }

  async updateMeeting(
    meetingId: string,
    body: {
      title?: string;
      agenda?: string;
      password?: string;
      start?: string;
      end?: string;
      timezone?: string;
      recurrence?: string;
      enabledAutoRecordMeeting?: boolean;
      allowAnyUserToBeCoHost?: boolean;
      sendEmail?: boolean;
    }
  ) {
    this.hasChanges(body);
    this.dates(body);
    let response = await this.api.patch(`/meetings/${segment(meetingId)}`, body, {
      headers: { ...this.headers(), 'Content-Type': 'application/json-patch+json' }
    });
    return this.resource(response, meetingId);
  }

  async deleteMeeting(
    meetingId: string,
    params?: {
      hostEmail?: string;
      sendEmail?: boolean;
    }
  ) {
    const response = await this.api.delete(`/meetings/${segment(meetingId)}`, {
      headers: this.headers(),
      params
    });
    if (response.status !== 204)
      throw createApiServiceError(
        'Webex did not confirm the deletion request. Reconcile its outcome before retrying.'
      );
  }

  // ---- Recordings ----

  async listRecordings(params?: {
    from?: string;
    to?: string;
    meetingId?: string;
    hostEmail?: string;
    siteUrl?: string;
    max?: number;
    nextPageUrl?: string;
  }) {
    return this.page('/recordings', params);
  }

  async getRecording(
    recordingId: string,
    params?: {
      hostEmail?: string;
    }
  ) {
    let response = await this.api.get(`/recordings/${segment(recordingId)}`, {
      headers: this.headers(),
      params
    });
    return this.resource(response, recordingId);
  }

  async deleteRecording(
    recordingId: string,
    params?: {
      hostEmail?: string;
    }
  ) {
    const response = await this.api.delete(`/recordings/${segment(recordingId)}`, {
      headers: this.headers(),
      params
    });
    if (response.status !== 204)
      throw createApiServiceError(
        'Webex did not confirm the deletion request. Reconcile its outcome before retrying.'
      );
  }

  // ---- Teams ----

  async listTeams(params?: { max?: number; nextPageUrl?: string }) {
    return this.page('/teams', params);
  }

  async createTeam(body: { name: string }) {
    required(body.name, 'team name');
    let response = await this.api.post('/teams', body, {
      headers: this.headers()
    });
    return this.resource(response);
  }

  async getTeam(teamId: string) {
    let response = await this.api.get(`/teams/${segment(teamId)}`, {
      headers: this.headers()
    });
    return this.resource(response, teamId);
  }

  async updateTeam(teamId: string, body: { name: string }) {
    let response = await this.api.put(`/teams/${segment(teamId)}`, body, {
      headers: this.headers()
    });
    return this.resource(response, teamId);
  }

  async deleteTeam(teamId: string) {
    const response = await this.api.delete(`/teams/${segment(teamId)}`, {
      headers: this.headers()
    });
    if (response.status !== 204)
      throw createApiServiceError(
        'Webex did not confirm the deletion request. Reconcile its outcome before retrying.'
      );
  }
}

export { z } from 'zod';
