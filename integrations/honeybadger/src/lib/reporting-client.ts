import { createAxios } from 'slates';

export class HoneybadgerReportingClient {
  private http;

  constructor(config: { projectToken: string }) {
    this.http = createAxios({
      baseURL: 'https://api.honeybadger.io/v1',
      headers: {
        'X-API-Key': config.projectToken,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async reportDeploy(deploy: {
    environment?: string;
    revision?: string;
    repository?: string;
    localUsername?: string;
  }) {
    let response = await this.http.post('/deploys', {
      deploy: {
        environment: deploy.environment,
        revision: deploy.revision,
        repository: deploy.repository,
        local_username: deploy.localUsername
      }
    });
    return response.data;
  }

  async reportCheckIn(checkInId: string) {
    let response = await this.http.get(`/check_in/${checkInId}`);
    return response.data;
  }

  async reportCheckInBySlug(projectApiKey: string, slug: string) {
    let response = await this.http.get(`/check_in/${projectApiKey}/${slug}`);
    return response.data;
  }

  async sendEvents(events: Record<string, unknown>[]) {
    let ndjson = events.map(e => JSON.stringify(e)).join('\n');
    let response = await this.http.post('/events', ndjson, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
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
  }) {
    let response = await this.http.post('/notices', {
      notifier: {
        name: 'Slates Honeybadger Integration',
        url: 'https://slates.dev',
        version: '1.0.0'
      },
      error: {
        class: error.errorClass,
        message: error.message,
        tags: error.tags,
        fingerprint: error.fingerprint
      },
      request: {
        component: error.component,
        action: error.action,
        context: error.context
      },
      server: {
        environment_name: error.environment
      }
    });
    return response.data;
  }
}
