import {
  type SlateWebhookHttpOptions,
  type SlateWebhookHttpResponseInit,
  verifyHmacSignature
} from 'slates';

export const notionWebhookHttp = {
  methods: ['POST'],
  sync: {
    mode: 'match',
    match: [{ jsonBodyField: { path: 'verification_token' } }]
  }
} satisfies SlateWebhookHttpOptions;

export type NotionWebhookRequestResult =
  | {
      type: 'complete';
      result: {
        inputs: never[];
        updatedState?: any;
        response?: SlateWebhookHttpResponseInit;
      };
    }
  | { type: 'events'; events: any[] };

/**
 * Handles Notion's shared webhook plumbing: the one-time `verification_token` capture and
 * `X-Notion-Signature` verification of every later delivery (HMAC-SHA256 keyed with the
 * stored token). Returns the parsed events for trigger-specific filtering otherwise.
 */
export let handleNotionWebhookRequest = async (ctx: {
  request: Request;
  state: any | null;
}): Promise<NotionWebhookRequestResult> => {
  let rawBody = await ctx.request.text();

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { type: 'complete', result: { inputs: [] } };
  }
  if (body === null || typeof body !== 'object') {
    return { type: 'complete', result: { inputs: [] } };
  }

  if (typeof body.verification_token === 'string') {
    return {
      type: 'complete',
      result: {
        inputs: [],
        updatedState: { ...(ctx.state ?? {}), verificationToken: body.verification_token },
        response: { status: 200 }
      }
    };
  }

  let verificationToken = ctx.state?.verificationToken;
  if (typeof verificationToken === 'string' && verificationToken.length > 0) {
    let signature = ctx.request.headers.get('x-notion-signature');
    if (
      !signature ||
      !verifyHmacSignature({
        secret: verificationToken,
        payload: rawBody,
        signature: signature.trim(),
        digest: 'hex',
        prefix: 'sha256='
      })
    ) {
      return {
        type: 'complete',
        result: {
          inputs: [],
          response: { status: 401, body: 'invalid signature' }
        }
      };
    }
  }

  let events: any[] = [];
  if (body.type && body.entity) {
    events.push(body);
  } else if (Array.isArray(body.events)) {
    events = body.events;
  } else if (body.event) {
    events.push(body.event);
  }

  return { type: 'events', events };
};
