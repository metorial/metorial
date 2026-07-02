import { createAxios } from '@slates/provider';
import { hookdeckApiError } from './errors';
import type {
  HookdeckAttempt,
  HookdeckBookmark,
  HookdeckBulkOperation,
  HookdeckConnection,
  HookdeckDestination,
  HookdeckEvent,
  HookdeckIssue,
  HookdeckIssueTrigger,
  HookdeckMetricsResponse,
  HookdeckRequest,
  HookdeckSource,
  HookdeckTransformation,
  PaginatedResponse,
  PaginationParams
} from './types';

type DataResponse<T> = {
  data: T;
};

type IssueTriggerInput = {
  name?: string | null;
  type?: string;
  configs?: Record<string, unknown>;
  channels?: Record<string, unknown> | null;
};

export class Client {
  private axios;
  private authHeader: string;

  constructor(config: { token: string; apiVersion: string }) {
    this.authHeader = `Bearer ${config.token}`;
    this.axios = createAxios({
      baseURL: `https://api.hookdeck.com/${config.apiVersion}`,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(
    operation: string,
    run: () => Promise<DataResponse<T>>
  ): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw hookdeckApiError(error, operation);
    }
  }

  // ---- Sources ----

  async listSources(
    params?: PaginationParams & { name?: string }
  ): Promise<PaginatedResponse<HookdeckSource>> {
    return this.request('list sources', () => this.axios.get('/sources', { params }));
  }

  async getSource(sourceId: string): Promise<HookdeckSource> {
    return this.request('retrieve source', () => this.axios.get(`/sources/${sourceId}`));
  }

  async createSource(data: {
    name: string;
    description?: string;
    type?: string;
    verification?: Record<string, unknown>;
    config?: Record<string, unknown>;
  }): Promise<HookdeckSource> {
    return this.request('create source', () => this.axios.post('/sources', data));
  }

  async updateSource(
    sourceId: string,
    data: {
      name?: string;
      description?: string;
      type?: string;
      verification?: Record<string, unknown>;
      config?: Record<string, unknown>;
    }
  ): Promise<HookdeckSource> {
    return this.request('update source', () => this.axios.put(`/sources/${sourceId}`, data));
  }

  async deleteSource(sourceId: string): Promise<{ id: string }> {
    return this.request('delete source', () => this.axios.delete(`/sources/${sourceId}`));
  }

  async disableSource(sourceId: string): Promise<HookdeckSource> {
    return this.request('disable source', () =>
      this.axios.put(`/sources/${sourceId}/disable`)
    );
  }

  async enableSource(sourceId: string): Promise<HookdeckSource> {
    return this.request('enable source', () => this.axios.put(`/sources/${sourceId}/enable`));
  }

  // ---- Destinations ----

  async listDestinations(
    params?: PaginationParams & { name?: string }
  ): Promise<PaginatedResponse<HookdeckDestination>> {
    return this.request('list destinations', () =>
      this.axios.get('/destinations', { params })
    );
  }

  async getDestination(destinationId: string): Promise<HookdeckDestination> {
    return this.request('retrieve destination', () =>
      this.axios.get(`/destinations/${destinationId}`)
    );
  }

  async createDestination(data: {
    name: string;
    description?: string;
    type?: string;
    config?: Record<string, unknown>;
  }): Promise<HookdeckDestination> {
    return this.request('create destination', () => this.axios.post('/destinations', data));
  }

  async updateDestination(
    destinationId: string,
    data: {
      name?: string;
      description?: string;
      type?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<HookdeckDestination> {
    return this.request('update destination', () =>
      this.axios.put(`/destinations/${destinationId}`, data)
    );
  }

  async deleteDestination(destinationId: string): Promise<{ id: string }> {
    return this.request('delete destination', () =>
      this.axios.delete(`/destinations/${destinationId}`)
    );
  }

  async disableDestination(destinationId: string): Promise<HookdeckDestination> {
    return this.request('disable destination', () =>
      this.axios.put(`/destinations/${destinationId}/disable`)
    );
  }

  async enableDestination(destinationId: string): Promise<HookdeckDestination> {
    return this.request('enable destination', () =>
      this.axios.put(`/destinations/${destinationId}/enable`)
    );
  }

  // ---- Connections ----

  async listConnections(
    params?: PaginationParams & {
      name?: string;
      source_id?: string;
      destination_id?: string;
    }
  ): Promise<PaginatedResponse<HookdeckConnection>> {
    return this.request('list connections', () => this.axios.get('/connections', { params }));
  }

  async getConnection(connectionId: string): Promise<HookdeckConnection> {
    return this.request('retrieve connection', () =>
      this.axios.get(`/connections/${connectionId}`)
    );
  }

  async createConnection(data: {
    name?: string;
    description?: string;
    source_id?: string;
    source?: {
      name: string;
      description?: string;
      type?: string;
      config?: Record<string, unknown>;
    };
    destination_id?: string;
    destination?: {
      name: string;
      description?: string;
      type?: string;
      config?: Record<string, unknown>;
    };
    rules?: Record<string, unknown>[];
  }): Promise<HookdeckConnection> {
    return this.request('create connection', () => this.axios.post('/connections', data));
  }

  async updateConnection(
    connectionId: string,
    data: {
      name?: string;
      description?: string;
      rules?: Record<string, unknown>[];
    }
  ): Promise<HookdeckConnection> {
    return this.request('update connection', () =>
      this.axios.put(`/connections/${connectionId}`, data)
    );
  }

  async deleteConnection(connectionId: string): Promise<{ id: string }> {
    return this.request('delete connection', () =>
      this.axios.delete(`/connections/${connectionId}`)
    );
  }

  async disableConnection(connectionId: string): Promise<HookdeckConnection> {
    return this.request('disable connection', () =>
      this.axios.put(`/connections/${connectionId}/disable`)
    );
  }

  async enableConnection(connectionId: string): Promise<HookdeckConnection> {
    return this.request('enable connection', () =>
      this.axios.put(`/connections/${connectionId}/enable`)
    );
  }

  async pauseConnection(connectionId: string): Promise<HookdeckConnection> {
    return this.request('pause connection', () =>
      this.axios.put(`/connections/${connectionId}/pause`)
    );
  }

  async unpauseConnection(connectionId: string): Promise<HookdeckConnection> {
    return this.request('unpause connection', () =>
      this.axios.put(`/connections/${connectionId}/unpause`)
    );
  }

  // ---- Events ----

  async listEvents(
    params?: PaginationParams & {
      status?: string;
      webhook_id?: string;
      source_id?: string;
      destination_id?: string;
      created_at?: Record<string, string>;
    }
  ): Promise<PaginatedResponse<HookdeckEvent>> {
    return this.request('list events', () => this.axios.get('/events', { params }));
  }

  async getEvent(eventId: string): Promise<HookdeckEvent> {
    return this.request('retrieve event', () => this.axios.get(`/events/${eventId}`));
  }

  async retryEvent(eventId: string): Promise<HookdeckEvent> {
    return this.request('retry event', () => this.axios.post(`/events/${eventId}/retry`));
  }

  async cancelEvent(eventId: string): Promise<HookdeckEvent> {
    return this.request('cancel event', () => this.axios.put(`/events/${eventId}/cancel`));
  }

  async muteEvent(eventId: string): Promise<HookdeckEvent> {
    return this.request('mute event', () => this.axios.put(`/events/${eventId}/mute`));
  }

  async bulkRetryEvents(query: Record<string, unknown>): Promise<HookdeckBulkOperation> {
    return this.request('bulk retry events', () =>
      this.axios.post('/bulk/events/retry', { query })
    );
  }

  async bulkCancelEvents(query: Record<string, unknown>): Promise<HookdeckBulkOperation> {
    return this.request('bulk cancel events', () =>
      this.axios.post('/bulk/events/cancel', { query })
    );
  }

  // ---- Requests ----

  async listRequests(
    params?: PaginationParams & {
      source_id?: string;
      status?: string;
      rejection_cause?: string;
      created_at?: Record<string, string>;
    }
  ): Promise<PaginatedResponse<HookdeckRequest>> {
    return this.request('list requests', () => this.axios.get('/requests', { params }));
  }

  async getRequest(requestId: string): Promise<HookdeckRequest> {
    return this.request('retrieve request', () => this.axios.get(`/requests/${requestId}`));
  }

  async retryRequest(requestId: string): Promise<{ id: string }> {
    return this.request('retry request', () =>
      this.axios.post(`/requests/${requestId}/retry`)
    );
  }

  async bulkRetryRequests(query: Record<string, unknown>): Promise<HookdeckBulkOperation> {
    return this.request('bulk retry requests', () =>
      this.axios.post('/bulk/requests/retry', { query })
    );
  }

  async planBulkRetryRequests(query: Record<string, unknown>): Promise<unknown> {
    return this.request('plan bulk request retry', () =>
      this.axios.post('/bulk/requests/retry/plan', { query })
    );
  }

  async getBulkRequestRetry(bulkRetryId: string): Promise<HookdeckBulkOperation> {
    return this.request('retrieve bulk request retry', () =>
      this.axios.get(`/bulk/requests/retry/${bulkRetryId}`)
    );
  }

  async cancelBulkRequestRetry(bulkRetryId: string): Promise<HookdeckBulkOperation> {
    return this.request('cancel bulk request retry', () =>
      this.axios.post(`/bulk/requests/retry/${bulkRetryId}/cancel`)
    );
  }

  // ---- Issues ----

  async listIssues(
    params?: PaginationParams & {
      type?: string;
      status?: string;
    }
  ): Promise<PaginatedResponse<HookdeckIssue>> {
    return this.request('list issues', () => this.axios.get('/issues', { params }));
  }

  async getIssue(issueId: string): Promise<HookdeckIssue> {
    return this.request('retrieve issue', () => this.axios.get(`/issues/${issueId}`));
  }

  async updateIssue(issueId: string, data: { status: string }): Promise<HookdeckIssue> {
    return this.request('update issue', () => this.axios.put(`/issues/${issueId}`, data));
  }

  async dismissIssue(issueId: string): Promise<{ id?: string }> {
    return this.request('dismiss issue', () => this.axios.delete(`/issues/${issueId}`));
  }

  // ---- Issue Triggers ----

  async listIssueTriggers(
    params?: PaginationParams
  ): Promise<PaginatedResponse<HookdeckIssueTrigger>> {
    return this.request('list issue triggers', () =>
      this.axios.get('/issue-triggers', { params })
    );
  }

  async getIssueTrigger(triggerId: string): Promise<HookdeckIssueTrigger> {
    return this.request('retrieve issue trigger', () =>
      this.axios.get(`/issue-triggers/${triggerId}`)
    );
  }

  async createIssueTrigger(data: IssueTriggerInput): Promise<HookdeckIssueTrigger> {
    return this.request('create issue trigger', () =>
      this.axios.post('/issue-triggers', data)
    );
  }

  async updateIssueTrigger(
    triggerId: string,
    data: IssueTriggerInput
  ): Promise<HookdeckIssueTrigger> {
    return this.request('update issue trigger', () =>
      this.axios.put(`/issue-triggers/${triggerId}`, data)
    );
  }

  async deleteIssueTrigger(triggerId: string): Promise<{ id: string }> {
    return this.request('delete issue trigger', () =>
      this.axios.delete(`/issue-triggers/${triggerId}`)
    );
  }

  async disableIssueTrigger(triggerId: string): Promise<HookdeckIssueTrigger> {
    return this.request('disable issue trigger', () =>
      this.axios.put(`/issue-triggers/${triggerId}/disable`)
    );
  }

  async enableIssueTrigger(triggerId: string): Promise<HookdeckIssueTrigger> {
    return this.request('enable issue trigger', () =>
      this.axios.put(`/issue-triggers/${triggerId}/enable`)
    );
  }

  // ---- Transformations ----

  async listTransformations(
    params?: PaginationParams & { name?: string }
  ): Promise<PaginatedResponse<HookdeckTransformation>> {
    return this.request('list transformations', () =>
      this.axios.get('/transformations', { params })
    );
  }

  async getTransformation(transformationId: string): Promise<HookdeckTransformation> {
    return this.request('retrieve transformation', () =>
      this.axios.get(`/transformations/${transformationId}`)
    );
  }

  async createTransformation(data: {
    name: string;
    code: string;
    env?: Record<string, string>;
  }): Promise<HookdeckTransformation> {
    return this.request('create transformation', () =>
      this.axios.post('/transformations', data)
    );
  }

  async updateTransformation(
    transformationId: string,
    data: {
      name?: string;
      code?: string;
      env?: Record<string, string>;
    }
  ): Promise<HookdeckTransformation> {
    return this.request('update transformation', () =>
      this.axios.put(`/transformations/${transformationId}`, data)
    );
  }

  async deleteTransformation(transformationId: string): Promise<{ id: string }> {
    return this.request('delete transformation', () =>
      this.axios.delete(`/transformations/${transformationId}`)
    );
  }

  // ---- Bookmarks ----

  async listBookmarks(
    params?: PaginationParams
  ): Promise<PaginatedResponse<HookdeckBookmark>> {
    return this.request('list bookmarks', () => this.axios.get('/bookmarks', { params }));
  }

  async getBookmark(bookmarkId: string): Promise<HookdeckBookmark> {
    return this.request('retrieve bookmark', () => this.axios.get(`/bookmarks/${bookmarkId}`));
  }

  async createBookmark(data: {
    label: string;
    event_data_id: string;
    webhook_id: string;
  }): Promise<HookdeckBookmark> {
    return this.request('create bookmark', () => this.axios.post('/bookmarks', data));
  }

  async updateBookmark(
    bookmarkId: string,
    data: {
      label?: string;
      event_data_id?: string;
      webhook_id?: string;
    }
  ): Promise<HookdeckBookmark> {
    return this.request('update bookmark', () =>
      this.axios.put(`/bookmarks/${bookmarkId}`, data)
    );
  }

  async triggerBookmark(bookmarkId: string): Promise<HookdeckEvent> {
    return this.request('trigger bookmark', () =>
      this.axios.post(`/bookmarks/${bookmarkId}/trigger`)
    );
  }

  async deleteBookmark(bookmarkId: string): Promise<{ id: string }> {
    return this.request('delete bookmark', () =>
      this.axios.delete(`/bookmarks/${bookmarkId}`)
    );
  }

  // ---- Notifications ----

  async getWebhookNotifications(): Promise<{
    enabled: boolean;
    source_id?: string | null;
    topics: string[];
  }> {
    return this.request('retrieve webhook notifications', () =>
      this.axios.get('/notifications/webhooks')
    );
  }

  async updateWebhookNotifications(data: {
    enabled: boolean;
    source_id?: string;
    topics?: string[];
  }): Promise<{
    enabled: boolean;
    source_id?: string | null;
    topics: string[];
  }> {
    return this.request('update webhook notifications', () =>
      this.axios.put('/notifications/webhooks', data)
    );
  }

  // ---- Publish API ----

  async publishEvent(data: {
    source_id?: string;
    source_name?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<unknown> {
    let publishAxios = createAxios({
      baseURL: 'https://hkdk.events/v1',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      }
    });

    return this.request('publish event', () => publishAxios.post('/publish', data));
  }

  // ---- Attempts ----

  async listAttempts(
    params?: PaginationParams & {
      event_id?: string;
      status?: string;
    }
  ): Promise<PaginatedResponse<HookdeckAttempt>> {
    return this.request('list attempts', () => this.axios.get('/attempts', { params }));
  }

  async getAttempt(attemptId: string): Promise<HookdeckAttempt> {
    return this.request('retrieve attempt', () => this.axios.get(`/attempts/${attemptId}`));
  }

  // ---- Metrics ----

  async queryMetrics(
    metric: string,
    params: Record<string, unknown>
  ): Promise<HookdeckMetricsResponse> {
    return this.request('query metrics', () =>
      this.axios.get(`/metrics/${metric}`, { params })
    );
  }
}
