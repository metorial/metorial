import { createAxios } from '@slates/provider';
import { calendlyApiError } from './errors';

export interface PaginationParams {
  count?: number;
  pageToken?: string;
}

export interface PaginationResult {
  count: number;
  nextPage: string | null;
  previousPage: string | null;
  nextPageToken: string | null;
}

export interface ScheduledEvent {
  uri: string;
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  eventType: string;
  location: Record<string, any> | null;
  inviteesCounter: {
    total: number;
    active: number;
    limit: number;
  };
  createdAt: string;
  updatedAt: string;
  eventMemberships: Array<{
    user: string;
    userEmail: string;
    userName: string;
  }>;
  eventGuests: Array<{
    email: string;
    createdAt: string;
    updatedAt: string;
  }>;
  calendarEvent: Record<string, any> | null;
  cancellation?: Record<string, any> | null;
}

export interface EventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  schedulingUrl: string;
  duration: number;
  kind: string;
  type: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  descriptionPlain: string | null;
  descriptionHtml: string | null;
  internalNote: string | null;
  poolingType: string | null;
  secret: boolean;
  customQuestions: Record<string, any>[];
}

export interface Invitee {
  uri: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
    position: number;
  }>;
  timezone: string | null;
  event: string;
  createdAt: string;
  updatedAt: string;
  tracking: Record<string, any>;
  cancelUrl: string;
  rescheduleUrl: string;
  rescheduled: boolean;
  noShow: Record<string, any> | null;
  cancellation?: Record<string, any> | null;
  payment?: Record<string, any> | null;
}

export interface CreateInviteeParams {
  eventTypeUri: string;
  startTime: string;
  invitee: {
    name: string;
    email: string;
    timezone: string;
    firstName?: string;
    lastName?: string;
    textReminderNumber?: string;
  };
  location?: Record<string, any>;
  eventGuests?: string[];
  questionsAndAnswers?: Array<{
    question: string;
    answer: string;
    position?: number;
  }>;
  tracking?: Record<string, any>;
}

export interface User {
  uri: string;
  name: string;
  slug: string;
  email: string;
  schedulingUrl: string;
  timezone: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  currentOrganization: string;
}

export interface OrganizationMembership {
  uri: string;
  role: string;
  user: {
    uri: string;
    name: string;
    slug: string;
    email: string;
    schedulingUrl: string;
    timezone: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  organization: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTime {
  status: string;
  inviteesRemaining: number;
  startTime: string;
  schedulingUrl: string;
}

export interface BusyTime {
  type: string;
  startTime: string;
  endTime: string;
  bufferedStartTime: string | null;
  bufferedEndTime: string | null;
  event: Record<string, any> | null;
}

export interface AvailabilitySchedule {
  uri: string;
  default: boolean;
  name: string;
  user: string;
  timezone: string;
  rules: Record<string, any>[];
}

export interface RoutingForm {
  uri: string;
  name: string;
  status: string;
  organization: string;
  createdAt: string;
  updatedAt: string;
  questions: Record<string, any>[];
}

export interface RoutingFormSubmission {
  uri: string;
  routingForm: string;
  questionsAndAnswers: Array<{
    questionUuid: string;
    question: string;
    answer: string;
  }>;
  tracking: Record<string, any> | null;
  result: Record<string, any> | null;
  submitter: string | null;
  submitterType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSubscription {
  uri: string;
  callbackUrl: string;
  createdAt: string;
  updatedAt: string;
  retryStartedAt: string | null;
  state: string;
  events: string[];
  scope: string;
  organization: string;
  user: string | null;
  creator: string;
}

let mapKeys = (obj: Record<string, any>): Record<string, any> => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(mapKeys);
  if (typeof obj !== 'object') return obj;

  let result: Record<string, any> = {};
  for (let key of Object.keys(obj)) {
    let camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = mapKeys(obj[key]);
  }
  return result;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.calendly.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(calendlyApiError(error))
    );
  }

  // Users

  async getCurrentUser(): Promise<User> {
    let response = await this.axios.get('/users/me');
    return mapKeys(response.data.resource) as User;
  }

  async getUser(userUri: string): Promise<User> {
    let uuid = this.extractUuid(userUri);
    let response = await this.axios.get(`/users/${uuid}`);
    return mapKeys(response.data.resource) as User;
  }

  // Scheduled Events

  async listScheduledEvents(params: {
    userUri?: string;
    organizationUri?: string;
    status?: 'active' | 'canceled';
    minStartTime?: string;
    maxStartTime?: string;
    inviteeEmail?: string;
    sort?: string;
    count?: number;
    pageToken?: string;
  }): Promise<{ collection: ScheduledEvent[]; pagination: PaginationResult }> {
    let query: Record<string, any> = {};
    if (params.userUri) query.user = params.userUri;
    if (params.organizationUri) query.organization = params.organizationUri;
    if (params.status) query.status = params.status;
    if (params.minStartTime) query.min_start_time = params.minStartTime;
    if (params.maxStartTime) query.max_start_time = params.maxStartTime;
    if (params.inviteeEmail) query.invitee_email = params.inviteeEmail;
    if (params.sort) query.sort = params.sort;
    if (params.count) query.count = params.count;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/scheduled_events', { params: query });
    return {
      collection: (response.data.collection || []).map((e: any) =>
        mapKeys(e)
      ) as ScheduledEvent[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  async getScheduledEvent(eventUri: string): Promise<ScheduledEvent> {
    let uuid = this.extractUuid(eventUri);
    let response = await this.axios.get(`/scheduled_events/${uuid}`);
    return mapKeys(response.data.resource) as ScheduledEvent;
  }

  async cancelEvent(eventUri: string, reason?: string): Promise<void> {
    let uuid = this.extractUuid(eventUri);
    let body: Record<string, any> = {};
    if (reason) body.reason = reason;
    await this.axios.post(`/scheduled_events/${uuid}/cancellation`, body);
  }

  // Event Invitees

  async listEventInvitees(
    eventUri: string,
    params?: {
      status?: 'active' | 'canceled';
      sort?: string;
      email?: string;
      count?: number;
      pageToken?: string;
    }
  ): Promise<{ collection: Invitee[]; pagination: PaginationResult }> {
    let uuid = this.extractUuid(eventUri);
    let query: Record<string, any> = {};
    if (params?.status) query.status = params.status;
    if (params?.sort) query.sort = params.sort;
    if (params?.email) query.email = params.email;
    if (params?.count) query.count = params.count;
    if (params?.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get(`/scheduled_events/${uuid}/invitees`, {
      params: query
    });
    return {
      collection: (response.data.collection || []).map((e: any) => mapKeys(e)) as Invitee[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  async getEventInvitee(eventUri: string, inviteeUri: string): Promise<Invitee> {
    let eventUuid = this.extractUuid(eventUri);
    let inviteeUuid = this.extractUuid(inviteeUri);
    let response = await this.axios.get(
      `/scheduled_events/${eventUuid}/invitees/${inviteeUuid}`
    );
    return mapKeys(response.data.resource) as Invitee;
  }

  async createEventInvitee(params: CreateInviteeParams): Promise<Invitee> {
    let body: Record<string, any> = {
      event_type: params.eventTypeUri,
      start_time: params.startTime,
      invitee: {
        name: params.invitee.name,
        email: params.invitee.email,
        timezone: params.invitee.timezone
      }
    };

    if (params.invitee.firstName) body.invitee.first_name = params.invitee.firstName;
    if (params.invitee.lastName) body.invitee.last_name = params.invitee.lastName;
    if (params.invitee.textReminderNumber) {
      body.invitee.text_reminder_number = params.invitee.textReminderNumber;
    }
    if (params.location) body.location = params.location;
    if (params.eventGuests?.length) body.event_guests = params.eventGuests;
    if (params.questionsAndAnswers?.length) {
      body.questions_and_answers = params.questionsAndAnswers.map(answer => ({
        question: answer.question,
        answer: answer.answer,
        ...(answer.position !== undefined ? { position: answer.position } : {})
      }));
    }
    if (params.tracking) body.tracking = params.tracking;

    let response = await this.axios.post('/invitees', body);
    return mapKeys(response.data.resource) as Invitee;
  }

  async markInviteeNoShow(inviteeUri: string): Promise<Record<string, any>> {
    let response = await this.axios.post('/invitee_no_shows', {
      invitee: inviteeUri
    });
    return mapKeys(response.data.resource);
  }

  async unmarkInviteeNoShow(noShowUri: string): Promise<void> {
    let uuid = this.extractUuid(noShowUri);
    await this.axios.delete(`/invitee_no_shows/${uuid}`);
  }

  // Event Types

  async listEventTypes(params: {
    userUri?: string;
    organizationUri?: string;
    active?: boolean;
    sort?: string;
    count?: number;
    pageToken?: string;
  }): Promise<{ collection: EventType[]; pagination: PaginationResult }> {
    let query: Record<string, any> = {};
    if (params.userUri) query.user = params.userUri;
    if (params.organizationUri) query.organization = params.organizationUri;
    if (params.active !== undefined) query.active = params.active;
    if (params.sort) query.sort = params.sort;
    if (params.count) query.count = params.count;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/event_types', { params: query });
    return {
      collection: (response.data.collection || []).map((e: any) => mapKeys(e)) as EventType[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  async getEventType(eventTypeUri: string): Promise<EventType> {
    let uuid = this.extractUuid(eventTypeUri);
    let response = await this.axios.get(`/event_types/${uuid}`);
    return mapKeys(response.data.resource) as EventType;
  }

  // Availability

  async getAvailableTimes(params: {
    eventTypeUri: string;
    startTime: string;
    endTime: string;
  }): Promise<AvailableTime[]> {
    let response = await this.axios.get('/event_type_available_times', {
      params: {
        event_type: params.eventTypeUri,
        start_time: params.startTime,
        end_time: params.endTime
      }
    });
    return (response.data.collection || []).map((e: any) => mapKeys(e)) as AvailableTime[];
  }

  async getUserBusyTimes(params: {
    userUri: string;
    startTime: string;
    endTime: string;
  }): Promise<BusyTime[]> {
    let response = await this.axios.get('/user_busy_times', {
      params: {
        user: params.userUri,
        start_time: params.startTime,
        end_time: params.endTime
      }
    });
    return (response.data.collection || []).map((e: any) => mapKeys(e)) as BusyTime[];
  }

  async listAvailabilitySchedules(userUri: string): Promise<AvailabilitySchedule[]> {
    let response = await this.axios.get('/user_availability_schedules', {
      params: { user: userUri }
    });
    return (response.data.collection || []).map((e: any) =>
      mapKeys(e)
    ) as AvailabilitySchedule[];
  }

  // Scheduling Links

  async createSchedulingLink(params: {
    ownerUri: string;
    ownerType?: string;
    maxEventCount?: number;
  }): Promise<{ bookingUrl: string; owner: string; ownerType: string }> {
    let body: Record<string, any> = {
      owner: params.ownerUri,
      owner_type: params.ownerType || 'EventType',
      max_event_count: params.maxEventCount || 1
    };

    let response = await this.axios.post('/scheduling_links', body);
    return mapKeys(response.data.resource) as {
      bookingUrl: string;
      owner: string;
      ownerType: string;
    };
  }

  // Organization

  async listOrganizationMemberships(params: {
    organizationUri: string;
    email?: string;
    count?: number;
    pageToken?: string;
  }): Promise<{ collection: OrganizationMembership[]; pagination: PaginationResult }> {
    let query: Record<string, any> = {
      organization: params.organizationUri
    };
    if (params.email) query.email = params.email;
    if (params.count) query.count = params.count;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/organization_memberships', { params: query });
    return {
      collection: (response.data.collection || []).map((e: any) =>
        mapKeys(e)
      ) as OrganizationMembership[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  async removeOrganizationMembership(membershipUri: string): Promise<void> {
    let uuid = this.extractUuid(membershipUri);
    await this.axios.delete(`/organization_memberships/${uuid}`);
  }

  async inviteToOrganization(
    organizationUri: string,
    email: string
  ): Promise<Record<string, any>> {
    let uuid = this.extractUuid(organizationUri);
    let response = await this.axios.post(`/organizations/${uuid}/invitations`, { email });
    return mapKeys(response.data.resource);
  }

  // Routing Forms

  async listRoutingForms(params: {
    organizationUri: string;
    count?: number;
    pageToken?: string;
  }): Promise<{ collection: RoutingForm[]; pagination: PaginationResult }> {
    let query: Record<string, any> = {
      organization: params.organizationUri
    };
    if (params.count) query.count = params.count;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/routing_forms', { params: query });
    return {
      collection: (response.data.collection || []).map((e: any) =>
        mapKeys(e)
      ) as RoutingForm[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  async getRoutingForm(routingFormUri: string): Promise<RoutingForm> {
    let uuid = this.extractUuid(routingFormUri);
    let response = await this.axios.get(`/routing_forms/${uuid}`);
    return mapKeys(response.data.resource) as RoutingForm;
  }

  async listRoutingFormSubmissions(params: {
    routingFormUri: string;
    count?: number;
    pageToken?: string;
  }): Promise<{ collection: RoutingFormSubmission[]; pagination: PaginationResult }> {
    let query: Record<string, any> = {
      routing_form: params.routingFormUri
    };
    if (params.count) query.count = params.count;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/routing_form_submissions', { params: query });
    return {
      collection: (response.data.collection || []).map((e: any) =>
        mapKeys(e)
      ) as RoutingFormSubmission[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  // Webhook Subscriptions

  async createWebhookSubscription(params: {
    url: string;
    events: string[];
    organizationUri: string;
    scope: 'user' | 'organization';
    userUri?: string;
    signingKey?: string;
  }): Promise<WebhookSubscription> {
    let body: Record<string, any> = {
      url: params.url,
      events: params.events,
      organization: params.organizationUri,
      scope: params.scope
    };
    if (params.userUri && params.scope === 'user') {
      body.user = params.userUri;
    }
    if (params.signingKey) {
      body.signing_key = params.signingKey;
    }

    let response = await this.axios.post('/webhook_subscriptions', body);
    return mapKeys(response.data.resource) as WebhookSubscription;
  }

  async deleteWebhookSubscription(webhookUri: string): Promise<void> {
    let uuid = this.extractUuid(webhookUri);
    await this.axios.delete(`/webhook_subscriptions/${uuid}`);
  }

  async listWebhookSubscriptions(params: {
    organizationUri: string;
    scope: 'user' | 'organization';
    userUri?: string;
    count?: number;
    pageToken?: string;
  }): Promise<{ collection: WebhookSubscription[]; pagination: PaginationResult }> {
    let query: Record<string, any> = {
      organization: params.organizationUri,
      scope: params.scope
    };
    if (params.userUri) query.user = params.userUri;
    if (params.count) query.count = params.count;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/webhook_subscriptions', { params: query });
    return {
      collection: (response.data.collection || []).map((e: any) =>
        mapKeys(e)
      ) as WebhookSubscription[],
      pagination: mapKeys(response.data.pagination) as PaginationResult
    };
  }

  // Utility

  private extractUuid(uri: string): string {
    if (!uri.includes('/')) return uri;
    let parts = uri.split('/');
    return parts[parts.length - 1] || uri;
  }
}
