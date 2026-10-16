import {
  buildApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { type ApiObject, object, objects, responseError } from './response';

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Browse AI',
    reason: 'browseai_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'messageCode', 'error', 'errors', 'detail'],
    extractUpstreamCode: (_error, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.messageCode === 'string'
        ? response.data.messageCode
        : undefined
  });

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.browse.ai/v2',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: apiError
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown,
    params?: ApiObject
  ): Promise<ApiObject> {
    let response = await this.axios.request({
      method,
      url,
      data,
      params: params ? pickDefined(params) : undefined
    });
    let body = object(response.data, 'response envelope');
    if (
      (typeof body.statusCode === 'number' && body.statusCode >= 400) ||
      (typeof body.messageCode === 'string' && body.messageCode !== 'success')
    ) {
      throw apiError({ response: { status: body.statusCode ?? response.status, data: body } });
    }
    return body;
  }

  private confirmed(body: ApiObject): ApiObject {
    if (body.statusCode !== 200 || body.messageCode !== 'success')
      responseError('operation confirmation');
    return body;
  }

  private payload(body: ApiObject, key: string): ApiObject {
    let result = isApiErrorRecord(body.result) ? body.result : undefined;
    return object(body[key] ?? result?.[key] ?? body.result, key);
  }

  async listRobots() {
    return this.payload(await this.request('GET', '/robots'), 'robots');
  }
  async getRobot(robotId: string) {
    return this.payload(
      await this.request('GET', `/robots/${encodeURIComponent(robotId)}`),
      'robot'
    );
  }
  async createTask(robotId: string, inputParameters: ApiObject, recordVideo?: boolean) {
    return this.payload(
      await this.request(
        'POST',
        `/robots/${encodeURIComponent(robotId)}/tasks`,
        pickDefined({ inputParameters, recordVideo })
      ),
      'task'
    );
  }
  async getTask(robotId: string, taskId: string) {
    return this.payload(
      await this.request(
        'GET',
        `/robots/${encodeURIComponent(robotId)}/tasks/${encodeURIComponent(taskId)}`
      ),
      'task'
    );
  }
  async listTasks(robotId: string, params?: ApiObject) {
    return this.payload(
      await this.request(
        'GET',
        `/robots/${encodeURIComponent(robotId)}/tasks`,
        undefined,
        params
      ),
      'robotTasks'
    );
  }
  async createBulkRun(robotId: string, title: string, inputParametersList: ApiObject[]) {
    return this.payload(
      await this.request('POST', `/robots/${encodeURIComponent(robotId)}/bulk-runs`, {
        title,
        inputParameters: inputParametersList
      }),
      'bulkRun'
    );
  }
  async getBulkRun(robotId: string, bulkRunId: string, page?: number) {
    return this.request(
      'GET',
      `/robots/${encodeURIComponent(robotId)}/bulk-runs/${encodeURIComponent(bulkRunId)}`,
      undefined,
      { page }
    );
  }
  async listBulkRuns(robotId: string, page?: number) {
    return this.payload(
      await this.request(
        'GET',
        `/robots/${encodeURIComponent(robotId)}/bulk-runs`,
        undefined,
        { page }
      ),
      'bulkRuns'
    );
  }
  async updateCookies(robotId: string, cookies: ApiObject[]) {
    return this.confirmed(
      await this.request('PATCH', `/robots/${encodeURIComponent(robotId)}/cookies`, cookies)
    );
  }
  async createWebhook(robotId: string, hookUrl: string, eventType: string) {
    return this.payload(
      await this.request('POST', `/robots/${encodeURIComponent(robotId)}/webhooks`, {
        hookUrl,
        eventType
      }),
      'webhook'
    );
  }
  async listWebhooks(robotId: string) {
    let body = await this.request('GET', `/robots/${encodeURIComponent(robotId)}/webhooks`);
    if (Array.isArray(body.result)) return objects(body.result, 'webhooks');
    return objects(this.payload(body, 'webhooks').items, 'webhooks');
  }
  async deleteWebhook(robotId: string, webhookId: string) {
    return this.confirmed(
      await this.request(
        'DELETE',
        `/robots/${encodeURIComponent(robotId)}/webhooks/${encodeURIComponent(webhookId)}`
      )
    );
  }
  async listMonitors(robotId: string) {
    return this.payload(
      await this.request('GET', `/robots/${encodeURIComponent(robotId)}/monitors`),
      'monitors'
    );
  }
  async getMonitor(robotId: string, monitorId: string) {
    return this.payload(
      await this.request(
        'GET',
        `/robots/${encodeURIComponent(robotId)}/monitors/${encodeURIComponent(monitorId)}`
      ),
      'monitor'
    );
  }
  async createMonitor(robotId: string, data: ApiObject) {
    return this.payload(
      await this.request('POST', `/robots/${encodeURIComponent(robotId)}/monitors`, data),
      'monitor'
    );
  }
  async updateMonitor(robotId: string, monitorId: string, data: ApiObject) {
    return this.payload(
      await this.request(
        'PATCH',
        `/robots/${encodeURIComponent(robotId)}/monitors/${encodeURIComponent(monitorId)}`,
        data
      ),
      'monitor'
    );
  }
  async deleteMonitor(robotId: string, monitorId: string) {
    return this.confirmed(
      await this.request(
        'DELETE',
        `/robots/${encodeURIComponent(robotId)}/monitors/${encodeURIComponent(monitorId)}`
      )
    );
  }
  async getSystemStatus() {
    return this.request('GET', '/status');
  }
}
