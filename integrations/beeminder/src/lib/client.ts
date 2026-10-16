import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';

export type BeeminderAuth = {
  token: string;
  username: string;
  authType?: 'oauth' | 'personal_token';
};

let collectErrors = (value: unknown, details: string[], depth = 0): void => {
  if (depth > 5 || details.length >= 5) return;
  if (Array.isArray(value)) {
    for (let item of value) collectErrors(item, details, depth + 1);
  } else if (isApiErrorRecord(value)) {
    for (let [key, item] of Object.entries(value)) {
      if (key === 'code' || key === 'error_code') continue;
      if (typeof item === 'string') {
        pushBoundedApiErrorDetail(details, item, {
          field: ['message', 'error', 'detail', 'error_description'].includes(key)
            ? undefined
            : key
        });
      } else collectErrors(item, details, depth + 1);
    }
  } else pushBoundedApiErrorDetail(details, value);
};

let upstreamCode = (value: unknown, depth = 0): string | undefined => {
  if (!isApiErrorRecord(value) || depth > 5) return undefined;
  let code = readApiErrorText(value.code ?? value.error_code);
  if (code) return code;
  for (let key of ['error', 'errors', 'data']) {
    let nested = value[key];
    for (let item of Array.isArray(nested) ? nested : [nested]) {
      let found = upstreamCode(item, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
};

export let beeminderError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Beeminder',
    reason: 'beeminder_api_error',
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    extractMessage: (failure, helpers) => {
      let response = helpers.getResponseWithBody(failure);
      let body = response?.data;
      let details: string[] = [];
      if (isApiErrorRecord(body)) collectErrors(body.errors ?? body.error, details);
      return details.length
        ? truncateApiErrorMessage(details.join(' - '))
        : helpers.extractMessage(response?.data !== undefined ? { response } : failure, {
            nestedKeys: ['errors', 'error']
          });
    },
    extractUpstreamCode: (_failure, response) => upstreamCode(response?.data)
  });

let segment = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} must not be blank.`);
  return encodeURIComponent(value);
};

export let validateWholeNumber = (value: number | undefined, label: string, minimum = 0) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum)) {
    throw createApiServiceError(`${label} must be a whole number of at least ${minimum}.`);
  }
};

type DatapointInput = {
  value: number;
  timestamp?: number;
  daystamp?: string;
  comment?: string;
  requestid?: string;
};

export class BeeminderClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private username: string;

  constructor(config: BeeminderAuth) {
    if (!config.token.trim()) throw createApiServiceError('A Beeminder token is required.');
    this.username = segment(config.username, 'Username');
    // Old OAuth connections stored the literal "me"; retain their token semantics.
    let oauth = config.authType === 'oauth' || (!config.authType && config.username === 'me');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.beeminder.com/api/v1',
      timeout: 30_000,
      params: { [oauth ? 'access_token' : 'auth_token']: config.token },
      errorAdapter: beeminderError
    });
  }

  private goalPath(goalSlug: string) {
    return `/users/${this.username}/goals/${segment(goalSlug, 'Goal slug')}`;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options: { params?: Record<string, unknown>; data?: unknown; partialBatch?: boolean } = {}
  ) {
    let response = await this.http.request<unknown>({
      method,
      url,
      params: options.params ? pickDefined(options.params) : undefined,
      data: options.data
    });
    let body = response.data;
    if (isApiErrorRecord(body)) {
      let errors = body.errors ?? body.error;
      let hasErrors =
        errors !== undefined &&
        errors !== null &&
        errors !== '' &&
        (!Array.isArray(errors) || errors.length > 0);
      if (hasErrors && !(options.partialBatch && Array.isArray(body.successes))) {
        throw beeminderError({ response: { status: response.status, data: body } });
      }
    }
    return body;
  }

  async getUser(
    params: {
      diffSince?: number;
      skinny?: boolean;
      associations?: boolean;
      emaciated?: boolean;
      datapointsCount?: number;
    } = {}
  ) {
    validateWholeNumber(params.datapointsCount, 'datapointsCount');
    return this.request('GET', `/users/${this.username}.json`, {
      params: {
        diff_since: params.diffSince,
        skinny: params.skinny,
        associations: params.associations,
        emaciated: params.emaciated,
        datapoints_count: params.datapointsCount
      }
    });
  }

  async getGoals(emaciated?: boolean) {
    return this.request('GET', `/users/${this.username}/goals.json`, {
      params: { emaciated }
    });
  }

  async getArchivedGoals(emaciated?: boolean) {
    return this.request('GET', `/users/${this.username}/goals/archived.json`, {
      params: { emaciated }
    });
  }

  async getGoal(goalSlug: string, params: { datapoints?: boolean; emaciated?: boolean } = {}) {
    return this.request('GET', `${this.goalPath(goalSlug)}.json`, { params });
  }

  async createGoal(params: {
    slug: string;
    title: string;
    goalType: string;
    gunits: string;
    goaldate?: number;
    goalval?: number;
    rate?: number;
    initval?: number;
    secret?: boolean;
    datapublic?: boolean;
    tags?: string[];
    pledge?: number;
    datasource?: string;
    dryrun?: boolean;
  }) {
    let { goalType, ...data } = params;
    if (
      [params.goaldate, params.goalval, params.rate].filter(value => value !== undefined)
        .length !== 2
    ) {
      throw createApiServiceError('Provide exactly two of goaldate, goalval, and rate.');
    }
    if (!params.slug.trim() || !params.title.trim() || !params.gunits.trim()) {
      throw createApiServiceError('Goal slug, title, and units must not be blank.');
    }
    return this.request('POST', `/users/${this.username}/goals.json`, {
      data: pickDefined({ ...data, goal_type: goalType })
    });
  }

  async updateGoal(
    goalSlug: string,
    params: {
      title?: string;
      yaxis?: string;
      secret?: boolean;
      datapublic?: boolean;
      roadall?: unknown[];
      tags?: string[];
      callbackUrl?: string;
      datasource?: string;
      tmin?: string;
      tmax?: string;
    }
  ) {
    if (params.roadall !== undefined) {
      if (!params.roadall.length)
        throw createApiServiceError('roadall must contain the complete road matrix.');
      for (let [index, row] of params.roadall.entries()) {
        if (
          !Array.isArray(row) ||
          row.length !== 3 ||
          row.filter(value => value === null).length !== 1
        ) {
          throw createApiServiceError(
            'Each roadall row must contain exactly three values with exactly one null.'
          );
        }
        let [date, value, rate] = row;
        if (
          (date !== null && typeof date !== 'number' && typeof date !== 'string') ||
          (typeof date === 'number' && !Number.isFinite(date)) ||
          (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) ||
          (rate !== null && (typeof rate !== 'number' || !Number.isFinite(rate))) ||
          (index === 0 && (date === null || value === null || rate !== null)) ||
          (date === null && index !== params.roadall.length - 1)
        ) {
          throw createApiServiceError(
            'roadall requires a starting [date, value, null] row; only the final row may have a null date. Values and rates must be numbers or null.'
          );
        }
      }
    }
    let { callbackUrl, ...data } = params;
    let body = pickDefined({ ...data, callback_url: callbackUrl });
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one goal setting to update.');
    return this.request('PUT', `${this.goalPath(goalSlug)}.json`, { data: body });
  }

  async refreshGoal(goalSlug: string) {
    let queued = await this.request('GET', `${this.goalPath(goalSlug)}/refresh_graph.json`);
    if (typeof queued !== 'boolean')
      throw createApiServiceError('Beeminder returned an invalid refresh queue response.', {
        reason: 'beeminder_invalid_response'
      });
    return queued;
  }

  async manageGoal(
    goalSlug: string,
    action: 'shortcircuit' | 'stepdown' | 'cancel_stepdown' | 'uncleme'
  ) {
    return this.request('POST', `${this.goalPath(goalSlug)}/${action}.json`);
  }

  async ratchet(goalSlug: string, newsafety: number, beemergency?: boolean) {
    if (newsafety < 0) throw createApiServiceError('newSafety cannot be negative.');
    if (newsafety === 0 && beemergency !== true) {
      throw createApiServiceError(
        'Set beemergency to true to confirm ratcheting to zero buffer.'
      );
    }
    return this.request('POST', `${this.goalPath(goalSlug)}/ratchet.json`, {
      data: pickDefined({ newsafety, beemergency })
    });
  }

  async getDatapoints(
    goalSlug: string,
    params: { sort?: string; count?: number; page?: number; per?: number } = {}
  ) {
    validateWholeNumber(params.count, 'count');
    validateWholeNumber(params.page, 'page', 1);
    validateWholeNumber(params.per, 'per');
    return this.request('GET', `${this.goalPath(goalSlug)}/datapoints.json`, { params });
  }

  async createDatapoint(goalSlug: string, params: DatapointInput) {
    return this.request('POST', `${this.goalPath(goalSlug)}/datapoints.json`, {
      data: pickDefined(params)
    });
  }

  async createDatapoints(goalSlug: string, datapoints: DatapointInput[]) {
    return this.request('POST', `${this.goalPath(goalSlug)}/datapoints/create_all.json`, {
      data: { datapoints: datapoints.map(item => pickDefined(item)) },
      partialBatch: true
    });
  }

  async updateDatapoint(
    goalSlug: string,
    datapointId: string,
    params: Partial<Omit<DatapointInput, 'requestid'>>
  ) {
    let data = pickDefined(params);
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one datapoint field to update.');
    return this.request(
      'PUT',
      `${this.goalPath(goalSlug)}/datapoints/${segment(datapointId, 'Datapoint ID')}.json`,
      { data }
    );
  }

  async deleteDatapoint(goalSlug: string, datapointId: string) {
    return this.request(
      'DELETE',
      `${this.goalPath(goalSlug)}/datapoints/${segment(datapointId, 'Datapoint ID')}.json`
    );
  }

  async createCharge(params: {
    userId: string;
    amount: number;
    note?: string;
    dryrun?: boolean;
  }) {
    if (params.amount < 1)
      throw createApiServiceError('Charge amount must be at least $1.00 USD.');
    let userId = params.userId;
    if (userId === 'me') {
      let user = await this.getUser();
      if (
        !isApiErrorRecord(user) ||
        typeof user.username !== 'string' ||
        !user.username.trim()
      ) {
        throw createApiServiceError(
          'Beeminder did not return the username needed to create a charge.',
          { reason: 'beeminder_invalid_response' }
        );
      }
      userId = user.username;
    }
    return this.request('POST', '/charges.json', {
      data: pickDefined({
        user_id: userId,
        amount: params.amount,
        note: params.note,
        dryrun: params.dryrun === true ? 'true' : undefined
      })
    });
  }
}
