import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://public-api.leexi.ai/v1';

export interface PaginationParams {
  page?: number;
  items?: number;
}

export interface ListCallsParams extends PaginationParams {
  order?: string;
  dateFilter?: string;
  from?: string;
  to?: string;
  source?: string;
  sourceIds?: string[];
  ownerUuids?: string[];
  participatingUserUuids?: string[];
  customerPhoneNumbers?: string[];
  customerEmailAddresses?: string[];
  withSimpleTranscript?: boolean;
  conversationTypeUuid?: string;
}

export interface CreateCallParams {
  recordingS3Key: string;
  externalId: string;
  direction: string;
  performedAt: string;
  userUuid: string;
  title?: string;
  description?: string;
  locale?: string;
  tags?: string[];
  emails?: string[];
  rawPhoneNumber?: string;
  participatingUserUuids?: string[];
  customers?: { name?: string; email?: string; phoneNumber?: string; customerUuid?: string }[];
}

export interface ListMeetingEventsParams extends PaginationParams {
  order?: string;
  createdBy?: string;
  dateFilter?: string;
  from?: string;
  to?: string;
}

export interface CreateMeetingEventParams {
  meetingUrl: string;
  userUuid: string;
  startTime: string;
  endTime: string;
  organizer: string;
  toRecord: boolean;
  attendees?: string[];
  title?: string;
  description?: string;
  owned?: boolean;
  internal?: boolean;
  direction?: string;
}

export interface ListCallNotesParams extends PaginationParams {
  callUuid: string;
  promptUuid?: string;
}

export interface CallNote {
  uuid: string;
  created_at?: string;
  updated_at?: string;
  call?: { uuid: string; leexi_url?: string };
  prompt?: { uuid: string; title?: string; category?: string };
  translations?: {
    uuid: string;
    locale: string;
    text: string;
    original_text?: string;
    updated_at?: string;
  }[];
}

export class Client {
  private axios;

  constructor(token: string) {
    if (!token) {
      throw createApiServiceError('Connect a Leexi API key before using this tool.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Basic ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Leexi',
          reason: 'leexi_api_error'
        })
    });
  }

  private validatePagination(params: PaginationParams) {
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      throw createApiServiceError('page must be a whole number greater than or equal to 1.');
    }
    if (
      params.items !== undefined &&
      (!Number.isInteger(params.items) || params.items < 1 || params.items > 100)
    ) {
      throw createApiServiceError('items must be a whole number between 1 and 100.');
    }
  }

  async listUsers(params: PaginationParams = {}) {
    this.validatePagination(params);
    let response = await this.axios.get('/users', {
      params: {
        page: params.page,
        items: params.items
      }
    });
    return response.data;
  }

  async listTeams(params: PaginationParams = {}) {
    this.validatePagination(params);
    let response = await this.axios.get('/teams', {
      params: {
        page: params.page,
        items: params.items
      }
    });
    return response.data;
  }

  async listCalls(params: ListCallsParams = {}) {
    this.validatePagination(params);
    let queryParams: Record<string, any> = {
      page: params.page,
      items: params.items,
      order: params.order,
      date_filter: params.dateFilter,
      from: params.from,
      to: params.to,
      source: params.source,
      with_simple_transcript: params.withSimpleTranscript,
      conversation_type_uuid: params.conversationTypeUuid
    };

    if (params.sourceIds) {
      queryParams['source_id[]'] = params.sourceIds;
    }
    if (params.ownerUuids) {
      queryParams['owner_uuid[]'] = params.ownerUuids;
    }
    if (params.participatingUserUuids) {
      queryParams['participating_user_uuid[]'] = params.participatingUserUuids;
    }
    if (params.customerPhoneNumbers) {
      queryParams['customer_phone_number[]'] = params.customerPhoneNumbers;
    }
    if (params.customerEmailAddresses) {
      queryParams['customer_email_address[]'] = params.customerEmailAddresses;
    }

    let response = await this.axios.get('/calls', { params: queryParams });
    return response.data;
  }

  async getCall(callUuid: string) {
    let response = await this.axios.get(`/calls/${encodeURIComponent(callUuid)}`);
    return response.data;
  }

  async presignRecordingUrl(extension: string) {
    let response = await this.axios.post('/calls/presign_recording_url', {
      extension: extension.startsWith('.') ? extension : `.${extension}`
    });
    return response.data;
  }

  async createCall(params: CreateCallParams) {
    if (
      (params.emails !== undefined || params.rawPhoneNumber !== undefined) &&
      (params.customers !== undefined || params.participatingUserUuids !== undefined)
    ) {
      throw createApiServiceError(
        'Use either emails/rawPhoneNumber or customers/participatingUserUuids when creating a call, because Leexi does not accept both styles together.'
      );
    }
    if (
      params.customers?.some(
        customer =>
          !customer.name && !customer.email && !customer.phoneNumber && !customer.customerUuid
      )
    ) {
      throw createApiServiceError(
        'Each customer must have a name, email, phoneNumber, or customerUuid.'
      );
    }
    let response = await this.axios.post('/calls', {
      recording_s3_key: params.recordingS3Key,
      external_id: params.externalId,
      direction: params.direction,
      performed_at: params.performedAt,
      user_uuid: params.userUuid,
      title: params.title,
      description: params.description,
      locale: params.locale,
      tags: params.tags,
      emails: params.emails,
      raw_phone_number: params.rawPhoneNumber,
      participating_user_uuids: params.participatingUserUuids,
      customers: params.customers?.map(customer => ({
        name: customer.name,
        email: customer.email,
        phone_number: customer.phoneNumber,
        uuid: customer.customerUuid
      }))
    });
    return response.data;
  }

  async listMeetingEvents(params: ListMeetingEventsParams = {}) {
    this.validatePagination(params);
    let response = await this.axios.get('/meeting_events', {
      params: {
        page: params.page,
        items: params.items,
        order: params.order,
        origin: params.createdBy,
        date_filter: params.dateFilter,
        from: params.from,
        to: params.to
      }
    });
    return response.data;
  }

  async getMeetingEvent(meetingEventUuid: string) {
    let response = await this.axios.get(
      `/meeting_events/${encodeURIComponent(meetingEventUuid)}`
    );
    return response.data;
  }

  async createMeetingEvent(params: CreateMeetingEventParams) {
    let response = await this.axios.post('/meeting_events', {
      meeting_url: params.meetingUrl,
      user_uuid: params.userUuid,
      start_time: params.startTime,
      end_time: params.endTime,
      organizer: params.organizer,
      to_record: params.toRecord,
      attendees: params.attendees,
      title: params.title,
      description: params.description,
      owned: params.owned ?? false,
      internal: params.internal ?? false,
      direction: params.direction
    });
    return response.data;
  }

  async deleteMeetingEvent(meetingEventUuid: string) {
    let response = await this.axios.delete(
      `/meeting_events/${encodeURIComponent(meetingEventUuid)}`
    );
    return response.data;
  }

  async launchMeetingAssistant(meetingEventUuid: string, stopTask?: boolean) {
    let response = await this.axios.post(
      `/meeting_events/${encodeURIComponent(meetingEventUuid)}/launch_bot`,
      { stop_task: stopTask ?? false }
    );
    return response.data;
  }

  async listCallNotes(params: ListCallNotesParams) {
    this.validatePagination(params);
    let response = await this.axios.get<{
      data: CallNote[];
      pagination: { page: number; items: number; count: number; pages?: number };
    }>('/call_notes', {
      params: {
        call_uuid: params.callUuid,
        prompt_uuid: params.promptUuid,
        page: params.page,
        items: params.items
      }
    });
    return response.data;
  }

  async getCallNote(noteUuid: string) {
    let response = await this.axios.get<{ data: CallNote }>(
      `/call_notes/${encodeURIComponent(noteUuid)}`
    );
    return response.data;
  }

  async updateCallNote(noteUuid: string, locale: string, text: string) {
    let response = await this.axios.patch<{ data: CallNote }>(
      `/call_notes/${encodeURIComponent(noteUuid)}`,
      { locale, text }
    );
    return response.data;
  }
}
