import { invalid, json, protect, segment, webhookKey } from './contracts';

export class WebhooksClient {
  private secrets: string[];
  constructor(key: string, serviceKey?: string) {
    this.secrets = [webhookKey(key), serviceKey ?? ''].filter(Boolean);
  }
  private send(eventName: string, data: Record<string, unknown>): never {
    segment(eventName, 'exact configured event name');
    protect({ eventName, data }, this.secrets);
    json(data, 'Webhook payload');
    // The documented key-in-path request exposes credentials in public HTTP traces.
    // Refuse before dispatch until the HTTP client supports safe path redaction.
    return invalid(
      "Webhook execution is currently unavailable because the required Webhooks credential cannot be transmitted confidentially through this connection. Use IFTTT's Webhooks Documentation instructions to invoke the event directly with a trusted HTTP client. No request was sent."
    );
  }
  triggerEvent(
    eventName: string,
    values?: { value1?: string; value2?: string; value3?: string }
  ): never {
    return this.send(eventName, values ?? {});
  }
  triggerEventWithJson(eventName: string, payload: Record<string, unknown>): never {
    return this.send(eventName, payload);
  }
}
