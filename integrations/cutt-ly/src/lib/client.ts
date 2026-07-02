import { createAxios } from 'slates';

let REGULAR_API_BASE = 'https://cutt.ly/api/api.php';
let TEAM_API_BASE = 'https://cutt.ly/team/API/index.php';

export interface ShortenParams {
  url: string;
  name?: string;
  userDomain?: boolean;
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
  mobile?: 'android' | 'ios' | 'windowsMobile' | 'redirect';
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
}

export interface PasswordParams {
  shortLink: string;
  password: string;
}

export class CuttlyClient {
  private apiKey: string;
  private http: ReturnType<typeof createAxios>;

  constructor(params: { apiKey: string; apiType: 'regular' | 'team' }) {
    this.apiKey = params.apiKey;
    let baseURL = params.apiType === 'team' ? TEAM_API_BASE : REGULAR_API_BASE;
    this.http = createAxios({ baseURL });
  }

  async shortenUrl(params: ShortenParams): Promise<ShortenResult> {
    let queryParams: Record<string, string> = {
      key: this.apiKey,
      short: params.url
    };

    if (params.name) queryParams.name = params.name;
    if (params.userDomain) queryParams.userDomain = '1';
    if (params.noTitle) queryParams.noTitle = '1';
    if (params.publicStats) queryParams.public = '1';

    let response = await this.http.get('', { params: queryParams });
    let urlData = response.data?.url;

    return {
      status: urlData?.status ?? 0,
      date: urlData?.date ?? '',
      shortLink: urlData?.shortLink ?? '',
      fullLink: urlData?.fullLink ?? '',
      title: urlData?.title ?? ''
    };
  }

  async editLink(params: EditParams): Promise<EditResult> {
    let queryParams: Record<string, string> = {
      key: this.apiKey,
      edit: params.shortLink
    };

    if (params.name !== undefined) queryParams.name = params.name;
    if (params.source !== undefined) queryParams.source = params.source;
    if (params.title !== undefined) queryParams.title = params.title;
    if (params.tag !== undefined) queryParams.tag = params.tag;
    if (params.unique !== undefined) queryParams.unique = String(params.unique);
    if (params.mobile !== undefined) queryParams.mobile = params.mobile;
    if (params.destination !== undefined) queryParams.destination = params.destination;
    if (params.packageId !== undefined) queryParams.package_id = params.packageId;
    if (params.referrer !== undefined) queryParams.referrer = params.referrer;
    if (params.expire !== undefined) queryParams.expire = String(params.expire);
    if (params.expireCond !== undefined) queryParams.expireCond = params.expireCond;
    if (params.expireRedirect !== undefined)
      queryParams.expireRedirect = params.expireRedirect;
    if (params.expireUnique !== undefined)
      queryParams.expireUnique = String(params.expireUnique);
    if (params.abtest !== undefined) queryParams.abtest = String(params.abtest);
    if (params.abtestB !== undefined) queryParams.abtest_b = String(params.abtestB);
    if (params.abtestBVariation !== undefined)
      queryParams.abtest_bvariation = params.abtestBVariation;
    if (params.abtestC !== undefined) queryParams.abtest_c = String(params.abtestC);
    if (params.abtestCVariation !== undefined)
      queryParams.abtest_cvariation = params.abtestCVariation;

    let response = await this.http.get('', { params: queryParams });
    let editData = response.data?.url;

    return {
      status: editData?.status ?? 0
    };
  }

  async setPassword(params: PasswordParams): Promise<EditResult> {
    let queryParams: Record<string, string> = {
      key: this.apiKey,
      edit: params.shortLink,
      password: '1'
    };

    let formData = new URLSearchParams();
    formData.append('password', params.password);

    let response = await this.http.post('', formData.toString(), {
      params: queryParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    let editData = response.data?.url;

    return {
      status: editData?.status ?? 0
    };
  }

  async removePassword(shortLink: string): Promise<EditResult> {
    let queryParams: Record<string, string> = {
      key: this.apiKey,
      edit: shortLink,
      password: '1'
    };

    let formData = new URLSearchParams();
    formData.append('password', '');

    let response = await this.http.post('', formData.toString(), {
      params: queryParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    let editData = response.data?.url;

    return {
      status: editData?.status ?? 0
    };
  }

  async deleteLink(shortLink: string): Promise<EditResult> {
    let queryParams: Record<string, string> = {
      key: this.apiKey,
      edit: shortLink,
      delete: '1'
    };

    let response = await this.http.get('', { params: queryParams });
    let editData = response.data?.url;

    return {
      status: editData?.status ?? 0
    };
  }

  async getStats(params: StatsParams): Promise<StatsResult> {
    let queryParams: Record<string, string> = {
      key: this.apiKey,
      stats: params.shortLink
    };

    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;

    let response = await this.http.get('', { params: queryParams });
    let statsData = response.data?.stats;

    let referrers: ReferrerEntry[] = [];
    if (statsData?.refs?.ref && Array.isArray(statsData.refs.ref)) {
      referrers = statsData.refs.ref.map((r: { link?: string; clicks?: number }) => ({
        link: r.link ?? '',
        clicks: r.clicks ?? 0
      }));
    }

    let geography = parseDeviceArray(statsData?.devices?.geo);
    let devices = parseDeviceArray(statsData?.devices?.dev);
    let operatingSystems = parseDeviceArray(statsData?.devices?.sys);
    let browsers = parseDeviceArray(statsData?.devices?.bro);
    let brands = parseDeviceArray(statsData?.devices?.brand);
    let languages = parseDeviceArray(statsData?.devices?.lang);

    let botDetails: BotEntry[] = [];
    if (statsData?.bots?.bots && Array.isArray(statsData.bots.bots)) {
      botDetails = statsData.bots.bots.map((b: { name?: string; clicks?: number }) => ({
        name: b.name ?? '',
        clicks: b.clicks ?? 0
      }));
    }

    return {
      status: statsData?.status ?? 0,
      date: statsData?.date ?? '',
      clicks: statsData?.clicks ?? 0,
      title: statsData?.title ?? '',
      fullLink: statsData?.fullLink ?? '',
      shortLink: statsData?.shortLink ?? '',
      facebook: statsData?.facebook ?? 0,
      twitter: statsData?.twitter ?? 0,
      linkedin: statsData?.linkedin ?? 0,
      rest: statsData?.rest ?? 0,
      botClicks: typeof statsData?.bots === 'number' ? statsData.bots : 0,
      referrers,
      geography,
      devices,
      operatingSystems,
      browsers,
      brands,
      languages,
      botDetails
    };
  }
}

let parseDeviceArray = (data: unknown): DeviceEntry[] => {
  if (!data || !Array.isArray(data)) return [];
  return data.map((d: { tag?: string; clicks?: number }) => ({
    tag: d.tag ?? '',
    clicks: d.clicks ?? 0
  }));
};

let SHORTEN_STATUS_MESSAGES: Record<number, string> = {
  0: 'Unknown server-side error',
  1: 'Link has already been shortened',
  2: 'The entered URL is not valid',
  3: 'The preferred alias/name is already taken',
  4: 'Invalid API key',
  5: 'URL did not pass validation (contains invalid characters)',
  6: 'The URL is from a blocked domain',
  7: 'URL shortened successfully',
  8: 'Monthly link limit reached. Upgrade your subscription to add more links.'
};

let EDIT_STATUS_MESSAGES: Record<number, string> = {
  1: 'Link updated successfully',
  2: 'Could not save changes to database',
  3: 'The URL does not exist or you do not own it',
  4: 'URL validation failed for source or destination'
};

export let getShortenStatusMessage = (status: number): string => {
  return SHORTEN_STATUS_MESSAGES[status] ?? `Unknown status code: ${status}`;
};

export let getEditStatusMessage = (status: number): string => {
  return EDIT_STATUS_MESSAGES[status] ?? `Unknown status code: ${status}`;
};
