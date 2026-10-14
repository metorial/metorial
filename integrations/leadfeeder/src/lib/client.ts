import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios
} from 'slates';

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

export interface LeadfeederAccount {
  accountId: string;
  name: string;
  subscription: string;
  timezone: string;
  websiteTrackingStatus: string;
}

export interface LeadLocation {
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  stateCode: string;
}

export interface Lead {
  leadId: string;
  name: string;
  industry: string;
  industries: string[];
  firstVisitDate: string;
  lastVisitDate: string;
  status: string;
  websiteUrl: string;
  phone: string;
  linkedinUrl: string;
  twitterHandle: string;
  facebookUrl: string;
  employeeCount: number;
  employeesRange: { min: number; max: number } | null;
  employeeRangeBounds?: { min: number | null; max: number | null } | null;
  crmLeadId: string;
  crmOrganizationId: string;
  tags: string[];
  logoUrl: string;
  assignee: string;
  businessId: string;
  revenue: string;
  emailedTo: string;
  viewInLeadfeeder: string;
  visits: number;
  quality: number;
  location: LeadLocation | null;
}

export interface VisitRouteStep {
  hostname: string;
  pagePath: string;
  previousPagePath: string;
  timeOnPage: number;
  pageTitle: string;
  pageUrl: string;
  displayPageName: string;
}

export interface Visit {
  visitId: string;
  source: string;
  medium: string;
  campaign: string;
  referringUrl: string;
  pageDepth: number;
  landingPagePath: string;
  visitRoute: VisitRouteStep[];
  keyword: string;
  queryTerm: string;
  visitLength: number;
  startedAt: string;
  leadId: string;
  lfClientId: string;
  gaClientIds: string[];
  visitorEmail: string;
  visitorFirstName: string;
  visitorLastName: string;
  countryCode: string;
  deviceType: string;
}

export interface CustomFeed {
  feedId: string;
  name: string;
  criteria: any[];
}

export interface ExportRequest {
  exportId: string;
  status: string;
  createdAt: string;
  statusUrl: string;
  downloadUrl: string;
}

export interface TrackingScript {
  scriptHash: string;
  scriptHtml: string;
  timezone: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageUrl: string | null;
  totalPages: number | null;
}

let mapLocation = (locationData: any): LeadLocation | null => {
  if (!locationData?.attributes) return null;
  let attrs = locationData.attributes;
  return {
    country: attrs.country ?? '',
    countryCode: attrs.country_code ?? '',
    region: attrs.region ?? '',
    regionCode: attrs.region_code ?? '',
    city: attrs.city ?? '',
    stateCode: attrs.state_code ?? ''
  };
};

let mapLead = (leadData: any, included?: any[]): Lead => {
  if (!leadData) {
    throw createApiServiceError('Leadfeeder returned a response without the requested lead.');
  }
  let attrs = leadData.attributes ?? {};
  let range = attrs.employees_range;
  let locationRel = leadData.relationships?.location?.data;
  let location: LeadLocation | null = null;

  if (locationRel && included) {
    let locationData = included.find(
      (inc: any) => inc.type === 'locations' && inc.id === locationRel.id
    );
    if (locationData) {
      location = mapLocation(locationData);
    }
  }

  return {
    leadId: leadData.id ?? '',
    name: attrs.name ?? '',
    industry: attrs.industry ?? '',
    industries: (attrs.industries ?? []).map((industry: string | { name: string }) =>
      typeof industry === 'string' ? industry : industry.name
    ),
    firstVisitDate: attrs.first_visit_date ?? '',
    lastVisitDate: attrs.last_visit_date ?? '',
    status: attrs.status ?? '',
    websiteUrl: attrs.website_url ?? '',
    phone: attrs.phone ?? '',
    linkedinUrl: attrs.linkedin_url ?? '',
    twitterHandle: attrs.twitter_handle ?? '',
    facebookUrl: attrs.facebook_url ?? '',
    employeeCount: attrs.employee_count ?? 0,
    employeesRange:
      typeof range?.min === 'number' && typeof range?.max === 'number' ? range : null,
    employeeRangeBounds: range ? { min: range.min ?? null, max: range.max ?? null } : null,
    crmLeadId: String(attrs.crm_lead_id ?? ''),
    crmOrganizationId: String(attrs.crm_organization_id ?? ''),
    tags: attrs.tags ?? [],
    logoUrl: attrs.logo_url ?? '',
    assignee: attrs.assignee ?? '',
    businessId: attrs.business_id ?? '',
    revenue: attrs.revenue ?? '',
    emailedTo: attrs.emailed_to ?? '',
    viewInLeadfeeder: attrs.view_in_leadfeeder ?? '',
    visits: attrs.visits ?? 0,
    quality: attrs.quality ?? 0,
    location
  };
};

let mapVisit = (visitData: any): Visit => {
  let attrs = visitData.attributes ?? {};
  return {
    visitId: visitData.id ?? '',
    source: attrs.source ?? '',
    medium: attrs.medium ?? '',
    campaign: attrs.campaign ?? '',
    referringUrl: attrs.referring_url ?? '',
    pageDepth: attrs.page_depth ?? 0,
    landingPagePath: attrs.landing_page_path ?? '',
    visitRoute: (attrs.visit_route ?? []).map((step: any) => ({
      hostname: step.hostname ?? '',
      pagePath: step.page_path ?? '',
      previousPagePath: step.previous_page_path ?? '',
      timeOnPage: step.time_on_page ?? 0,
      pageTitle: step.page_title ?? '',
      pageUrl: step.page_url ?? '',
      displayPageName: step.display_page_name ?? ''
    })),
    keyword: attrs.keyword ?? '',
    queryTerm: attrs.query_term ?? '',
    visitLength: attrs.visit_length ?? 0,
    startedAt: attrs.started_at ?? '',
    leadId: attrs.lead_id ?? '',
    lfClientId: String(attrs.lf_client_id ?? ''),
    gaClientIds: attrs.ga_client_ids ?? [],
    visitorEmail: attrs.visitor_email ?? '',
    visitorFirstName: attrs.visitor_first_name ?? '',
    visitorLastName: attrs.visitor_last_name ?? '',
    countryCode: attrs.country_code ?? '',
    deviceType: attrs.device_type ?? ''
  };
};

export class LeadfeederClient {
  private http;

  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.leadfeeder.com',
      authHeader: { value: `Token token=${token}` },
      contentType: false,
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let details: string[] = [];
          collectApiErrorDetails(error.response?.data, details, {
            detailKeys: ['title', 'detail', 'message', 'code']
          });
          return details.length ? { message: details.join(' - ') } : inferred;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Leadfeeder',
          reason: 'leadfeeder_api_error'
        })
    });
  }

  async resolveAccountId(accountId?: string): Promise<string> {
    if (accountId) return accountId;
    let accounts = await this.getAccounts();
    if (!accounts[0]) {
      throw createApiServiceError(
        'No Leadfeeder accounts are available for this token. Check its account access.'
      );
    }
    return accounts[0].accountId;
  }

  private validateParams(params: DateRangeParams & PaginationParams) {
    let dates: [string, string][] = [
      ['startDate', params.startDate],
      ['endDate', params.endDate]
    ];
    for (let [name, value] of dates) {
      let date = new Date(`${value}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        throw createApiServiceError(`${name} must be a valid date in yyyy-mm-dd format.`);
      }
    }
    if (params.startDate > params.endDate) {
      throw createApiServiceError('startDate must be on or before endDate.');
    }
    if (
      params.pageNumber !== undefined &&
      (!Number.isInteger(params.pageNumber) || params.pageNumber < 1)
    ) {
      throw createApiServiceError('pageNumber must be a whole number greater than zero.');
    }
    if (
      params.pageSize !== undefined &&
      (!Number.isInteger(params.pageSize) || params.pageSize < 1 || params.pageSize > 100)
    ) {
      throw createApiServiceError('pageSize must be a whole number from 1 to 100.');
    }
  }

  async getAccounts(): Promise<LeadfeederAccount[]> {
    let response = await this.http.get('/accounts');
    let data = response.data?.data ?? [];
    return data.map((account: any) => ({
      accountId: account.id,
      name: account.attributes?.name ?? '',
      subscription: account.attributes?.subscription ?? '',
      timezone: account.attributes?.timezone ?? '',
      websiteTrackingStatus: account.attributes?.website_tracking_status ?? ''
    }));
  }

  async getAccount(accountId: string): Promise<LeadfeederAccount> {
    let response = await this.http.get(`/accounts/${encodeURIComponent(accountId)}`);
    let account = response.data?.data;
    if (!account) {
      throw createApiServiceError(
        'Leadfeeder returned a response without the requested account.'
      );
    }
    return {
      accountId: account.id,
      name: account.attributes?.name ?? '',
      subscription: account.attributes?.subscription ?? '',
      timezone: account.attributes?.timezone ?? '',
      websiteTrackingStatus: account.attributes?.website_tracking_status ?? ''
    };
  }

  async getLeads(
    accountId: string,
    params: DateRangeParams & PaginationParams & { customFeedId?: string }
  ): Promise<PaginatedResponse<Lead>> {
    this.validateParams(params);
    let basePath = params.customFeedId
      ? `/accounts/${encodeURIComponent(accountId)}/custom-feeds/${encodeURIComponent(params.customFeedId)}/leads`
      : `/accounts/${encodeURIComponent(accountId)}/leads`;

    let response = await this.http.get(basePath, {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        'page[number]': params.pageNumber ?? 1,
        'page[size]': params.pageSize ?? 100
      }
    });

    let items = (response.data?.data ?? []).map((lead: any) =>
      mapLead(lead, response.data?.included)
    );

    return {
      items,
      nextPageUrl: response.data?.links?.next ?? null,
      totalPages: null
    };
  }

  async getLead(accountId: string, leadId: string): Promise<Lead> {
    let response = await this.http.get(
      `/accounts/${encodeURIComponent(accountId)}/leads/${encodeURIComponent(leadId)}`
    );
    return mapLead(response.data?.data, response.data?.included);
  }

  async getVisitsForLead(
    accountId: string,
    leadId: string,
    params: DateRangeParams & PaginationParams
  ): Promise<PaginatedResponse<Visit>> {
    this.validateParams(params);
    let response = await this.http.get(
      `/accounts/${encodeURIComponent(accountId)}/leads/${encodeURIComponent(leadId)}/visits`,
      {
        params: {
          start_date: params.startDate,
          end_date: params.endDate,
          'page[number]': params.pageNumber ?? 1,
          'page[size]': params.pageSize ?? 100
        }
      }
    );

    let items = (response.data?.data ?? []).map(mapVisit);
    return {
      items,
      nextPageUrl: response.data?.links?.next ?? null,
      totalPages: null
    };
  }

  async getVisits(
    accountId: string,
    params: DateRangeParams & PaginationParams
  ): Promise<PaginatedResponse<Visit>> {
    this.validateParams(params);
    let response = await this.http.get(`/accounts/${encodeURIComponent(accountId)}/visits`, {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        'page[number]': params.pageNumber ?? 1,
        'page[size]': params.pageSize ?? 100
      }
    });

    let items = (response.data?.data ?? []).map(mapVisit);
    return {
      items,
      nextPageUrl: response.data?.links?.next ?? null,
      totalPages: null
    };
  }

  async getCustomFeeds(accountId: string): Promise<CustomFeed[]> {
    let response = await this.http.get(
      `/accounts/${encodeURIComponent(accountId)}/custom-feeds`
    );
    return (response.data?.data ?? []).map((feed: any) => ({
      feedId: feed.id,
      name: feed.attributes?.name ?? '',
      criteria: feed.attributes?.criteria ?? []
    }));
  }

  async getCustomFeed(accountId: string, feedId: string): Promise<CustomFeed> {
    let response = await this.http.get(
      `/accounts/${encodeURIComponent(accountId)}/custom-feeds/${encodeURIComponent(feedId)}`
    );
    let feed = response.data?.data;
    if (!feed) {
      throw createApiServiceError(
        'Leadfeeder returned a response without the requested feed.'
      );
    }
    return {
      feedId: feed.id,
      name: feed.attributes?.name ?? '',
      criteria: feed.attributes?.criteria ?? []
    };
  }

  async createExportRequest(
    accountId: string,
    customFeedId: string,
    params: DateRangeParams
  ): Promise<ExportRequest> {
    this.validateParams(params);
    let response = await this.http.post(
      '/export-requests',
      new URLSearchParams({
        account_id: accountId,
        custom_feed_id: customFeedId,
        start_date: params.startDate,
        end_date: params.endDate
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    let exp = response.data?.data;
    if (!exp) {
      throw createApiServiceError(
        'Leadfeeder returned a response without the export request.'
      );
    }
    return {
      exportId: exp.id,
      status: exp.attributes?.status ?? '',
      createdAt: exp.attributes?.created_at ?? '',
      statusUrl: exp.attributes?.status_url ?? '',
      downloadUrl: exp.attributes?.download_url ?? ''
    };
  }

  async getExportStatus(exportId: string): Promise<ExportRequest> {
    let response = await this.http.get(`/export-requests/${encodeURIComponent(exportId)}`);
    let exp = response.data?.data;
    if (!exp) {
      throw createApiServiceError(
        'Leadfeeder returned a response without the export request.'
      );
    }
    return {
      exportId: exp.id,
      status: exp.attributes?.status ?? '',
      createdAt: exp.attributes?.created_at ?? '',
      statusUrl: exp.attributes?.status_url ?? '',
      downloadUrl: exp.attributes?.download_url ?? ''
    };
  }

  async getTrackingScript(accountId: string): Promise<TrackingScript> {
    let response = await this.http.get(
      `/accounts/${encodeURIComponent(accountId)}/website-tracking-script`
    );
    let script = response.data?.data;
    return {
      scriptHash: script.attributes?.script_hash ?? '',
      scriptHtml: script.attributes?.script_html ?? '',
      timezone: script.attributes?.timezone ?? ''
    };
  }
}
