import { buildApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';

let BASE_URL = 'https://api.waiverfile.com/api/v1';

export class WaiverFileClient {
  private apiKey: string;
  private siteId: string;
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(opts: { token: string; siteId: string }) {
    this.apiKey = opts.token;
    this.siteId = opts.siteId;
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'WaiverFile',
          reason: 'waiverfile_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
          detailKeys: ['Message', 'ExceptionMessage', 'message', 'error', 'detail', 'code'],
          nestedKeys: ['errors', 'ModelState'],
          extractUpstreamCode: (_failure, response, helpers) => {
            if (!helpers.isRecord(response?.data)) return undefined;
            let code = response.data.Code ?? response.data.code;
            return typeof code === 'string' || typeof code === 'number'
              ? String(code)
              : undefined;
          }
        })
    });
  }

  private authParams() {
    return {
      apiKey: this.apiKey,
      siteID: this.siteId
    };
  }

  // ── Site ──────────────────────────────────────────────

  async getSiteDetails() {
    let { data } = await this.http.get('/GetSiteDetails', {
      params: this.authParams()
    });
    return data;
  }

  async ping() {
    let { data } = await this.http.get('/Ping', {
      params: this.authParams()
    });
    return data;
  }

  // ── Waivers ──────────────────────────────────────────

  async getWaiver(waiverId: string) {
    let { data } = await this.http.get('/GetWaiver', {
      params: { ...this.authParams(), waiverID: waiverId }
    });
    return data;
  }

  async getWaiverPDF(waiverId: string) {
    let { data } = await this.http.get('/GetWaiverPDF', {
      params: { ...this.authParams(), waiverID: waiverId }
    });
    return data;
  }

  async searchWaivers(terms: string) {
    let { data } = await this.http.get('/SearchWaivers', {
      params: { ...this.authParams(), terms }
    });
    return data;
  }

  async getWaiversByReferenceID(opts: {
    refId1?: string;
    refId2?: string;
    refId3?: string;
    refIdAny?: string;
  }) {
    let params: Record<string, string> = { ...this.authParams() };
    if (opts.refId1) params.refID1 = opts.refId1;
    if (opts.refId2) params.refID2 = opts.refId2;
    if (opts.refId3) params.refID3 = opts.refId3;
    if (opts.refIdAny) params.refIDAny = opts.refIdAny;

    let { data } = await this.http.get('/GetWaiversByReferenceID', { params });
    return data;
  }

  async getWaiverData(opts: {
    startDate: string;
    endDate: string;
    includeCustomColumns: boolean;
    consolidateParticipants: boolean;
    pageIndex: number;
    pageSize: number;
  }) {
    let { data } = await this.http.get('/GetWaiverData', {
      params: {
        ...this.authParams(),
        startDate: opts.startDate,
        endDate: opts.endDate,
        includeCustomColumns: opts.includeCustomColumns,
        consolidateParticipants: opts.consolidateParticipants,
        pageIndex: opts.pageIndex,
        pageSize: opts.pageSize
      }
    });
    return data;
  }

  async getWaiverDataCount(opts: { startDate: string; endDate: string }) {
    let { data } = await this.http.get('/GetWaiverDataCount', {
      params: {
        ...this.authParams(),
        startDate: opts.startDate,
        endDate: opts.endDate
      }
    });
    return data;
  }

  async getAllWaiversByDateRange(opts: {
    startDate: string;
    endDate: string;
    pageIndex: number;
    pageSize: number;
  }) {
    let { data } = await this.http.get('/GetAllWaiversByDateRange', {
      params: {
        ...this.authParams(),
        startDate: opts.startDate,
        endDate: opts.endDate,
        pageIndex: opts.pageIndex,
        pageSize: opts.pageSize
      }
    });
    return data;
  }

  async getWaiversForEvent(waiverEventId: string) {
    let { data } = await this.http.get('/GetWaiversForEvent', {
      params: { ...this.authParams(), waiverEventID: waiverEventId }
    });
    return data;
  }

  // ── Waiver Forms ─────────────────────────────────────

  async getActiveWaiverForms() {
    let { data } = await this.http.get('/GetActiveWaiverForms', {
      params: this.authParams()
    });
    return data;
  }

  async getAllWaiverForms() {
    let { data } = await this.http.get('/GetAllWaiverForms', {
      params: this.authParams()
    });
    return data;
  }

  // ── Events ───────────────────────────────────────────

  async getEventsByDateRange(opts: { startDate: string; endDate: string }) {
    let { data } = await this.http.get('/GetEventsByDateRange', {
      params: {
        ...this.authParams(),
        startDateUTC: opts.startDate,
        endDateUTC: opts.endDate
      }
    });
    return data;
  }

  async getEventsByCategory(opts: {
    eventCategoryId: string;
    startDate: string;
    endDate: string;
  }) {
    let { data } = await this.http.get('/GetEventsByCategory', {
      params: {
        ...this.authParams(),
        eventCategoryID: opts.eventCategoryId,
        startDateUTC: opts.startDate,
        endDateUTC: opts.endDate
      }
    });
    return data;
  }

  async getUpcomingEvents(opts: { startDate: string; endDate: string }) {
    let { data } = await this.http.get('/GetUpcomingEvents', {
      params: {
        ...this.authParams(),
        startDateUTC: opts.startDate,
        endDateUTC: opts.endDate
      }
    });
    return data;
  }

  async insertEvent(opts: {
    eventName: string;
    dateStart: string;
    dateEnd: string;
    isAllDay?: boolean;
    eventCategoryId?: string;
    managerEmailList?: string;
    managerEmailMessage?: string;
    waiverFormIdList?: string;
    eventLocation?: string;
    signingCutoff?: string;
    maxParticipants?: number;
    workflowIdList?: string;
  }) {
    let { data } = await this.http.post(
      '/InsertEvent',
      pickDefined({
        EventName: opts.eventName,
        DateStart: opts.dateStart,
        DateEnd: opts.dateEnd,
        IsAllDay: opts.isAllDay ?? false,
        EventCategoryID: opts.eventCategoryId,
        ManagerEmailList: opts.managerEmailList,
        ManagerEmailMessage: opts.managerEmailMessage,
        WaiverFormIDList: opts.waiverFormIdList,
        EventLocation: opts.eventLocation,
        SigningCutoff: opts.signingCutoff,
        MaxParticipants: opts.maxParticipants,
        WorkflowIDList: opts.workflowIdList,
        APIKey: this.apiKey,
        SiteID: this.siteId
      })
    );
    return data;
  }

  async updateEvent(opts: {
    eventId: string;
    eventName: string;
    dateStart: string;
    dateEnd: string;
    isAllDay: boolean;
    eventCategoryId: string;
    waiverFormIds?: string[];
  }) {
    let { data } = await this.http.post('/UpdateEvent', opts.waiverFormIds ?? [], {
      params: {
        ...this.authParams(),
        eventID: opts.eventId,
        eventName: opts.eventName,
        dateStart: opts.dateStart,
        dateEnd: opts.dateEnd,
        isAllDay: opts.isAllDay,
        eventCategoryID: opts.eventCategoryId
      }
    });
    return data;
  }

  async deleteEvent(eventId: string) {
    let { data } = await this.http.get('/DeleteEvent', {
      params: { ...this.authParams(), eventID: eventId }
    });
    return data;
  }

  // ── Event Categories ─────────────────────────────────

  async getEventCategories(includeDisabled: boolean = false) {
    let { data } = await this.http.get('/GetEventCategories', {
      params: {
        ...this.authParams(),
        includeDisabledCategories: includeDisabled
      }
    });
    return data;
  }

  async insertEventCategory(opts: { name: string; active: boolean }) {
    let { data } = await this.http.post('/InsertEventCategory', null, {
      params: {
        ...this.authParams(),
        name: opts.name,
        active: opts.active
      }
    });
    return data;
  }

  async updateEventCategory(opts: { eventCategoryId: string; name: string; active: boolean }) {
    let { data } = await this.http.post('/UpdateEventCategory', null, {
      params: {
        ...this.authParams(),
        eventCategoryID: opts.eventCategoryId,
        name: opts.name,
        active: opts.active
      }
    });
    return data;
  }

  async deleteEventCategory(eventCategoryId: string) {
    let { data } = await this.http.post('/DeleteEventCategory', null, {
      params: {
        ...this.authParams(),
        eventCategoryID: eventCategoryId
      }
    });
    return data;
  }

  // ── Event Managers ───────────────────────────────────

  async inviteEventManagers(opts: {
    eventId: string;
    emailAddresses: string;
    managerEmailMessage?: string;
    skipSendingEmailIfAccountExists?: boolean;
  }) {
    let { data } = await this.http.post('/InviteEventManagers', null, {
      params: {
        ...this.authParams(),
        eventID: opts.eventId,
        emailAddresses: opts.emailAddresses,
        managerEmailMessage: opts.managerEmailMessage ?? '',
        skipSendingEmailIfAccountExists: opts.skipSendingEmailIfAccountExists ?? false
      }
    });
    return data;
  }

  async removeEventManagers(opts: { eventId: string; emailAddresses: string }) {
    let { data } = await this.http.post('/RemoveEventManagers', null, {
      params: {
        ...this.authParams(),
        eventID: opts.eventId,
        emailAddresses: opts.emailAddresses
      }
    });
    return data;
  }

  // ── Webhooks / Subscriptions ─────────────────────────

  async subscribeWebhook(eventType: string, targetUrl: string) {
    let { data } = await this.http.post(`/subscribe/${eventType}`, null, {
      params: {
        ...this.authParams(),
        targetUrl
      }
    });
    return data;
  }

  async deleteWebhookSubscription(eventType: string) {
    let { data } = await this.http.delete(`/deletesubscribe/${eventType}`, {
      params: this.authParams()
    });
    return data;
  }
}
