import { createAxios } from 'slates';

export class WebhooksClient {
  private http;

  constructor(private webhooksKey: string) {
    this.http = createAxios({
      baseURL: 'https://maker.ifttt.com'
    });
  }

  async triggerEvent(
    eventName: string,
    values?: { value1?: string; value2?: string; value3?: string }
  ) {
    let response = await this.http.post(
      `/trigger/${encodeURIComponent(eventName)}/with/key/${this.webhooksKey}`,
      values || {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async triggerEventWithJson(eventName: string, jsonPayload: Record<string, any>) {
    let response = await this.http.post(
      `/trigger/${encodeURIComponent(eventName)}/json/with/key/${this.webhooksKey}`,
      jsonPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
}
