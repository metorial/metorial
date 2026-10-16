import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let REGULAR_API_BASE = 'https://cutt.ly/api/api.php';
let TEAM_API_BASE = 'https://cutt.ly/team/API/index.php';

type ApiType = 'regular' | 'team';
export type MobilePlatform = 'android' | 'ios' | 'windowsMobile' | 'redirect';

export interface ShortenParams {
  url: string;
  name?: string;
  userDomain?: boolean;
  domain?: string;
  noTitle?: boolean;
  publicStats?: boolean;
}

export interface ShortenResult {
  status: number;
  date: string;
  shortLink: string;
  fullLink: string;
  title: string;
}

export interface EditParams {
  shortLink: string;
  name?: string;
  source?: string;
  title?: string;
  tag?: string;
  unique?: number;
  mobile?: MobilePlatform;
  destination?: string;
  packageId?: string;
  referrer?: string;
  expire?: number;
  expireCond?: string;
  expireRedirect?: string;
  expireUnique?: number;
  abtest?: number;
  abtestB?: number;
  abtestBVariation?: string;
  abtestC?: number;
  abtestCVariation?: string;
}

export interface EditResult {
  status: number;
}

export interface StatsParams {
  shortLink: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReferrerEntry {
  link: string;
  clicks: number;
}

export interface DeviceEntry {
  tag: string;
  clicks: number;
}

export interface BotEntry {
  name: string;
  clicks: number;
}

export interface StatsResult {
  status: number;
  date: string;
  clicks: number;
  title: string;
  fullLink: string;
  shortLink: string;
  facebook: number;
  twitter: number;
  linkedin: number;
  rest: number;
  botClicks: number;
  referrers: ReferrerEntry[];
  geography: DeviceEntry[];
  devices: DeviceEntry[];
  operatingSystems: DeviceEntry[];
  browsers: DeviceEntry[];
  brands: DeviceEntry[];
  languages: DeviceEntry[];
  botDetails: BotEntry[];
  raw: Record<string, unknown>;
}

export class CuttlyClient {
  private apiType: ApiType;
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { apiKey: string; apiType: ApiType }) {
    if (!params.apiKey.trim()) {
      throw createApiServiceError('A Cutt.ly API key is required.');
    }
    this.apiType = params.apiType;
    this.http = createAuthenticatedAxios({
      baseURL: params.apiType === 'team' ? TEAM_API_BASE : REGULAR_API_BASE,
      params: { key: params.apiKey.trim() },
      contentType: false,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Cutt.ly',
          reason: 'cuttly_api_error'
        })
    });
  }

  private operationParams(action: 'shorten' | 'edit' | 'stats', url: string) {
    return this.apiType === 'team'
      ? { action, url }
      : { [action === 'shorten' ? 'short' : action]: url };
  }

  private readResponse(data: unknown): Record<string, unknown> {
    if (!isApiErrorRecord(data)) {
      throw buildApiServiceError(
        { response: { data } },
        {
          providerLabel: 'Cutt.ly',
          reason: 'cuttly_invalid_response',
          fallbackMessage: 'The API returned an invalid response.'
        }
      );
    }
    if (data.auth === false || data.error) {
      throw buildApiServiceError(
        { response: { data } },
        {
          providerLabel: 'Cutt.ly',
          reason: 'cuttly_api_error',
          fallbackMessage: 'Authentication failed. Check your API key.'
        }
      );
    }
    return data;
  }

  async shortenUrl(params: ShortenParams): Promise<ShortenResult> {
    if (params.domain !== undefined && this.apiType !== 'team') {
      throw createApiServiceError(
        'The domain field is available with the Team API. For the Regular API, use useBrandedDomain.'
      );
    }
    if (this.apiType === 'team' && params.userDomain && !params.domain?.trim()) {
      throw createApiServiceError(
        'Provide domain when using a branded domain with the Team API, for example links.example.com.'
      );
    }
    let response = await this.http.get('', {
      params: {
        ...this.operationParams('shorten', params.url),
        ...pickDefined({
          name: params.name,
          domain: this.apiType === 'team' ? params.domain : undefined,
          userDomain: this.apiType === 'regular' && params.userDomain ? '1' : undefined,
          noTitle: params.noTitle ? '1' : undefined,
          public: params.publicStats ? '1' : undefined
        })
      }
    });
    let data = this.readResponse(response.data);
    let urlData = isApiErrorRecord(data.url) ? data.url : data;
    assertStatus(urlData, 7, SHORTEN_STATUS_MESSAGES, 'shorten URL');
    if (typeof urlData.shortLink !== 'string' || !urlData.shortLink) {
      throw createApiServiceError('Cutt.ly did not return a shortened URL.');
    }
    return {
      status: 7,
      date: readString(urlData.date),
      shortLink: urlData.shortLink,
      fullLink: readString(urlData.fullLink) || params.url,
      title: readString(urlData.title)
    };
  }

  async editLink(params: EditParams): Promise<EditResult> {
    return this.update(params.shortLink, {
      name: params.name,
      source: params.source,
      title: params.title,
      tag: params.tag,
      unique: params.unique,
      mobile: params.mobile,
      destination: params.destination,
      package_id: params.packageId,
      referrer: params.referrer,
      expire: params.expire,
      expireCond: params.expireCond,
      expireRedirect: params.expireRedirect,
      expireUnique: params.expireUnique,
      abtest: params.abtest,
      abtest_b: params.abtestB,
      abtest_bvariation: params.abtestBVariation,
      abtest_c: params.abtestC,
      abtest_cvariation: params.abtestCVariation
    });
  }

  async setPassword(params: { shortLink: string; password: string }): Promise<EditResult> {
    let formData = new FormData();
    formData.append('password', params.password);
    return this.update(params.shortLink, { password: '1' }, formData);
  }

  async removePassword(shortLink: string): Promise<EditResult> {
    return this.setPassword({ shortLink, password: '' });
  }

  async deleteLink(shortLink: string): Promise<EditResult> {
    return this.update(shortLink, { delete: '1' });
  }

  private async update(
    shortLink: string,
    fields: Record<string, string | number | undefined>,
    body?: FormData
  ): Promise<EditResult> {
    let request = {
      params: { ...this.operationParams('edit', shortLink), ...pickDefined(fields) }
    };
    let response = body
      ? await this.http.post('', body, request)
      : await this.http.get('', request);
    let data = this.readResponse(response.data);
    let editData =
      data.status !== undefined ? data : isApiErrorRecord(data.url) ? data.url : data;
    assertStatus(editData, 1, EDIT_STATUS_MESSAGES, 'edit link');
    return { status: 1 };
  }

  async getStats(params: StatsParams): Promise<StatsResult> {
    for (let date of [params.dateFrom, params.dateTo]) {
      if (
        date !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      ) {
        throw createApiServiceError(
          'Analytics dates must be valid dates in YYYY-MM-DD format.'
        );
      }
    }
    if (params.dateFrom && params.dateTo && params.dateFrom > params.dateTo) {
      throw createApiServiceError('dateFrom must be on or before dateTo.');
    }
    let response = await this.http.get('', {
      params: {
        ...this.operationParams('stats', params.shortLink),
        ...pickDefined({ date_from: params.dateFrom, date_to: params.dateTo })
      }
    });
    let data = this.readResponse(response.data);
    let statsData = isApiErrorRecord(data.stats) ? data.stats : data;
    assertStatus(
      statsData,
      1,
      { 0: 'The link does not exist or you do not own it.', 2: 'Invalid API key.' },
      'retrieve analytics'
    );
    let refs = isApiErrorRecord(statsData.refs) ? statsData.refs : {};
    let devices = isApiErrorRecord(statsData.devices) ? statsData.devices : {};
    let bots = isApiErrorRecord(statsData.bots) ? statsData.bots : {};
    let botDetails = parseEntries(bots.bots).map(bot => ({
      name: readString(bot.name),
      clicks: readNumber(bot.clicks)
    }));
    return {
      status: 1,
      date: readString(statsData.date),
      clicks: readNumber(statsData.clicks),
      title: readString(statsData.title),
      fullLink: readString(statsData.fullLink),
      shortLink: readString(statsData.shortLink) || params.shortLink,
      facebook: readNumber(statsData.facebook),
      twitter: readNumber(statsData.twitter),
      linkedin: readNumber(statsData.linkedin),
      rest: readNumber(statsData.rest),
      botClicks: isApiErrorRecord(statsData.bots)
        ? botDetails.reduce((total, bot) => total + bot.clicks, 0)
        : readNumber(statsData.bots),
      referrers: parseEntries(refs.ref).map(ref => ({
        link: readString(ref.link),
        clicks: readNumber(ref.clicks)
      })),
      geography: parseDeviceArray(devices.geo),
      devices: parseDeviceArray(devices.dev),
      operatingSystems: parseDeviceArray(devices.sys),
      browsers: parseDeviceArray(devices.bro),
      brands: parseDeviceArray(devices.brand),
      languages: parseDeviceArray(devices.lang),
      botDetails,
      raw: statsData
    };
  }
}

let readString = (value: unknown): string => (typeof value === 'string' ? value : '');
let readNumber = (value: unknown): number => {
  if (typeof value !== 'number' && typeof value !== 'string') return 0;
  let number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

let parseEntries = (data: unknown): Record<string, unknown>[] => {
  let entries = Array.isArray(data) ? data : isApiErrorRecord(data) ? Object.values(data) : [];
  return entries.filter(isApiErrorRecord);
};

let parseDeviceArray = (data: unknown): DeviceEntry[] =>
  parseEntries(data).map(device => ({
    tag: readString(device.tag),
    clicks: readNumber(device.clicks)
  }));

let assertStatus = (
  data: Record<string, unknown>,
  expectedStatus: number,
  messages: Record<number, string>,
  operation: string
) => {
  let status = readNumber(data.status);
  if (status !== expectedStatus) {
    throw createApiServiceError(
      `Cutt.ly failed to ${operation}: ${messages[status] ?? `Unexpected status ${status}.`}`,
      { reason: 'cuttly_api_error', upstreamCode: String(status) }
    );
  }
};

let SHORTEN_STATUS_MESSAGES: Record<number, string> = {
  0: 'The API returned an unexpected response.',
  1: 'The URL already belongs to a shortening domain.',
  2: 'The entered URL is not valid.',
  3: 'The preferred alias is already taken.',
  4: 'Invalid API key.',
  5: 'The URL contains invalid characters.',
  6: 'The URL is from a blocked domain.',
  8: 'Monthly link limit reached. Upgrade your subscription to add more links.'
};

let EDIT_STATUS_MESSAGES: Record<number, string> = {
  0: 'The API returned an unexpected response.',
  2: 'Could not save changes to the database.',
  3: 'The URL does not exist or you do not own it.',
  4: 'URL validation failed for source or destination.'
};
