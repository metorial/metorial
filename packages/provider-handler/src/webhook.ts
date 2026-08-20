import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  computeWebhookActionSpecHashV1,
  parseWebhookWireRequest,
  parseWebhookWireResponse,
  type SlatesWebhookHttpResponse,
  type WebhookWireRequest,
  type WebhookWireResponse
} from '@slates/proto';
import type { SlateWebhookHttpResponseInit } from '@slates/provider';

export let SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES = 1024 * 1024;

/**
 * Secure webhook boundaries accept only the ordered tuple/base64 wire contract. Fetch
 * Request/Response, Headers, and record-shaped substitutes fail strict schema validation.
 */
export let serializeWebhookWireRequest = (request: WebhookWireRequest) => {
  let parsed = parseWebhookWireRequest(request);
  return JSON.stringify(parsed);
};

export let deserializeWebhookWireRequest = (serialized: string): WebhookWireRequest =>
  parseWebhookWireRequest(JSON.parse(serialized));

export let serializeWebhookWireResponse = (response: WebhookWireResponse) => {
  let parsed = parseWebhookWireResponse(response);
  return JSON.stringify(parsed);
};

export let deserializeWebhookWireResponse = (serialized: string): WebhookWireResponse =>
  parseWebhookWireResponse(JSON.parse(serialized));

export let recomputeWebhookActionSpecHashV1 = computeWebhookActionSpecHashV1;

let serializeBody = (body: Uint8Array | null): SlatesWebhookHttpResponse['body'] => {
  if (body === null) return null;

  if (body.byteLength > SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES) {
    throw new ServiceError(
      badRequestError({
        message: `Webhook response body exceeds the ${SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES}-byte limit`
      })
    );
  }

  return {
    encoding: 'base64',
    content: Buffer.from(body).toString('base64')
  };
};

let headersToObject = (headers: Headers) => {
  let result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

let validateStatus = (status: number) => {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new ServiceError(
      badRequestError({
        message: 'Webhook response status must be an integer between 100 and 599'
      })
    );
  }
};

export let serializeWebhookHttpResponse = async (
  response: Response | SlateWebhookHttpResponseInit
): Promise<SlatesWebhookHttpResponse> => {
  if (response instanceof Response) {
    validateStatus(response.status);
    return {
      status: response.status,
      headers: headersToObject(response.headers),
      body: serializeBody(
        response.body === null ? null : new Uint8Array(await response.arrayBuffer())
      )
    };
  }

  let status = response.status ?? 200;
  validateStatus(status);

  let body =
    typeof response.body === 'string'
      ? new TextEncoder().encode(response.body)
      : (response.body ?? null);

  return {
    status,
    headers: response.headers ?? {},
    body: serializeBody(body)
  };
};
