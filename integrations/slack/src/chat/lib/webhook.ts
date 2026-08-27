import { verifyHmacSignature } from 'slates';

const MAX_REQUEST_AGE_SECONDS = 300;

export type ParsedSlackRequest =
  | { kind: 'event'; body: Record<string, any>; event: Record<string, any> }
  | { kind: 'interaction'; body: Record<string, any> }
  | { kind: 'command'; body: Record<string, string> };

let unauthorized = () => ({
  inputs: [],
  response: { status: 401, body: 'invalid signature' }
});

let verifyRequest = (ctx: any, raw: string) => {
  let secret = ctx.config.signingSecret;
  if (!secret) return true;
  let timestamp = ctx.request.headers.get('x-slack-request-timestamp');
  let signature = ctx.request.headers.get('x-slack-signature');
  let seconds = timestamp ? Number(timestamp) : Number.NaN;
  return (
    !!timestamp &&
    !!signature &&
    Number.isFinite(seconds) &&
    Math.abs(Date.now() / 1000 - seconds) <= MAX_REQUEST_AGE_SECONDS &&
    verifyHmacSignature({
      secret,
      payload: `v0:${timestamp}:${raw}`,
      signature,
      digest: 'hex',
      prefix: 'v0='
    })
  );
};

let parseRequest = (raw: string, contentType: string | null): ParsedSlackRequest | null => {
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    let params = new URLSearchParams(raw);
    let payload = params.get('payload');
    if (payload) {
      try {
        return { kind: 'interaction', body: JSON.parse(payload) };
      } catch {
        return null;
      }
    }
    if (params.has('command')) {
      return { kind: 'command', body: Object.fromEntries(params) };
    }
    return null;
  }
  try {
    let body = JSON.parse(raw) as Record<string, any>;
    if (body.type === 'event_callback' && body.event) {
      return { kind: 'event', body, event: body.event };
    }
    return null;
  } catch {
    return null;
  }
};

export let slackWebhookHttp = {
  methods: ['POST'] as ['POST'],
  sync: {
    mode: 'always' as const,
    timeoutMs: 15_000
  }
};

export let handleSlackWebhook = async <Input>(
  ctx: any,
  map: (
    request: ParsedSlackRequest,
    ctx: any
  ) => Promise<Input | Input[] | undefined> | Input | Input[] | undefined
) => {
  let raw = await ctx.request.text();
  if (!verifyRequest(ctx, raw)) return unauthorized();

  try {
    let json = JSON.parse(raw);
    if (json.type === 'url_verification' && typeof json.challenge === 'string') {
      return {
        inputs: [],
        response: {
          status: 200,
          headers: { 'content-type': 'text/plain' },
          body: json.challenge
        }
      };
    }
  } catch {
    // Form-encoded Slack callbacks are parsed below.
  }

  let request = parseRequest(raw, ctx.request.headers.get('content-type'));
  if (!request) return { inputs: [] };
  let mapped = await map(request, ctx);
  return {
    inputs: mapped === undefined ? [] : Array.isArray(mapped) ? mapped : [mapped],
    ...(request.kind === 'interaction' || request.kind === 'command'
      ? { response: { status: 200, body: '' } }
      : {})
  };
};

export let parseSlackViewValues = (state: Record<string, any> | undefined) => {
  let values: Record<string, unknown> = {};
  for (let [blockId, actions] of Object.entries(state?.values ?? {})) {
    for (let [actionId, action] of Object.entries(actions as Record<string, any>)) {
      let value =
        action.value ??
        action.selected_date ??
        action.selected_option?.value ??
        action.selected_options?.map((item: any) => item.value) ??
        action.selected_users ??
        action.selected_channels ??
        action.selected_conversations;
      values[actionId || blockId] = value;
    }
  }
  return values;
};

export let decodeModalMetadata = (value?: string) => {
  if (!value) return {};
  try {
    let parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object')
      return parsed as Record<string, string | undefined>;
  } catch {
    // Legacy plain metadata is returned as-is.
  }
  return { privateMetadata: value };
};
