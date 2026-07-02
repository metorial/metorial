import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { gongApiError } from './errors';

type MeetingInvitee = {
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
};

export class GongClient {
  private axios;
  private authHeader: string;

  constructor(opts: { token: string; baseUrl: string }) {
    // Determine auth header: OAuth tokens are Bearer, Basic Auth tokens are Basic
    // If token looks like a JWT or regular access token (no colon when decoded), use Bearer
    // Basic auth tokens are base64-encoded "accessKey:secret", OAuth tokens are opaque strings
    // We check if baseUrl is the default (basic auth) or customer-specific (OAuth)
    // However, the simplest approach: basic auth tokens from our auth.ts are always base64 of "key:secret"
    // OAuth tokens get Bearer prefix
    let isBasicAuth = false;
    try {
      let decoded = atob(opts.token);
      if (decoded.includes(':') && decoded.split(':').length === 2) {
        isBasicAuth = true;
      }
    } catch {
      // Not valid base64, treat as Bearer
    }

    this.authHeader = isBasicAuth ? `Basic ${opts.token}` : `Bearer ${opts.token}`;

    this.axios = createAxios({
      baseURL: opts.baseUrl
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(gongApiError(error))
    );
  }

  private get headers() {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json'
    };
  }

  private get authHeaders() {
    return {
      Authorization: this.authHeader
    };
  }

  // ========== CALLS ==========

  async listCalls(
    params: {
      fromDateTime?: string;
      toDateTime?: string;
      cursor?: string;
      workspaceId?: string;
    } = {}
  ) {
    let queryParams: Record<string, string> = {};
    if (params.fromDateTime) queryParams.fromDateTime = params.fromDateTime;
    if (params.toDateTime) queryParams.toDateTime = params.toDateTime;
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.workspaceId) queryParams.workspaceId = params.workspaceId;

    let response = await this.axios.get('/v2/calls', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getCallsExtensive(body: {
    filter: {
      fromDateTime?: string;
      toDateTime?: string;
      callIds?: string[];
      workspaceId?: string;
    };
    contentSelector?: {
      exposedFields?: {
        collaboration?: boolean;
        content?: {
          pointsOfInterest?: boolean;
          structure?: boolean;
          topics?: boolean;
          trackers?: boolean;
          brief?: boolean;
          outline?: boolean;
          highlights?: boolean;
          callOutcome?: boolean;
          keyPoints?: boolean;
        };
        interaction?: {
          personInteractionStats?: boolean;
          questions?: boolean;
          speakers?: boolean;
          video?: boolean;
        };
        media?: boolean;
        parties?: boolean;
      };
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/calls/extensive', body, {
      headers: this.headers
    });
    return response.data;
  }

  async createCall(body: {
    clientUniqueId: string;
    actualStart: string;
    primaryUser: string;
    parties: Array<{
      userId?: string;
      emailAddress?: string;
      phoneNumber?: string;
      name?: string;
      partyId?: string;
      mediaChannelId?: number;
      context?: unknown[];
    }>;
    direction: 'Inbound' | 'Outbound' | 'Conference' | 'Unknown';
    title?: string;
    purpose?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    duration?: number;
    disposition?: string;
    context?: unknown[];
    customData?: string;
    meetingUrl?: string;
    callProviderCode?: string;
    downloadMediaUrl?: string;
    workspaceId?: string;
    languageCode?: string;
    flowContext?: {
      taskId?: string;
    };
  }) {
    let response = await this.axios.post('/v2/calls', body, {
      headers: this.headers
    });
    return response.data;
  }

  async addCallMedia(
    callId: string,
    params: {
      mediaFileBase64: string;
      fileName?: string;
      mimeType?: string;
    }
  ) {
    let formData = new FormData();
    let mediaBytes = Buffer.from(params.mediaFileBase64, 'base64');
    let mediaFile = new Blob([mediaBytes], {
      type: params.mimeType || 'application/octet-stream'
    });

    formData.append('mediaFile', mediaFile, params.fileName || 'gong-call-media');

    let response = await this.axios.put(
      `/v2/calls/${encodeURIComponent(callId)}/media`,
      formData,
      {
        headers: this.authHeaders
      }
    );
    return response.data;
  }

  async getCallTranscripts(body: {
    filter: {
      fromDateTime?: string;
      toDateTime?: string;
      callIds?: string[];
      workspaceId?: string;
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/calls/transcript', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ========== USERS ==========

  async listUsers(params: { cursor?: string; includeAvatars?: boolean } = {}) {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.includeAvatars !== undefined)
      queryParams.includeAvatars = String(params.includeAvatars);

    let response = await this.axios.get('/v2/users', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/v2/users/${encodeURIComponent(userId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listUsersExtensive(body: {
    filter: {
      createdFromDateTime?: string;
      createdToDateTime?: string;
      includeAvatars?: boolean;
      userIds?: string[];
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/users/extensive', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ========== STATS ==========

  async getAggregateActivity(body: {
    filter: {
      fromDate: string;
      toDate: string;
      userIds?: string[];
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/stats/activity/aggregate', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getDailyActivity(body: {
    filter: {
      fromDate: string;
      toDate: string;
      userIds?: string[];
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/stats/activity/day-by-day', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getInteractionStats(body: {
    filter: {
      fromDate: string;
      toDate: string;
      userIds?: string[];
      createdFromDateTime?: string;
      createdToDateTime?: string;
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/stats/interaction', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getAnsweredScorecards(body: {
    filter: {
      fromDateTime?: string;
      toDateTime?: string;
      scorecardIds?: string[];
      reviewedUserIds?: string[];
      reviewerUserIds?: string[];
      callFromDateTime?: string;
      callToDateTime?: string;
    };
    cursor?: string;
  }) {
    let response = await this.axios.post('/v2/stats/activity/scorecards', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ========== LIBRARY ==========

  async getLibraryFolders(params: { workspaceId?: string } = {}) {
    let queryParams: Record<string, string> = {};
    if (params.workspaceId) queryParams.workspaceId = params.workspaceId;

    let response = await this.axios.get('/v2/library/folders', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getLibraryFolderCalls(folderId: string) {
    let response = await this.axios.get(`/v2/library/folder-content`, {
      headers: this.headers,
      params: { folderId }
    });
    return response.data;
  }

  // ========== FLOWS (ENGAGE) ==========

  async listFlows(params: { workspaceId?: string; flowEmailOwner?: string } = {}) {
    let queryParams: Record<string, string> = {};
    if (params.workspaceId) queryParams.workspaceId = params.workspaceId;
    if (params.flowEmailOwner) queryParams.flowEmailOwner = params.flowEmailOwner;

    let response = await this.axios.get('/v2/flows', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async listFlowFolders(params: { workspaceId?: string; flowEmailOwner?: string } = {}) {
    let queryParams: Record<string, string> = {};
    if (params.workspaceId) queryParams.workspaceId = params.workspaceId;
    if (params.flowEmailOwner) queryParams.flowEmailOwner = params.flowEmailOwner;

    let response = await this.axios.get('/v2/flows/folders', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async listProspectFlows(body: { crmProspectsIds: string[] }) {
    let response = await this.axios.post('/v2/flows/prospects', body, {
      headers: this.headers
    });
    return response.data;
  }

  async assignProspectsToFlow(body: {
    flowId: string;
    flowInstanceOwnerEmail: string;
    crmProspectsIds: string[];
  }) {
    let response = await this.axios.post('/v2/flows/prospects/assign', body, {
      headers: this.headers
    });
    return response.data;
  }

  async unassignProspectFromFlows(body: {
    crmProspectId: string;
    flowId?: string;
    unassignedByUserEmail?: string;
  }) {
    let response = await this.axios.post(
      '/v2/flows/prospects/unassign-flows-by-crm-id',
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ========== CRM ==========

  async getCrmObjects(body: {
    integrationId: string;
    objectType: string;
    objectCrmIds: string[];
  }) {
    let response = await this.axios.request({
      method: 'GET',
      url: '/v2/crm/entities',
      headers: this.headers,
      params: {
        integrationId: body.integrationId,
        objectType: body.objectType.toUpperCase()
      },
      data: body.objectCrmIds
    });
    return response.data;
  }

  // ========== MEETINGS ==========

  async createMeeting(body: {
    title?: string;
    startTime: string;
    endTime: string;
    organizerEmail: string;
    invitees: MeetingInvitee[];
    externalId?: string;
  }) {
    let response = await this.axios.post('/v2/meetings', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateMeeting(
    meetingId: string,
    body: {
      title?: string;
      startTime: string;
      endTime: string;
      organizerEmail: string;
      invitees: MeetingInvitee[];
      externalId?: string;
    }
  ) {
    let response = await this.axios.put(
      `/v2/meetings/${encodeURIComponent(meetingId)}`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteMeeting(meetingId: string, organizerEmail: string) {
    let response = await this.axios.delete(`/v2/meetings/${meetingId}`, {
      headers: this.headers,
      data: { organizerEmail }
    });
    return response.data;
  }

  // ========== DATA PRIVACY ==========

  async getDataPrivacyForEmail(emailAddress: string) {
    let response = await this.axios.get('/v2/data-privacy/data-for-email-address', {
      headers: this.headers,
      params: { emailAddress }
    });
    return response.data;
  }

  async getDataPrivacyForPhone(phoneNumber: string) {
    let response = await this.axios.get('/v2/data-privacy/data-for-phone-number', {
      headers: this.headers,
      params: { phoneNumber }
    });
    return response.data;
  }

  async eraseDataForEmail(emailAddress: string) {
    let response = await this.axios.post(
      '/v2/data-privacy/erase-data-for-email-address',
      {
        emailAddress
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async eraseDataForPhone(phoneNumber: string) {
    let response = await this.axios.post(
      '/v2/data-privacy/erase-data-for-phone-number',
      {
        phoneNumber
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ========== WORKSPACES & PERMISSIONS ==========

  async listWorkspaces() {
    let response = await this.axios.get('/v2/workspaces', {
      headers: this.headers
    });
    return response.data;
  }

  // ========== SETTINGS ==========

  async getSettings() {
    let response = await this.axios.get('/v2/settings/trackers', {
      headers: this.headers
    });
    return response.data;
  }

  async getSettingsTrackers(params: { workspaceId?: string } = {}) {
    let queryParams: Record<string, string> = {};
    if (params.workspaceId) queryParams.workspaceId = params.workspaceId;

    let response = await this.axios.get('/v2/settings/trackers', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getSettingsScorecards() {
    let response = await this.axios.get('/v2/settings/scorecards', {
      headers: this.headers
    });
    return response.data;
  }

  // ========== AUDIT LOGS ==========

  async getAuditLogs(params: {
    fromDateTime: string;
    toDateTime?: string;
    logType?: string;
    cursor?: string;
  }) {
    let queryParams: Record<string, string> = {
      fromDateTime: params.fromDateTime
    };
    if (params.toDateTime) queryParams.toDateTime = params.toDateTime;
    if (params.logType) queryParams.logType = params.logType;
    if (params.cursor) queryParams.cursor = params.cursor;

    let response = await this.axios.get('/v2/logs', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // ========== DIGITAL INTERACTIONS ==========

  async postDigitalInteraction(body: {
    eventId: string;
    eventType: string;
    timestamp: string;
    content: {
      contentId?: string;
      contentTitle?: string;
      contentUrl?: string;
    };
    person: {
      name?: string;
      email?: string;
      phoneNumber?: string;
    };
    workspaceId?: string;
    customData?: Record<string, string>;
  }) {
    let response = await this.axios.post('/v2/digital-interaction', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ========== CALL USERS ACCESS ==========

  async getCallUsersAccess(body: {
    filter: {
      callIds: string[];
    };
  }) {
    let response = await this.axios.post('/v2/calls/users-access', body, {
      headers: this.headers
    });
    return response.data;
  }

  async addCallUsersAccess(body: {
    callAccessList: Array<{ callId: string; userIds: string[] }>;
  }) {
    let response = await this.axios.put('/v2/calls/users-access', body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCallUsersAccess(body: {
    callAccessList: Array<{ callId: string; userIds: string[] }>;
  }) {
    let response = await this.axios.delete('/v2/calls/users-access', {
      headers: this.headers,
      data: body
    });
    return response.data;
  }

  // ========== CRM METADATA ==========

  async getCrmIntegrations() {
    let response = await this.axios.get('/v2/crm/integrations', {
      headers: this.headers
    });
    return response.data;
  }

  async getCrmEntitySchema(params: { integrationId: string; objectType: string }) {
    let response = await this.axios.get('/v2/crm/entity-schema', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getCrmRequestStatus(params: { integrationId: string; clientRequestId: string }) {
    let response = await this.axios.get('/v2/crm/request-status', {
      headers: this.headers,
      params
    });
    return response.data;
  }
}
