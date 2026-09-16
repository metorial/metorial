import { verifyHmacSignature } from 'slates';
import { z } from 'zod';
import { githubEventSchemas, isGitHubEventName } from './event-schemas';
import { githubRegistrationSchema } from './registration';

// GitHub documents X-GitHub-Delivery as a GUID:
// https://docs.github.com/en/webhooks/webhook-events-and-payloads#delivery-headers
const deliverySchema = z.guid();
const identitySchema = z.looseObject({
  repository: z.looseObject({ id: z.number().int().positive() })
});

type WebhookContext = {
  input: { request: Request; webhookRegistrationPayload: unknown };
  warn: (message: object) => void;
  info: (message: object) => void;
};

export const processGitHubWebhook = async (ctx: WebhookContext) => {
  const { request } = ctx.input;
  const event = request.headers.get('x-github-event');
  const deliveryHeader = request.headers.get('x-github-delivery');
  // Never log secrets or payload bodies; headers identify the delivery for triage.
  const details = {
    event,
    delivery: deliveryHeader,
    hook: request.headers.get('x-github-hook-id')
  };
  const reject = (
    status: number,
    reason: string,
    body: string,
    response: { headers?: Record<string, string> } = {}
  ) => {
    const entry = { message: body, reason, status, ...details };
    if (status >= 400) ctx.warn(entry);
    else ctx.info(entry);
    return { events: [], response: { status, body, ...response } };
  };

  const registration = githubRegistrationSchema.safeParse(
    ctx.input.webhookRegistrationPayload
  );
  if (!registration.success)
    return reject(500, 'github_webhook_registration_invalid', 'Invalid webhook registration.');
  if (request.method !== 'POST')
    return reject(405, 'github_webhook_method_not_allowed', 'POST required.', {
      headers: { Allow: 'POST' }
    });
  const raw = new Uint8Array(await request.arrayBuffer());
  const signature = request.headers.get('x-hub-signature-256');
  if (
    !signature ||
    !/^sha256=[a-f0-9]{64}$/.test(signature) ||
    !verifyHmacSignature({
      secret: registration.data.signingSecret,
      payload: raw,
      signature,
      algorithm: 'sha256',
      digest: 'hex',
      prefix: 'sha256='
    })
  )
    return reject(401, 'github_webhook_signature_invalid', 'Invalid webhook signature.');

  const delivery = deliverySchema.safeParse(deliveryHeader);
  if (!event || !delivery.success)
    return reject(
      400,
      'github_webhook_headers_invalid',
      'Missing or invalid GitHub delivery headers.'
    );
  if (request.headers.get('x-github-hook-id') !== String(registration.data.hookId))
    return reject(403, 'github_webhook_hook_mismatch', 'Webhook identity mismatch.');
  // Repository hooks always carry installation target headers naming the repository.
  if (
    request.headers.get('x-github-hook-installation-target-id') !==
      String(registration.data.repositoryId) ||
    request.headers.get('x-github-hook-installation-target-type') !== 'repository'
  )
    return reject(403, 'github_webhook_target_mismatch', 'Repository target mismatch.');
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  } catch {
    return reject(400, 'github_webhook_json_invalid', 'Invalid webhook JSON.');
  }
  const identity = identitySchema.safeParse(body);
  if (!identity.success)
    return reject(400, 'github_webhook_repository_missing', 'Invalid repository event.');
  if (identity.data.repository.id !== registration.data.repositoryId)
    return reject(403, 'github_webhook_repository_mismatch', 'Repository identity mismatch.');
  if (event === 'ping') {
    const ping = z.object({ hook_id: z.literal(registration.data.hookId) }).safeParse(body);
    return ping.success
      ? reject(200, 'github_webhook_ping', '')
      : reject(400, 'github_webhook_ping_invalid', 'Invalid webhook ping.');
  }
  if (!isGitHubEventName(event)) return reject(200, 'github_webhook_event_unsupported', '');
  const parsed = githubEventSchemas[event].safeParse(body);
  if (!parsed.success)
    return reject(400, 'github_webhook_payload_invalid', 'Invalid GitHub event payload.');
  return {
    events: [
      {
        // Automatic targets route through subscriptions; matchers are unused on this path.
        matchers: [],
        idempotencyKey: delivery.data,
        payload: {
          deliveryId: delivery.data,
          event,
          action: parsed.data.action ?? null,
          payload: parsed.data
        }
      }
    ],
    response: { status: 200, body: '' }
  };
};
