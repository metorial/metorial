import { createAxios } from 'slates';

export interface EventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  optional?: boolean;
  responseStatus?: string;
  comment?: string;
}

export interface EventReminder {
  method: string;
  minutes: number;
}

export interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: EventDateTime;
  end?: EventDateTime;
  attendees?: EventAttendee[];
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: EventReminder[];
  };
  colorId?: string;
  visibility?: string;
  transparency?: string;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  creator?: { email?: string; displayName?: string };
  organizer?: { email?: string; displayName?: string };
  conferenceData?: any;
  hangoutLink?: string;
  eventType?: string;
  recurringEventId?: string;
  originalStartTime?: EventDateTime;
  iCalUID?: string;
  sequence?: number;
  guestsCanModify?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  source?: { url?: string; title?: string };
  attachments?: any[];
}

export interface Calendar {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  timeZone?: string;
  conferenceProperties?: any;
}

export interface CalendarListEntry {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: string;
  defaultReminders?: EventReminder[];
  primary?: boolean;
  summaryOverride?: string;
}

export interface AclRule {
  id?: string;
  scope?: { type: string; value?: string };
  role?: string;
  etag?: string;
}

export interface FreeBusyRequest {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  groupExpansionMax?: number;
  calendarExpansionMax?: number;
  items: { id: string }[];
}

export interface ListEventsParams {
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
  q?: string;
  maxResults?: number;
  pageToken?: string;
  singleEvents?: boolean;
  orderBy?: string;
  updatedMin?: string;
  showDeleted?: boolean;
  syncToken?: string;
  timeZone?: string;
}

export interface WatchRequest {
  id: string;
  type: string;
  address: string;
  token?: string;
  expiration?: string;
}

export interface WatchResponse {
  kind?: string;
  id?: string;
  resourceId?: string;
  resourceUri?: string;
  token?: string;
  expiration?: string;
}

export class GoogleCalendarClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: 'https://www.googleapis.com/calendar/v3',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Events

  async listEvents(params: ListEventsParams): Promise<{
    items: CalendarEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
  }> {
    let { calendarId, ...queryParams } = params;
    let searchParams: Record<string, any> = {};

    for (let [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        searchParams[key] = value;
      }
    }

    let response = await this.api.get(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      params: searchParams
    });
    return response.data;
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    let response = await this.api.get(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );
    return response.data;
  }

  async createEvent(
    calendarId: string,
    event: CalendarEvent,
    options?: { sendUpdates?: string; conferenceDataVersion?: number }
  ): Promise<CalendarEvent> {
    let params: Record<string, string | number> = {};
    if (options?.sendUpdates) params.sendUpdates = options.sendUpdates;
    if (options?.conferenceDataVersion !== undefined)
      params.conferenceDataVersion = options.conferenceDataVersion;

    let response = await this.api.post(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      event,
      { params }
    );
    return response.data;
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>,
    options?: { sendUpdates?: string; conferenceDataVersion?: number }
  ): Promise<CalendarEvent> {
    let params: Record<string, string | number> = {};
    if (options?.sendUpdates) params.sendUpdates = options.sendUpdates;
    if (options?.conferenceDataVersion !== undefined)
      params.conferenceDataVersion = options.conferenceDataVersion;

    let response = await this.api.patch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      event,
      { params }
    );
    return response.data;
  }

  async deleteEvent(
    calendarId: string,
    eventId: string,
    options?: { sendUpdates?: string }
  ): Promise<void> {
    let params: Record<string, string> = {};
    if (options?.sendUpdates) params.sendUpdates = options.sendUpdates;

    await this.api.delete(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { params }
    );
  }

  async moveEvent(
    calendarId: string,
    eventId: string,
    destinationCalendarId: string,
    options?: { sendUpdates?: string }
  ): Promise<CalendarEvent> {
    let params: Record<string, string> = {
      destination: destinationCalendarId
    };
    if (options?.sendUpdates) params.sendUpdates = options.sendUpdates;

    let response = await this.api.post(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/move`,
      {},
      { params }
    );
    return response.data;
  }

  async quickAddEvent(
    calendarId: string,
    text: string,
    options?: { sendUpdates?: string }
  ): Promise<CalendarEvent> {
    let params: Record<string, string> = { text };
    if (options?.sendUpdates) params.sendUpdates = options.sendUpdates;

    let response = await this.api.post(
      `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd`,
      {},
      { params }
    );
    return response.data;
  }

  // Calendars

  async getCalendar(calendarId: string): Promise<Calendar> {
    let response = await this.api.get(`/calendars/${encodeURIComponent(calendarId)}`);
    return response.data;
  }

  async createCalendar(calendar: {
    summary: string;
    description?: string;
    location?: string;
    timeZone?: string;
  }): Promise<Calendar> {
    let response = await this.api.post('/calendars', calendar);
    return response.data;
  }

  async updateCalendar(calendarId: string, calendar: Partial<Calendar>): Promise<Calendar> {
    let response = await this.api.patch(
      `/calendars/${encodeURIComponent(calendarId)}`,
      calendar
    );
    return response.data;
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.api.delete(`/calendars/${encodeURIComponent(calendarId)}`);
  }

  // Calendar List

  async listCalendarList(params?: {
    maxResults?: number;
    pageToken?: string;
    showDeleted?: boolean;
    showHidden?: boolean;
    syncToken?: string;
  }): Promise<{
    items: CalendarListEntry[];
    nextPageToken?: string;
    nextSyncToken?: string;
  }> {
    let response = await this.api.get('/users/me/calendarList', { params });
    return response.data;
  }

  async getCalendarListEntry(calendarId: string): Promise<CalendarListEntry> {
    let response = await this.api.get(
      `/users/me/calendarList/${encodeURIComponent(calendarId)}`
    );
    return response.data;
  }

  async addCalendarToList(
    calendarId: string,
    options?: {
      colorId?: string;
      hidden?: boolean;
      selected?: boolean;
      summaryOverride?: string;
    }
  ): Promise<CalendarListEntry> {
    let response = await this.api.post('/users/me/calendarList', {
      id: calendarId,
      ...options
    });
    return response.data;
  }

  async updateCalendarListEntry(
    calendarId: string,
    updates: Partial<CalendarListEntry>
  ): Promise<CalendarListEntry> {
    let response = await this.api.patch(
      `/users/me/calendarList/${encodeURIComponent(calendarId)}`,
      updates
    );
    return response.data;
  }

  async removeCalendarFromList(calendarId: string): Promise<void> {
    await this.api.delete(`/users/me/calendarList/${encodeURIComponent(calendarId)}`);
  }

  // ACLs

  async listAcl(calendarId: string): Promise<{ items: AclRule[] }> {
    let response = await this.api.get(`/calendars/${encodeURIComponent(calendarId)}/acl`);
    return response.data;
  }

  async insertAcl(
    calendarId: string,
    rule: { scope: { type: string; value?: string }; role: string }
  ): Promise<AclRule> {
    let response = await this.api.post(
      `/calendars/${encodeURIComponent(calendarId)}/acl`,
      rule
    );
    return response.data;
  }

  async updateAcl(
    calendarId: string,
    ruleId: string,
    rule: { role: string }
  ): Promise<AclRule> {
    let response = await this.api.patch(
      `/calendars/${encodeURIComponent(calendarId)}/acl/${encodeURIComponent(ruleId)}`,
      rule
    );
    return response.data;
  }

  async deleteAcl(calendarId: string, ruleId: string): Promise<void> {
    await this.api.delete(
      `/calendars/${encodeURIComponent(calendarId)}/acl/${encodeURIComponent(ruleId)}`
    );
  }

  // Free/Busy

  async queryFreeBusy(request: FreeBusyRequest): Promise<{
    kind: string;
    timeMin: string;
    timeMax: string;
    calendars: Record<
      string,
      {
        busy: Array<{ start: string; end: string }>;
        errors?: Array<{ domain: string; reason: string }>;
      }
    >;
    groups?: Record<string, { calendars: string[]; errors?: any[] }>;
  }> {
    let response = await this.api.post('/freeBusy', request);
    return response.data;
  }

  // Settings

  async listSettings(): Promise<{ items: Array<{ id?: string; value?: string }> }> {
    let response = await this.api.get('/users/me/settings');
    return response.data;
  }

  // Colors

  async getColors(): Promise<{
    calendar: Record<string, { background: string; foreground: string }>;
    event: Record<string, { background: string; foreground: string }>;
  }> {
    let response = await this.api.get('/colors');
    return response.data;
  }

  // Watch (Push Notifications)

  async watchEvents(calendarId: string, watchRequest: WatchRequest): Promise<WatchResponse> {
    let response = await this.api.post(
      `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      watchRequest
    );
    return response.data;
  }

  async watchCalendarList(watchRequest: WatchRequest): Promise<WatchResponse> {
    let response = await this.api.post('/users/me/calendarList/watch', watchRequest);
    return response.data;
  }

  async stopChannel(channelId: string, resourceId: string): Promise<void> {
    await this.api.post('/channels/stop', {
      id: channelId,
      resourceId
    });
  }
}
