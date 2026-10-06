import { ServiceError } from '@lowerdeck/error';
import { AuthConfigSecretRedactor, createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { credential, dateTime, identifier, invalid, legacyOnly, safeError } from './errors';
import {
  type assetsSchema,
  mediaSchema,
  type metadataSchema,
  scheduleSchema
} from './schemas';

export type BufferAuth = {
  token: string;
  apiVersion?: 'legacy' | 'graphql';
  credentialType?: 'oauth' | 'api_key';
  refreshToken?: string;
  expiresAt?: string;
};
type Row = Record<string, unknown>;
const row = z.record(z.string(), z.unknown());
const text = z.string();
const optionalText = text.nullish().transform(value => value ?? undefined);
const optionalNumber = z
  .number()
  .finite()
  .nullish()
  .transform(value => value ?? undefined);
const userSchema = z.object({
  id: text.min(1),
  name: optionalText,
  email: text,
  avatar: optionalText,
  plan: optionalText,
  timezone: optionalText,
  createdAt: optionalText
});
const profileSchema = z.object({
  id: text.min(1),
  service: text,
  serviceUsername: optionalText,
  formattedService: optionalText,
  formattedUsername: optionalText,
  avatar: optionalText,
  default: z.boolean().optional(),
  counts: z
    .object({ sent: optionalNumber, pending: optionalNumber, drafts: optionalNumber })
    .optional(),
  organizationId: optionalText,
  serviceId: optionalText,
  timezone: optionalText,
  isQueuePaused: z.boolean().optional()
});
const internalUpdateSchema = z.object({
  id: text.min(1),
  text,
  status: text,
  profileId: text.min(1),
  profileService: optionalText,
  createdAt: optionalNumber,
  dueAt: optionalNumber,
  sentAt: optionalNumber,
  day: optionalText,
  dueTime: optionalText,
  serviceUpdateId: optionalText,
  statistics: z.record(text, z.number().finite()).optional(),
  media: mediaSchema.optional(),
  externalUrl: optionalText,
  authorId: optionalText
});
const graphPostSchema = z.object({
  id: text.min(1),
  text,
  status: text,
  channelId: text.min(1),
  channelService: text,
  createdAt: text,
  dueAt: optionalText,
  sentAt: optionalText,
  externalLink: optionalText,
  author: z.object({ id: text }).nullish(),
  metrics: z.array(z.object({ type: text, value: z.number().finite() })).nullish()
});
const channelSchema = z.object({
  id: text.min(1),
  name: text,
  displayName: optionalText,
  descriptor: text,
  serviceId: text,
  service: text,
  avatar: text,
  organizationId: text.min(1),
  timezone: text,
  postingSchedule: z.array(z.object({ day: text, times: z.array(text), paused: z.boolean() })),
  isQueuePaused: z.boolean()
});
const organizationsSchema = z.array(
  z.object({ id: text.min(1), name: text, channelCount: z.number().int().nonnegative() })
);
const postFields =
  'id text status channelId channelService createdAt dueAt sentAt externalLink author { id }';
const channelFields =
  'id name displayName descriptor service serviceId avatar organizationId timezone postingSchedule { day times paused } isQueuePaused';
const mutationErrorFields = '... on MutationError { message }';
export type BufferUser = z.output<typeof userSchema>;
export type BufferProfile = z.output<typeof profileSchema>;
export type BufferUpdate = z.output<typeof internalUpdateSchema>;
export type ScheduleEntry = z.output<typeof scheduleSchema>;
export type CreateUpdateParams = {
  text: string;
  profileIds: string[];
  shorten?: boolean;
  now?: boolean;
  top?: boolean;
  scheduledAt?: string;
  media?: z.output<typeof mediaSchema>;
  saveToDraft?: boolean;
  assets?: z.output<typeof assetsSchema>;
  metadata?: z.output<typeof metadataSchema>;
};
export type EditUpdateParams = Omit<
  CreateUpdateParams,
  'text' | 'profileIds' | 'shorten' | 'top'
> & { text?: string; utc?: boolean };
export type ListOptions = {
  page?: number;
  count?: number;
  since?: string;
  utc?: boolean;
  organizationId?: string;
  after?: string;
  includeMetrics?: boolean;
};
export const projectUpdate = (update: BufferUpdate) => ({
  updateId: update.id,
  text: update.text,
  status: update.status,
  profileId: update.profileId,
  profileService: update.profileService,
  createdAt: update.createdAt,
  dueAt: update.dueAt,
  sentAt: update.sentAt,
  day: update.day,
  dueTime: update.dueTime,
  serviceUpdateId: update.serviceUpdateId,
  statistics: update.statistics,
  media: update.media,
  externalUrl: update.externalUrl,
  authorId: update.authorId
});

export class Client {
  readonly apiVersion: 'legacy' | 'graphql';
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;
  constructor(private readonly auth: BufferAuth) {
    credential(auth.token);
    this.apiVersion = auth.apiVersion ?? 'legacy';
    this.redactor = new AuthConfigSecretRedactor({
      token: auth.token,
      refreshToken: auth.refreshToken
    });
    this.http = createAuthenticatedAxios({
      baseURL:
        this.apiVersion === 'graphql'
          ? 'https://api.buffer.com'
          : 'https://api.bufferapp.com/1',
      ...(this.apiVersion === 'graphql'
        ? { authHeader: { value: `Bearer ${auth.token}` } }
        : { params: { access_token: auth.token } }),
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: safeError
    });
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw invalid(
        'Buffer returned an unexpected response. Read back the resource before retrying a write.'
      );
    const serialized = JSON.stringify(result.data);
    if (
      JSON.stringify(this.redactor.redactEmbedded(result.data)) !== serialized ||
      this.redactor.redactEmbedded(serialized) !== serialized
    )
      throw invalid('Buffer returned credential-bearing response data; details were omitted.');
    return result.data;
  }
  private async rest(path: string, body?: URLSearchParams, query?: Row): Promise<unknown> {
    const response =
      body === undefined
        ? await this.http.get(path, { params: pickDefined(query ?? {}) })
        : await this.http.post(path, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
    const value = response.data;
    if (value && typeof value === 'object' && 'success' in value && value.success === false)
      throw invalid(
        'Buffer rejected the legacy operation. Verify its availability and read back the resource before retrying.'
      );
    return value;
  }
  private async graph(query: string, variables: Row = {}): Promise<Row> {
    const response = await this.http.post('', { query, variables });
    const envelope = this.parse(
      z.object({ data: row.nullish(), errors: z.array(row).optional() }),
      response.data
    );
    if (envelope.errors?.length) {
      const codes = envelope.errors.map(error =>
        error.extensions && typeof error.extensions === 'object' && 'code' in error.extensions
          ? error.extensions.code
          : undefined
      );
      const code = codes.find(
        candidate =>
          typeof candidate === 'string' &&
          ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMIT_EXCEEDED'].includes(candidate)
      );
      const error = invalid(
        'Buffer rejected the GraphQL request. Check permissions, resource IDs and API limits; read back a write before retrying.'
      );
      if (typeof code === 'string') error.data.upstreamCode = code;
      throw error;
    }
    if (!envelope.data)
      throw invalid(
        'Buffer returned no GraphQL data. The operation may have taken effect; read it back before retrying.'
      );
    return envelope.data;
  }
  private legacyUpdate(value: unknown): BufferUpdate {
    const raw = this.parse(row, value);
    return this.parse(internalUpdateSchema, {
      ...raw,
      profileId: raw.profileId ?? raw.profile_id,
      profileService: raw.profileService ?? raw.profile_service,
      createdAt: raw.createdAt ?? raw.created_at,
      dueAt: raw.dueAt ?? raw.due_at,
      sentAt: raw.sentAt ?? raw.sent_at,
      dueTime: raw.dueTime ?? raw.due_time,
      serviceUpdateId: raw.serviceUpdateId ?? raw.service_update_id
    });
  }
  private graphUpdate(value: unknown): BufferUpdate {
    const post = this.parse(graphPostSchema, value);
    const timestamp = (value?: string) =>
      value === undefined ? undefined : Date.parse(dateTime(value)) / 1000;
    return this.parse(internalUpdateSchema, {
      id: post.id,
      text: post.text,
      status: post.status,
      profileId: post.channelId,
      profileService: post.channelService,
      createdAt: timestamp(post.createdAt),
      dueAt: timestamp(post.dueAt),
      sentAt: timestamp(post.sentAt),
      externalUrl: post.externalLink,
      authorId: post.author?.id,
      statistics:
        post.metrics == null
          ? undefined
          : Object.fromEntries(post.metrics.map(metric => [metric.type, metric.value]))
    });
  }
  private legacyProfile(value: unknown): BufferProfile {
    const raw = this.parse(row, value);
    return this.parse(profileSchema, {
      ...raw,
      serviceUsername: raw.serviceUsername ?? raw.service_username,
      formattedService: raw.formattedService ?? raw.formatted_service,
      formattedUsername: raw.formattedUsername ?? raw.formatted_username,
      avatar: raw.avatarHttps ?? raw.avatar_https ?? raw.avatar
    });
  }
  private graphProfile(value: unknown): BufferProfile {
    const channel = this.parse(channelSchema, value);
    return this.parse(profileSchema, {
      id: channel.id,
      service: channel.service,
      serviceUsername: channel.name,
      formattedService: channel.descriptor,
      formattedUsername: channel.displayName,
      avatar: channel.avatar,
      organizationId: channel.organizationId,
      serviceId: channel.serviceId,
      timezone: channel.timezone,
      isQueuePaused: channel.isQueuePaused
    });
  }
  private async channel(id: string) {
    identifier(id, 'profile ID');
    const data = await this.graph(
      `query($input: ChannelInput!) { channel(input: $input) { ${channelFields} } }`,
      { input: { id } }
    );
    const channel = this.parse(channelSchema, data.channel);
    if (channel.id !== id)
      throw invalid('Buffer returned a different channel than requested.');
    return channel;
  }
  async getUser(): Promise<BufferUser> {
    if (this.apiVersion === 'legacy') {
      const raw = this.parse(row, await this.rest('/user.json'));
      const createdAt = raw.createdAt ?? raw.created_at;
      return this.parse(userSchema, {
        ...raw,
        createdAt:
          typeof createdAt === 'number' && Number.isFinite(createdAt)
            ? String(createdAt)
            : createdAt
      });
    }
    const data = await this.graph(
      'query { account { id name email avatar timezone createdAt } }'
    );
    return this.parse(userSchema, data.account);
  }
  async getOrganizations() {
    if (this.apiVersion !== 'graphql')
      throw invalid(
        'Organization discovery requires a current Buffer API key or a new OAuth connection. Stored legacy tokens stay on the legacy API.'
      );
    const data = await this.graph(
      'query { account { organizations { id name channelCount } } }'
    );
    return this.parse(organizationsSchema, this.parse(row, data.account).organizations);
  }
  private async organization(id?: string) {
    if (id !== undefined) return identifier(id, 'organization ID');
    const organizations = await this.getOrganizations();
    if (organizations.length !== 1)
      throw invalid(
        'Provide organizationId from Get Organizations when the account has zero or multiple organizations.'
      );
    return organizations[0]!.id;
  }
  async getProfiles(organizationId?: string): Promise<BufferProfile[]> {
    if (this.apiVersion === 'legacy') {
      if (organizationId !== undefined)
        throw invalid('Organization filtering requires a current Buffer connection.');
      return this.parse(z.array(row), await this.rest('/profiles.json')).map(value =>
        this.legacyProfile(value)
      );
    }
    const ids =
      organizationId !== undefined
        ? [identifier(organizationId, 'organization ID')]
        : (await this.getOrganizations()).map(value => value.id);
    const profiles: BufferProfile[] = [];
    for (const id of ids) {
      const data = await this.graph(
        `query($input: ChannelsInput!) { channels(input: $input) { ${channelFields} } }`,
        { input: { organizationId: id } }
      );
      for (const value of this.parse(z.array(channelSchema), data.channels)) {
        if (value.organizationId !== id)
          throw invalid('Buffer returned a channel outside the requested organization.');
        profiles.push(this.graphProfile(value));
      }
    }
    return profiles;
  }
  async getProfile(id: string): Promise<BufferProfile> {
    identifier(id, 'profile ID');
    const result =
      this.apiVersion === 'graphql'
        ? this.graphProfile(await this.channel(id))
        : this.legacyProfile(await this.rest(`/profiles/${encodeURIComponent(id)}.json`));
    if (result.id !== id) throw invalid('Buffer returned a different profile than requested.');
    return result;
  }
  async getProfileSchedules(id: string): Promise<ScheduleEntry[]> {
    identifier(id, 'profile ID');
    if (this.apiVersion === 'graphql')
      return (await this.channel(id)).postingSchedule.map(entry => ({
        days: [entry.day],
        times: entry.times,
        paused: entry.paused
      }));
    return this.parse(
      z.array(scheduleSchema),
      await this.rest(`/profiles/${encodeURIComponent(id)}/schedules.json`)
    );
  }
  async setProfileSchedules(id: string, schedules: ScheduleEntry[]) {
    if (this.apiVersion === 'graphql') legacyOnly('Changing posting schedules');
    identifier(id, 'profile ID');
    const body = new URLSearchParams();
    schedules.forEach((entry, i) => {
      if (entry.paused !== undefined)
        throw invalid(
          'The legacy schedule update does not support paused. Omit it; paused is read-only current API metadata.'
        );
      entry.days.forEach((day, j) => {
        if (!['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(day))
          throw invalid('Schedule days must be mon through sun.');
        body.set(`schedules[${i}][days][${j}]`, day);
      });
      entry.times.forEach((time, j) => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
          throw invalid('Schedule times must use HH:MM in 24-hour format.');
        body.set(`schedules[${i}][times][${j}]`, time);
      });
    });
    return this.ack(
      await this.rest(`/profiles/${encodeURIComponent(id)}/schedules/update.json`, body)
    );
  }
  private metricFields(include?: boolean) {
    if (include && this.auth.credentialType !== 'api_key')
      throw invalid(
        'Current post metrics require a personal Buffer API key; OAuth app connections do not support them.'
      );
    return include ? 'metrics { type value }' : '';
  }
  async getUpdate(id: string, includeMetrics?: boolean): Promise<BufferUpdate> {
    identifier(id, 'update ID');
    let update: BufferUpdate;
    if (this.apiVersion === 'legacy')
      update = this.legacyUpdate(await this.rest(`/updates/${encodeURIComponent(id)}.json`));
    else {
      const data = await this.graph(
        `query($input: PostInput!) { post(input: $input) { ${postFields} ${this.metricFields(includeMetrics)} } }`,
        { input: { id } }
      );
      update = this.graphUpdate(data.post);
    }
    if (update.id !== id) throw invalid('Buffer returned a different update than requested.');
    return update;
  }
  async getUpdates(
    profileId: string | undefined,
    status: 'pending' | 'sent' | 'draft',
    options: ListOptions = {}
  ): Promise<{
    total?: number;
    updates: BufferUpdate[];
    pageInfo?: { hasNextPage: boolean; endCursor?: string };
  }> {
    for (const [name, value] of [
      ['page', options.page],
      ['count', options.count]
    ] as const)
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
        throw invalid(`${name} must be a positive integer.`);
    if (this.apiVersion === 'legacy') {
      if (!profileId) throw invalid('profileId is required for legacy update lists.');
      if (
        status === 'draft' ||
        options.after !== undefined ||
        options.organizationId !== undefined
      )
        throw invalid(
          'Draft lists, cursors and organization filters require a current Buffer connection.'
        );
      identifier(profileId, 'profile ID');
      const raw = this.parse(
        z.object({ total: optionalNumber, updates: z.array(row) }),
        await this.rest(
          `/profiles/${encodeURIComponent(profileId)}/updates/${status}.json`,
          undefined,
          { page: options.page, count: options.count, since: options.since, utc: options.utc }
        )
      );
      return { total: raw.total, updates: raw.updates.map(value => this.legacyUpdate(value)) };
    }
    if (options.after !== undefined && options.page !== undefined)
      throw invalid('Use either after or page, not both. Prefer after for the current API.');
    if (options.count !== undefined && options.count > 2_147_483_647)
      throw invalid('count must fit the current API GraphQL Int type.');
    let organizationId = options.organizationId;
    if (profileId !== undefined) {
      const channel = await this.channel(profileId);
      if (organizationId !== undefined && organizationId !== channel.organizationId)
        throw invalid('profileId does not belong to organizationId.');
      organizationId = channel.organizationId;
    }
    organizationId = await this.organization(organizationId);
    const filter = pickDefined({
      channelIds: profileId === undefined ? undefined : [profileId],
      status: [status === 'pending' ? 'scheduled' : status],
      startDate: options.since === undefined ? undefined : dateTime(options.since, true)
    });
    const input = {
      organizationId,
      filter,
      sort: [
        {
          field: status === 'pending' ? 'dueAt' : 'createdAt',
          direction: status === 'pending' ? 'asc' : 'desc'
        }
      ]
    };
    let after = options.after;
    const visited = new Set<string>();
    const page = options.page ?? 1;
    if (page > 100)
      throw invalid(
        'Page-based compatibility is bounded to 100 API requests. Use after to continue without replaying earlier pages.'
      );
    for (let index = 1; index <= page; index++) {
      const data = await this.graph(
        `query($input: PostsInput!, $first: Int, $after: String) { posts(input: $input, first: $first, after: $after) { edges { node { ${postFields} ${this.metricFields(options.includeMetrics)} } } pageInfo { hasNextPage endCursor } } }`,
        pickDefined({ input, first: options.count ?? 20, after })
      );
      const result = this.parse(
        z.object({
          edges: z.array(z.object({ node: graphPostSchema })).nullable(),
          pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: optionalText })
        }),
        data.posts
      );
      if (
        result.pageInfo.hasNextPage &&
        (!result.pageInfo.endCursor ||
          result.pageInfo.endCursor === after ||
          visited.has(result.pageInfo.endCursor))
      )
        throw invalid('Buffer returned invalid or repeated pagination state.');
      if (index === page)
        return {
          updates: (result.edges ?? []).map(value => this.graphUpdate(value.node)),
          pageInfo: result.pageInfo
        };
      if (!result.pageInfo.hasNextPage)
        return { updates: [], pageInfo: { hasNextPage: false } };
      after = result.pageInfo.endCursor!;
      visited.add(after);
    }
    throw invalid('The requested page could not be resolved.');
  }
  private ack(value: unknown): { success: boolean } {
    return this.parse(z.object({ success: z.literal(true) }), value);
  }
  private form(params: Partial<CreateUpdateParams> & { utc?: boolean }) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(
      pickDefined({
        text: params.text,
        shorten: params.shorten,
        now: params.now,
        top: params.top,
        scheduled_at: params.scheduledAt,
        utc: params.utc
      })
    ))
      body.set(key, String(value));
    params.profileIds?.forEach(id =>
      body.append('profile_ids[]', identifier(id, 'profile ID'))
    );
    for (const [key, value] of Object.entries(params.media ?? {}))
      if (value !== undefined) body.set(`media[${key}]`, value);
    return body;
  }
  private graphInput(params: Partial<CreateUpdateParams>) {
    if (
      [params.now === true, params.top === true, params.scheduledAt !== undefined].filter(
        Boolean
      ).length > 1
    )
      throw invalid('Use only one of now, top, and scheduledAt.');
    if (params.saveToDraft && (params.now || params.top || params.scheduledAt !== undefined))
      throw invalid(
        'saveToDraft cannot be combined with publishing or queue scheduling options.'
      );
    if (params.shorten !== undefined)
      throw invalid(
        'The current API controls URL shortening in channel settings, not per post. Omit shorten and configure the channel in Buffer.'
      );
    if (params.media && Object.keys(params.media).some(key => key !== 'photo'))
      throw invalid(
        'Legacy link-preview media fields have no generic current API mapping. Use documented network metadata, or assets for files.'
      );
    if (params.media?.photo !== undefined && params.assets !== undefined)
      throw invalid('Use either media.photo or assets.');
    const assets =
      params.assets ??
      (params.media?.photo === undefined
        ? undefined
        : [{ image: { url: params.media.photo } }]);
    for (const asset of assets ?? []) {
      const types = Object.values(asset).filter(value => value !== undefined);
      if (types.length !== 1)
        throw invalid('Each asset must contain exactly one of image, video, or document.');
      const value = types[0];
      if (!value) throw invalid('Each asset must contain an image, video, or document.');
      const urls = [
        value.url,
        ...('thumbnailUrl' in value && value.thumbnailUrl !== undefined
          ? [value.thumbnailUrl]
          : [])
      ];
      for (const inputUrl of urls) {
        let url: URL;
        try {
          url = new URL(inputUrl);
        } catch {
          throw invalid('Provide absolute public asset and thumbnail URLs.');
        }
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          this.redactor.redactEmbedded(inputUrl) !== inputUrl
        )
          throw invalid(
            'Asset and thumbnail URLs must be public HTTP or HTTPS URLs without connection credentials.'
          );
      }
    }
    if (
      params.metadata &&
      Object.keys(params.metadata).some(
        key =>
          ![
            'bluesky',
            'facebook',
            'google',
            'instagram',
            'linkedin',
            'mastodon',
            'pinterest',
            'substack',
            'threads',
            'tiktok',
            'twitter',
            'youtube'
          ].includes(key)
      )
    )
      throw invalid('Use documented service keys in metadata.');
    return pickDefined({
      text: params.text,
      mode: params.now
        ? 'shareNow'
        : params.top
          ? 'shareNext'
          : params.scheduledAt !== undefined
            ? 'customScheduled'
            : undefined,
      dueAt: params.scheduledAt === undefined ? undefined : dateTime(params.scheduledAt),
      saveToDraft: params.saveToDraft,
      assets,
      metadata: params.metadata
    });
  }
  private rejectNewLegacyFields(params: Partial<CreateUpdateParams>) {
    if (
      params.assets !== undefined ||
      params.metadata !== undefined ||
      params.saveToDraft !== undefined
    )
      throw invalid(
        'assets, metadata, and saveToDraft require a current Buffer connection. Legacy credentials remain on REST.'
      );
  }
  private async postMutation(
    operation: 'createPost' | 'editPost' | 'movePostInQueue',
    input: Row
  ): Promise<BufferUpdate> {
    const types = {
      createPost: 'CreatePostInput',
      editPost: 'EditPostInput',
      movePostInQueue: 'MovePostInQueueInput'
    };
    const data = await this.graph(
      `mutation($input: ${types[operation]}!) { ${operation}(input: $input) { __typename ... on PostActionSuccess { post { ${postFields} } } ${mutationErrorFields} } }`,
      { input }
    );
    const result = this.parse(
      z.object({ __typename: text, post: graphPostSchema.optional() }),
      data[operation]
    );
    if (result.__typename !== 'PostActionSuccess' || !result.post)
      throw invalid(
        `Buffer did not confirm ${operation}. Check permissions and the post state; read it back before retrying.`
      );
    const update = this.graphUpdate(result.post);
    if (
      (input.id !== undefined && update.id !== input.id) ||
      (input.channelId !== undefined && update.profileId !== input.channelId)
    )
      throw invalid('Buffer returned a mutation receipt for a different resource.');
    return update;
  }
  async createUpdate(params: CreateUpdateParams): Promise<{
    success: boolean;
    updates: BufferUpdate[];
    buffer_count?: number;
    buffer_percentage?: number;
  }> {
    if (
      !params.profileIds.length ||
      new Set(params.profileIds).size !== params.profileIds.length
    )
      throw invalid('Provide at least one distinct profile ID.');
    params.profileIds.forEach(id => identifier(id, 'profile ID'));
    if (this.apiVersion === 'legacy') {
      this.rejectNewLegacyFields(params);
      const result = this.parse(
        z.object({
          success: z.literal(true),
          updates: z.array(row),
          buffer_count: optionalNumber,
          buffer_percentage: optionalNumber
        }),
        await this.rest('/updates/create.json', this.form(params))
      );
      return { ...result, updates: result.updates.map(value => this.legacyUpdate(value)) };
    }
    const input = this.graphInput(params);
    for (const id of params.profileIds) await this.channel(id);
    const updates: BufferUpdate[] = [];
    for (const channelId of params.profileIds) {
      try {
        updates.push(
          await this.postMutation('createPost', {
            assets: [],
            mode: 'addToQueue',
            needsApproval: false,
            schedulingType: 'automatic',
            ...input,
            channelId
          })
        );
      } catch (failure) {
        const error = invalid(
          'Buffer did not confirm creation for every profile. This operation is not atomic. Read back the profiles before retrying; acknowledged update IDs are provided when available.'
        );
        error.data.createdUpdateIds = updates.map(update => update.id);
        error.data.createdProfileIds = updates.map(update => update.profileId);
        error.data.unconfirmedProfileId = channelId;
        if (failure instanceof ServiceError) {
          const status = failure.data.upstreamStatus;
          if (
            typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
          )
            error.data.upstreamStatus = status;
          const code = failure.data.upstreamCode;
          if (
            typeof code === 'string' &&
            ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMIT_EXCEEDED'].includes(code)
          )
            error.data.upstreamCode = code;
        }
        throw error;
      }
    }
    return { success: true, updates };
  }
  async editUpdate(
    id: string,
    params: EditUpdateParams
  ): Promise<{ success: boolean; update: BufferUpdate }> {
    identifier(id, 'update ID');
    if (this.apiVersion === 'legacy') {
      this.rejectNewLegacyFields(params);
      const result = this.parse(
        z.object({ success: z.literal(true), update: row }),
        await this.rest(`/updates/${encodeURIComponent(id)}/update.json`, this.form(params))
      );
      const update = this.legacyUpdate(result.update);
      if (update.id !== id) throw invalid('Buffer returned a different edited update.');
      return { success: true, update };
    }
    return {
      success: true,
      update: await this.postMutation('editPost', { ...this.graphInput(params), id })
    };
  }
  async deleteUpdate(id: string) {
    identifier(id, 'update ID');
    if (this.apiVersion === 'legacy')
      return this.ack(
        await this.rest(
          `/updates/${encodeURIComponent(id)}/destroy.json`,
          new URLSearchParams()
        )
      );
    const data = await this.graph(
      `mutation($input: DeletePostInput!) { deletePost(input: $input) { __typename ... on DeletePostSuccess { id } ${mutationErrorFields} } }`,
      { input: { id } }
    );
    const result = this.parse(
      z.object({ __typename: text, id: text.optional() }),
      data.deletePost
    );
    if (result.__typename !== 'DeletePostSuccess' || result.id !== id)
      throw invalid(
        'Buffer did not confirm deletion of the requested update. Read it back before retrying.'
      );
    return { success: true };
  }
  async shareUpdate(id: string): Promise<{ success: boolean; status?: string }> {
    identifier(id, 'update ID');
    if (this.apiVersion === 'legacy')
      return this.ack(
        await this.rest(`/updates/${encodeURIComponent(id)}/share.json`, new URLSearchParams())
      );
    const update = await this.postMutation('editPost', { id, mode: 'shareNow' });
    return { success: true, status: update.status };
  }
  async moveUpdateToTop(id: string) {
    identifier(id, 'update ID');
    if (this.apiVersion === 'graphql')
      return {
        success: true,
        update: await this.postMutation('movePostInQueue', { id, position: 'top' })
      };
    const result = this.parse(
      z.object({ success: z.literal(true), update: row }),
      await this.rest(
        `/updates/${encodeURIComponent(id)}/move_to_top.json`,
        new URLSearchParams()
      )
    );
    const update = this.legacyUpdate(result.update);
    if (update.id !== id) throw invalid('Buffer returned a different queue mutation receipt.');
    return { success: true, update };
  }
  async reorderUpdates(id: string, order: string[], options?: { offset?: number }) {
    if (this.apiVersion === 'graphql') legacyOnly('Reordering a whole queue');
    identifier(id, 'profile ID');
    if (!order.length || new Set(order).size !== order.length)
      throw invalid('Provide distinct update IDs in order.');
    const body = new URLSearchParams();
    order.forEach((value, index) =>
      body.set(`order[${index}]`, identifier(value, 'update ID'))
    );
    if (options?.offset !== undefined) {
      if (!Number.isSafeInteger(options.offset) || options.offset < 0)
        throw invalid('offset must be a nonnegative integer.');
      body.set('offset', String(options.offset));
    }
    return this.queueReceipt(
      await this.rest(`/profiles/${encodeURIComponent(id)}/updates/reorder.json`, body)
    );
  }
  async shuffleUpdates(id: string) {
    if (this.apiVersion === 'graphql') legacyOnly('Shuffling a whole queue');
    identifier(id, 'profile ID');
    return this.queueReceipt(
      await this.rest(
        `/profiles/${encodeURIComponent(id)}/updates/shuffle.json`,
        new URLSearchParams()
      )
    );
  }
  private queueReceipt(value: unknown) {
    const result = this.parse(
      z.object({ success: z.literal(true), updates: z.array(row) }),
      value
    );
    return { success: true, updates: result.updates.map(update => this.legacyUpdate(update)) };
  }
  async getInteractions(
    id: string,
    event: string,
    options: { page?: number; count?: number } = {}
  ) {
    if (this.apiVersion === 'graphql') legacyOnly('Individual interaction records');
    identifier(id, 'update ID');
    identifier(event, 'event');
    for (const value of [options.page, options.count])
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
        throw invalid('page and count must be positive integers.');
    const result = this.parse(
      z.object({ total: optionalNumber, interactions: z.array(row) }),
      await this.rest(`/updates/${encodeURIComponent(id)}/interactions.json`, undefined, {
        event,
        ...options
      })
    );
    const interactions = result.interactions.map(raw => {
      const user = this.parse(row, raw.user ?? {});
      return this.parse(
        z.object({
          id: text.min(1),
          event: text,
          createdAt: optionalNumber,
          username: optionalText,
          avatar: optionalText,
          followers: optionalNumber
        }),
        {
          id: raw.interactionId ?? raw.interaction_id ?? raw.id,
          event: raw.event,
          createdAt: raw.createdAt ?? raw.created_at,
          username: user.username,
          avatar: user.avatarHttps ?? user.avatar_https ?? user.avatar,
          followers: user.followers
        }
      );
    });
    return { total: result.total, interactions };
  }
  async getLinkShares(url: string) {
    if (this.apiVersion === 'graphql') legacyOnly('Network-wide link share counts');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw invalid('Provide an absolute link URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
      throw invalid('Provide an HTTP or HTTPS link without embedded credentials.');
    if (this.redactor.redactEmbedded(url) !== url)
      throw invalid('Do not include connection credentials in a link URL.');
    return this.parse(
      z.object({ shares: z.number().finite().nonnegative() }),
      await this.rest('/links/shares.json', undefined, { url })
    );
  }
  async getConfiguration(organizationId?: string): Promise<{ services: Row }> {
    if (this.apiVersion === 'legacy') {
      if (organizationId !== undefined)
        throw invalid('Organization-specific configuration requires a current connection.');
      return this.parse(
        z.object({ services: row }),
        await this.rest('/info/configuration.json')
      );
    }
    const id = await this.organization(organizationId);
    const data = await this.graph(
      'query($input: ConfigurationInput!) { configuration(input: $input) { services { service channelType content { configurationContentTypes supportedProperties } } } }',
      { input: { organizationId: id } }
    );
    const configuration = this.parse(
      z.object({
        services: z.array(
          z.object({
            service: text,
            channelType: text,
            content: z.array(
              z.object({
                configurationContentTypes: z.array(text),
                supportedProperties: z.array(text)
              })
            )
          })
        )
      }),
      data.configuration
    );
    const services: Row = Object.create(null);
    for (const entry of configuration.services) {
      const previous = services[entry.service];
      const types = row.safeParse(
        previous && typeof previous === 'object' && 'types' in previous ? previous.types : {}
      );
      services[entry.service] = {
        types: {
          ...(types.success ? types.data : {}),
          [entry.channelType]: { content: entry.content }
        }
      };
    }
    return { services };
  }
}
