import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import type { BacktraceLine, HoneybadgerRegion } from './types';
import { honeybadgerError, hosts, pathId } from './validation';

const jsonPayload = (value: unknown, maxBytes?: number) => {
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    throw createApiServiceError(
      'The reporting payload must contain JSON-serializable values.'
    );
  }
  if (maxBytes !== undefined && Buffer.byteLength(json, 'utf8') >= maxBytes)
    throw createApiServiceError(`Reporting payload must be smaller than ${maxBytes} bytes.`);
  return json;
};
export class HoneybadgerReportingClient {
  private http;
  private projectToken?: string;
  constructor(config: { projectToken?: string; region?: HoneybadgerRegion }) {
    this.projectToken = config.projectToken?.trim();
    this.http = createAuthenticatedAxios({
      baseURL: hosts(config.region).reporting,
      timeout: 30_000,
      ...(this.projectToken
        ? { authHeader: { name: 'X-API-Key', value: this.projectToken } }
        : {}),
      headers: { Accept: 'application/json' },
      errorAdapter: honeybadgerError
    });
  }
  private requireKey() {
    if (!this.projectToken)
      throw createApiServiceError(
        'Configure a project API key to report errors, events or deployments.'
      );
  }
  async reportDeploy(deploy: {
    environment?: string;
    revision?: string;
    repository?: string;
    localUsername?: string;
  }) {
    this.requireKey();
    const response = await this.http.post<{ status?: string }>('/deploys', {
      deploy: {
        environment: deploy.environment,
        revision: deploy.revision,
        repository: deploy.repository,
        local_username: deploy.localUsername
      }
    });
    if (response.data?.status !== 'OK')
      throw createApiServiceError(
        'Honeybadger did not confirm deployment report acceptance. Inspect the selected project before resubmitting.'
      );
  }
  async reportCheckIn(checkInId: string) {
    await this.http.get(`/check_in/${pathId(checkInId, 'Check-in ID')}`);
  }
  async sendEvents(events: Record<string, unknown>[]) {
    this.requireKey();
    if (!events.length) throw createApiServiceError('Provide at least one event.');
    const lines = events.map(event => jsonPayload(event, 100 * 1024));
    const ndjson = `${lines.join('\n')}\n`;
    if (Buffer.byteLength(ndjson, 'utf8') >= 5 * 1024 * 1024)
      throw createApiServiceError('The event batch must be smaller than 5 MB.');
    await this.http.post('/events', ndjson, { transformRequest: [data => data] });
  }
  async reportError(error: {
    errorClass: string;
    message: string;
    tags?: string[];
    fingerprint?: string;
    environment?: string;
    component?: string;
    action?: string;
    context?: Record<string, unknown>;
    backtrace?: BacktraceLine[];
  }) {
    this.requireKey();
    if (!error.errorClass.trim() || !error.message.trim())
      throw createApiServiceError('errorClass and message must not be empty.');
    const response = await this.http.post<{ id: string }>(
      '/notices',
      jsonPayload(
        {
          notifier: {
            name: 'Honeybadger API Integration',
            url: 'https://metorial.com',
            version: '0.3.1'
          },
          error: {
            class: error.errorClass,
            message: error.message,
            tags: error.tags,
            fingerprint: error.fingerprint,
            backtrace: error.backtrace ?? []
          },
          request: {
            component: error.component,
            action: error.action,
            context: error.context
          },
          server: { environment_name: error.environment }
        },
        256 * 1024
      )
    );
    if (!response.data || typeof response.data.id !== 'string' || !response.data.id)
      throw createApiServiceError(
        'Honeybadger accepted the request without a notice ID. Inspect the project before resubmitting.'
      );
    return response.data;
  }
}
