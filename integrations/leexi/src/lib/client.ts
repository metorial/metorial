import { createAxios } from 'slates';

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

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listUsers(params: PaginationParams = {}) {
    let response = await this.axios.get('/users', {
      params: {
        page: params.page,
        items: params.items
      }
    });
    return response.data;
  }

  async listTeams(params: PaginationParams = {}) {
    let response = await this.axios.get('/teams', {
      params: {
        page: params.page,
        items: params.items
      }
    });
    return response.data;
  }

  async listCalls(params: ListCallsParams = {}) {
    let queryParams: Record<string, any> = {
      page: params.page,
      items: params.items,
      order: params.order,
      date_filter: params.dateFilter,
      from: params.from,
      to: params.to,
      source: params.source,
      with_simple_transcript: params.withSimpleTranscript
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
    let response = await this.axios.get(`/calls/${callUuid}`);
    return response.data;
  }

  async presignRecordingUrl(extension: string) {
    let response = await this.axios.post('/calls/presign_recording_url', {
      extension
    });
    return response.data;
  }

  async createCall(params: CreateCallParams) {
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
      raw_phone_number: params.rawPhoneNumber
    });
    return response.data;
  }

  async listMeetingEvents(params: ListMeetingEventsParams = {}) {
    let response = await this.axios.get('/meeting_events', {
      params: {
        page: params.page,
        items: params.items,
        order: params.order,
        created_by: params.createdBy,
        date_filter: params.dateFilter,
        from: params.from,
        to: params.to
      }
    });
    return response.data;
  }

  async getMeetingEvent(meetingEventUuid: string) {
    let response = await this.axios.get(`/meeting_events/${meetingEventUuid}`);
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
      owned: params.owned,
      internal: params.internal,
      direction: params.direction
    });
    return response.data;
  }

  async deleteMeetingEvent(meetingEventUuid: string) {
    let response = await this.axios.delete(`/meeting_events/${meetingEventUuid}`);
    return response.data;
  }

  async launchMeetingAssistant(meetingEventUuid: string, stopTask?: boolean) {
    let response = await this.axios.post(`/meeting_events/${meetingEventUuid}/launch_bot`, {
      stop_task: stopTask
    });
    return response.data;
  }
}
