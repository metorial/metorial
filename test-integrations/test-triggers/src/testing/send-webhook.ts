import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TEST_GRAPH_RESOURCE } from '../triggers/webhook-verification/graph';
import {
  TEST_ED25519_PRIVATE_SEED_HEX,
  TEST_ED25519_PUBLIC_KEY_HEX,
  TEST_HMAC_SECRET,
  TEST_PROVIDER_TOKEN,
  TEST_STATIC_TOKEN
} from '../triggers/webhook-verification/shared';
import {
  buildDiscordWebhookBootstrapRequest,
  buildGraphWebhookBootstrapRequest,
  buildWebhookTestRequest,
  buildZoomWebhookBootstrapRequest,
  isSlackWebhookTestTriggerKey,
  resolveSlackWebhookTestCase,
  SLACK_WEBHOOK_TEST_CASES,
  type SlackWebhookTestCase,
  WEBHOOK_TEST_TRIGGER_KEYS,
  type WebhookTestRequestDescriptor,
  type WebhookTestTriggerKey
} from './requests';

export type SendWebhookCliOptions = {
  triggerKey: WebhookTestTriggerKey;
  callbackUrl: string;
  invalid: boolean;
  dryRun: boolean;
  bootstrap: boolean;
  slackCase?: SlackWebhookTestCase;
};

export type SendWebhookRunDependencies = {
  fetch: typeof globalThis.fetch;
  writeOut: (value: string) => void;
  writeErr: (value: string) => void;
  now?: () => number;
  eventId?: () => string;
  timeoutMs?: number;
};

let BOOTSTRAP_TRIGGER_KEYS = new Set<WebhookTestTriggerKey>([
  'verify_preset_zoom_v0',
  'verify_preset_discord_interactions_v1',
  'verify_preset_graph_change_notification_v1'
]);

let isTriggerKey = (value: string): value is WebhookTestTriggerKey =>
  (WEBHOOK_TEST_TRIGGER_KEYS as readonly string[]).includes(value);

let validateCallbackUrl = (value: string) => {
  let callbackUrl: URL;
  try {
    callbackUrl = new URL(value);
  } catch {
    throw new TypeError('Callback URL must be a valid HTTP or HTTPS URL');
  }
  if (callbackUrl.protocol !== 'http:' && callbackUrl.protocol !== 'https:') {
    throw new TypeError('Callback URL must use HTTP or HTTPS');
  }
  if (callbackUrl.username || callbackUrl.password) {
    throw new TypeError('Callback URL must not contain a username or password');
  }
};

let parseSlackCase = (value: string | undefined) => {
  if (value === undefined || value.startsWith('--')) {
    throw new TypeError('Slack case value is required');
  }
  if (!(SLACK_WEBHOOK_TEST_CASES as readonly string[]).includes(value)) {
    throw new TypeError(`Unknown Slack case: ${value}`);
  }
  return value as SlackWebhookTestCase;
};

export let parseSendWebhookArguments = (argv: readonly string[]): SendWebhookCliOptions => {
  let triggerKey = argv[0];
  if (triggerKey === undefined) throw new TypeError('Trigger key is required');
  if (triggerKey.startsWith('--')) {
    throw new TypeError('Argument order must be trigger key, callback URL, then flags');
  }

  let callbackUrl = argv[1];
  if (callbackUrl === undefined) throw new TypeError('Callback URL is required');
  if (callbackUrl.startsWith('--')) {
    throw new TypeError('Argument order must be trigger key, callback URL, then flags');
  }
  if (!isTriggerKey(triggerKey)) throw new TypeError('Unknown trigger key');
  validateCallbackUrl(callbackUrl);

  let invalid = false;
  let dryRun = false;
  let bootstrap = false;
  let slackCase: SlackWebhookTestCase | undefined;
  let seenFlags = new Set<string>();
  for (let index = 2; index < argv.length; index += 1) {
    let argument = argv[index]!;
    if (!argument.startsWith('--')) {
      throw new TypeError('Unexpected argument; flags must follow the callback URL');
    }
    if (
      argument !== '--invalid' &&
      argument !== '--dry-run' &&
      argument !== '--bootstrap' &&
      argument !== '--slack-case'
    ) {
      throw new TypeError('Unknown flag');
    }
    if (seenFlags.has(argument)) throw new TypeError('Duplicate flag');
    seenFlags.add(argument);

    if (argument === '--invalid') {
      invalid = true;
    } else if (argument === '--dry-run') {
      dryRun = true;
    } else if (argument === '--bootstrap') {
      bootstrap = true;
    } else {
      slackCase = parseSlackCase(argv[index + 1]);
      index += 1;
    }
  }

  if (slackCase !== undefined && !isSlackWebhookTestTriggerKey(triggerKey)) {
    throw new TypeError('Slack case is only valid for Slack trigger keys');
  }
  if (isSlackWebhookTestTriggerKey(triggerKey)) {
    slackCase = resolveSlackWebhookTestCase(triggerKey, slackCase);
  }
  if (bootstrap && !BOOTSTRAP_TRIGGER_KEYS.has(triggerKey)) {
    throw new TypeError('Bootstrap mode is only valid for Zoom, Discord, and Graph presets');
  }
  if (bootstrap && invalid) {
    throw new TypeError('Invalid mode is not supported for bootstrap requests');
  }
  return {
    triggerKey,
    callbackUrl,
    invalid,
    dryRun,
    bootstrap,
    ...(slackCase === undefined ? {} : { slackCase })
  };
};

let bodyByteLength = (body: string | Uint8Array) =>
  typeof body === 'string' ? Buffer.byteLength(body, 'utf8') : body.byteLength;

let requestOptions = (dependencies: SendWebhookRunDependencies) => ({
  ...(dependencies.now ? { now: dependencies.now() } : {}),
  ...(dependencies.eventId ? { eventId: dependencies.eventId() } : {})
});

let buildCliRequest = (
  options: SendWebhookCliOptions,
  dependencies: SendWebhookRunDependencies
) => {
  let commonOptions = requestOptions(dependencies);
  if (!options.bootstrap) {
    return buildWebhookTestRequest(options.triggerKey, options.callbackUrl, {
      ...commonOptions,
      invalid: options.invalid,
      ...(options.slackCase === undefined ? {} : { slackCase: options.slackCase })
    });
  }
  if (options.triggerKey === 'verify_preset_zoom_v0') {
    return buildZoomWebhookBootstrapRequest(options.callbackUrl, commonOptions);
  }
  if (options.triggerKey === 'verify_preset_discord_interactions_v1') {
    return buildDiscordWebhookBootstrapRequest(options.callbackUrl, commonOptions);
  }
  if (options.triggerKey === 'verify_preset_graph_change_notification_v1') {
    return buildGraphWebhookBootstrapRequest(options.callbackUrl, commonOptions);
  }
  throw new TypeError('Unsupported bootstrap trigger key');
};

let writeDryRun = (
  options: SendWebhookCliOptions,
  descriptor: WebhookTestRequestDescriptor,
  write: (value: string) => void
) => {
  write('Webhook verification dry run');
  write(`Trigger key: ${options.triggerKey}`);
  if (descriptor.slack) {
    write(`Slack case: ${descriptor.slack.case}`);
    write(`Request seed: ${descriptor.eventId}`);
    if (descriptor.slack.expectedMappedEventId !== null) {
      write(`Expected mapped event ID: ${descriptor.slack.expectedMappedEventId}`);
    }
    write(
      `Emits event: ${
        descriptor.expectedOutcome === 'accepted' &&
        descriptor.slack.expectedMappedEventId !== null
          ? 'yes'
          : 'no'
      }`
    );
  } else {
    write(`Event ID: ${descriptor.eventId}`);
  }
  write(`Method: ${descriptor.method}`);
  write(`Header names: ${descriptor.headers.map(([name]) => name).join(', ') || '(none)'}`);
  write(`Body byte length: ${bodyByteLength(descriptor.body)}`);
  write(`Expected outcome: ${descriptor.expectedOutcome}`);
  write(`Invalid: ${options.invalid}`);
  write(`Bootstrap: ${options.bootstrap}`);
};

let safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

let addLiteralVariants = (literals: Set<string>, value: string) => {
  if (!value) return;
  let decoded = safeDecodeURIComponent(value);
  let formEncoded = new URLSearchParams({ value: decoded }).toString().slice('value='.length);
  for (let candidate of [value, decoded, encodeURIComponent(decoded), formEncoded]) {
    if (candidate) literals.add(candidate);
  }
};

let addCallbackUrlLiterals = (literals: Set<string>, value: string) => {
  let url = new URL(value);
  addLiteralVariants(literals, value);
  addLiteralVariants(literals, url.toString());
  addLiteralVariants(literals, url.origin);
  addLiteralVariants(literals, url.host);
  addLiteralVariants(literals, url.hostname);
  addLiteralVariants(literals, url.username);
  addLiteralVariants(literals, url.password);
  for (let queryValue of url.searchParams.values()) addLiteralVariants(literals, queryValue);
  addLiteralVariants(literals, url.hash.slice(1));

  let pathPrefix = '';
  for (let pathSegment of url.pathname.split('/').filter(Boolean)) {
    addLiteralVariants(literals, pathSegment);
    pathPrefix = `${pathPrefix}/${pathSegment}`;
    addLiteralVariants(literals, pathPrefix);
    addLiteralVariants(literals, `${url.origin}${pathPrefix}`);
  }
  if (url.pathname !== '/') addLiteralVariants(literals, url.pathname);

  let credentialFreeUrl = new URL(url);
  credentialFreeUrl.username = '';
  credentialFreeUrl.password = '';
  addLiteralVariants(literals, credentialFreeUrl.toString());

  credentialFreeUrl.search = '';
  credentialFreeUrl.hash = '';
  addLiteralVariants(literals, credentialFreeUrl.toString());
};

let escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let CONTROL_GAP_PATTERN = '[\\u0000-\\u001f\\u007f-\\u009f]*';
let DEFAULT_IGNORABLE_PATTERN = /\p{Default_Ignorable_Code_Point}/gu;
let isControlGapCharacter = (character: string) => {
  let codePoint = character.codePointAt(0)!;
  return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
};

let flexibleLiteralPattern = (value: string) =>
  Array.from(value, escapeRegExp).join(CONTROL_GAP_PATTERN);

let FLEXIBLE_DIGITS_PATTERN = `\\d(?:${CONTROL_GAP_PATTERN}\\d)*`;
let FLEXIBLE_IDENTIFIER_PATTERN = `[a-z0-9-](?:${CONTROL_GAP_PATTERN}[a-z0-9-])*`;

let GRAPH_SUBSCRIPTION_PATTERN = new RegExp(
  `${flexibleLiteralPattern('test-graph-subscription-v')}${CONTROL_GAP_PATTERN}${FLEXIBLE_DIGITS_PATTERN}`,
  'gi'
);
let GRAPH_CLIENT_STATE_PATTERN = new RegExp(
  `${flexibleLiteralPattern('test-graph-client-state-v')}${CONTROL_GAP_PATTERN}${FLEXIBLE_DIGITS_PATTERN}(?:${CONTROL_GAP_PATTERN}${flexibleLiteralPattern('-invalid')})?`,
  'gi'
);
let GRAPH_VALIDATION_PATTERN = new RegExp(
  `${flexibleLiteralPattern('test-graph-validation-v')}${CONTROL_GAP_PATTERN}${FLEXIBLE_DIGITS_PATTERN}${CONTROL_GAP_PATTERN}${flexibleLiteralPattern('-v')}${CONTROL_GAP_PATTERN}${FLEXIBLE_DIGITS_PATTERN}${CONTROL_GAP_PATTERN}${flexibleLiteralPattern('-')}${CONTROL_GAP_PATTERN}${FLEXIBLE_IDENTIFIER_PATTERN}`,
  'gi'
);

let stripTerminalSequences = (value: string) => {
  let output = '';
  let index = 0;

  let consumeCsi = (start: number) => {
    let cursor = start;
    while (cursor < value.length) {
      let code = value.charCodeAt(cursor);
      cursor += 1;
      if (code >= 0x40 && code <= 0x7e) break;
    }
    return cursor;
  };

  let consumeStringControl = (start: number, allowBell: boolean) => {
    let cursor = start;
    while (cursor < value.length) {
      let code = value.charCodeAt(cursor);
      if (allowBell && code === 0x07) return cursor + 1;
      if (code === 0x9c) return cursor + 1;
      if (code === 0x1b && value.charCodeAt(cursor + 1) === 0x5c) return cursor + 2;
      cursor += 1;
    }
    return cursor;
  };

  while (index < value.length) {
    let code = value.charCodeAt(index);
    if (code === 0x1b) {
      let next = value.charCodeAt(index + 1);
      if (next === 0x5b) {
        index = consumeCsi(index + 2);
      } else if ([0x5d, 0x50, 0x58, 0x5e, 0x5f].includes(next)) {
        index = consumeStringControl(index + 2, next === 0x5d);
      } else {
        index = Math.min(index + 2, value.length);
      }
      continue;
    }
    if (code === 0x9b) {
      index = consumeCsi(index + 1);
      continue;
    }
    if ([0x90, 0x98, 0x9d, 0x9e, 0x9f].includes(code)) {
      index = consumeStringControl(index + 1, code === 0x9d);
      continue;
    }
    if (
      (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      (code >= 0x7f && code <= 0x9f)
    ) {
      index += 1;
      continue;
    }
    output += value[index];
    index += 1;
  }
  return output.replace(DEFAULT_IGNORABLE_PATTERN, '');
};

let escapeTerminalControls = (value: string) =>
  Array.from(value, character => {
    let codePoint = character.codePointAt(0)!;
    let controlLike =
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029 ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069);
    if (!controlLike) return character;
    if (character === '\n') return '\\n';
    if (character === '\r') return '\\r';
    if (character === '\t') return '\\t';
    return `\\u${codePoint.toString(16).padStart(4, '0')}`;
  }).join('');

let MIN_TRAILING_SENSITIVE_PREFIX_LENGTH = 4;
let GRAPH_SENSITIVE_PREFIXES = [
  'test-graph-subscription-v',
  'test-graph-client-state-v',
  'test-graph-validation-v'
];

let redactTrailingSensitivePrefix = (value: string, sensitiveLiterals: readonly string[]) => {
  let compact = '';
  let compactCharacterOffsets: number[] = [];
  let offset = 0;
  for (let character of value) {
    if (!isControlGapCharacter(character)) {
      compact += character;
      for (let index = 0; index < character.length; index += 1) {
        compactCharacterOffsets.push(offset);
      }
    }
    offset += character.length;
  }

  let compactLower = compact.toLowerCase();
  for (let literal of sensitiveLiterals) {
    let literalLower = literal.toLowerCase();
    let maxPrefixLength = Math.min(compactLower.length, literalLower.length - 1);
    for (
      let prefixLength = maxPrefixLength;
      prefixLength >= MIN_TRAILING_SENSITIVE_PREFIX_LENGTH;
      prefixLength -= 1
    ) {
      if (!compactLower.endsWith(literalLower.slice(0, prefixLength))) continue;
      let compactStart = compact.length - prefixLength;
      let sourceStart = compactCharacterOffsets[compactStart];
      if (sourceStart === undefined) continue;
      return `${value.slice(0, sourceStart)}[redacted]`;
    }
  }
  return value;
};

let createResponseRedactor = (
  callbackUrl: string,
  descriptor: WebhookTestRequestDescriptor,
  responseHeaderValues: readonly string[]
) => {
  let literals = new Set<string>();
  for (let value of [
    TEST_STATIC_TOKEN,
    TEST_HMAC_SECRET,
    TEST_PROVIDER_TOKEN,
    TEST_ED25519_PUBLIC_KEY_HEX,
    TEST_ED25519_PRIVATE_SEED_HEX,
    TEST_GRAPH_RESOURCE,
    'test-jira-client-key',
    ...descriptor.headers.map(([, value]) => value),
    ...(descriptor.slack?.responseRedactionLiterals ?? []),
    ...responseHeaderValues
  ]) {
    addLiteralVariants(literals, value);
  }
  addCallbackUrlLiterals(literals, callbackUrl);
  addCallbackUrlLiterals(literals, descriptor.url);

  let literalPattern = [...literals]
    .sort((left, right) => right.length - left.length)
    .map(flexibleLiteralPattern)
    .join('|');
  let sensitiveLiterals = [...literals, ...GRAPH_SENSITIVE_PREFIXES].sort(
    (left, right) => right.length - left.length
  );
  let lookaheadBytes = Math.min(
    Math.max(
      256,
      ...sensitiveLiterals.map(value => new TextEncoder().encode(value).byteLength)
    ),
    4_096
  );
  let redact = (value: string, redactTrailingPrefix = false) => {
    let normalized = stripTerminalSequences(value);
    if (redactTrailingPrefix) {
      normalized = redactTrailingSensitivePrefix(normalized, sensitiveLiterals);
    }
    let redacted = literalPattern
      ? normalized.replace(new RegExp(literalPattern, 'gi'), '[redacted]')
      : normalized;
    return escapeTerminalControls(
      redacted
        .replace(GRAPH_SUBSCRIPTION_PATTERN, '[redacted]')
        .replace(GRAPH_CLIENT_STATE_PATTERN, '[redacted]')
        .replace(GRAPH_VALIDATION_PATTERN, '[redacted]')
    );
  };
  return { lookaheadBytes, redact };
};

let MAX_RESPONSE_BODY_BYTES = 4_096;

let readBoundedResponseBody = async (
  response: Response,
  signal: AbortSignal,
  lookaheadBytes: number
) => {
  if (!response.body) {
    return {
      bytes: new Uint8Array(),
      text: '',
      truncated: false,
      sourceTruncated: false
    };
  }

  let retainedBodyLimit = MAX_RESPONSE_BODY_BYTES + lookaheadBytes;
  let reader = response.body.getReader();
  let chunks: Uint8Array[] = [];
  let retainedBytes = 0;
  let sourceTruncated = false;
  let rejectOnAbort: ((reason?: unknown) => void) | undefined;
  let aborted = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = reject;
  });
  let onAbort = () => rejectOnAbort?.(signal.reason ?? new Error('Request timed out'));
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    if (signal.aborted) onAbort();
    while (retainedBytes <= retainedBodyLimit) {
      let result = await Promise.race([reader.read(), aborted]);
      if (result.done) break;

      let remaining = retainedBodyLimit + 1 - retainedBytes;
      let retainedChunk =
        result.value.byteLength > remaining ? result.value.slice(0, remaining) : result.value;
      chunks.push(retainedChunk);
      retainedBytes += retainedChunk.byteLength;
      if (retainedBytes > retainedBodyLimit) {
        sourceTruncated = true;
        await reader.cancel();
        break;
      }
    }
  } catch (error) {
    try {
      await reader.cancel(signal.aborted ? signal.reason : error);
    } catch {
      // Preserve the original read or timeout failure.
    }
    throw error;
  } finally {
    signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }

  let bytes = new Uint8Array(Math.min(retainedBytes, retainedBodyLimit));
  let offset = 0;
  for (let chunk of chunks) {
    let remaining = bytes.byteLength - offset;
    if (remaining <= 0) break;
    let retainedChunk = chunk.subarray(0, remaining);
    bytes.set(retainedChunk, offset);
    offset += retainedChunk.byteLength;
  }
  return {
    bytes,
    text: new TextDecoder().decode(bytes),
    truncated: retainedBytes > MAX_RESPONSE_BODY_BYTES,
    sourceTruncated
  };
};

let truncateUtf8 = (value: string, maxBytes: number) => {
  let encoded = new TextEncoder().encode(value);
  if (encoded.byteLength <= maxBytes) return value;
  let boundary = maxBytes;
  while (boundary > 0 && (encoded[boundary]! & 0xc0) === 0x80) boundary -= 1;
  return new TextDecoder('utf-8', { fatal: true }).decode(encoded.subarray(0, boundary));
};

let writeResponseEvidence = async (
  options: SendWebhookCliOptions,
  descriptor: WebhookTestRequestDescriptor,
  response: Response,
  signal: AbortSignal,
  write: (value: string) => void
) => {
  let responseHeaders = [...response.headers.entries()];
  let redactor = createResponseRedactor(
    options.callbackUrl,
    descriptor,
    responseHeaders.map(([, value]) => value)
  );
  let responseBody = await readBoundedResponseBody(response, signal, redactor.lookaheadBytes);
  let displayedBody = truncateUtf8(
    redactor.redact(responseBody.text, responseBody.sourceTruncated || responseBody.truncated),
    MAX_RESPONSE_BODY_BYTES
  );

  write(`Trigger key: ${options.triggerKey}`);
  if (descriptor.slack) {
    write(`Slack case: ${descriptor.slack.case}`);
    write(`Request seed: ${descriptor.eventId}`);
    if (descriptor.slack.expectedMappedEventId !== null) {
      write(`Expected mapped event ID: ${descriptor.slack.expectedMappedEventId}`);
    }
    write(
      `Emits event: ${
        descriptor.expectedOutcome === 'accepted' &&
        descriptor.slack.expectedMappedEventId !== null
          ? 'yes'
          : 'no'
      }`
    );
  } else {
    write(`Event ID: ${descriptor.eventId}`);
  }
  write(`Response status: ${response.status}`);
  write('Response headers (values redacted):');
  if (responseHeaders.length === 0) {
    write('  (none)');
  } else {
    for (let [name] of responseHeaders) write(`  ${redactor.redact(name)}: [redacted]`);
  }
  write(
    `Response body (redacted${responseBody.truncated ? `, truncated to ${MAX_RESPONSE_BODY_BYTES} displayed bytes` : ''}): ${displayedBody || '(empty)'}`
  );
  return responseBody;
};

type RetainedResponseBody = Awaited<ReturnType<typeof readBoundedResponseBody>>;

let hasExactJsonOptionsResponse = (body: RetainedResponseBody) => {
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(body.bytes);
  } catch {
    return false;
  }
  try {
    let parsed: unknown = JSON.parse(decoded);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    let record = parsed as Record<string, unknown>;
    return (
      Object.keys(record).length === 1 &&
      Array.isArray(record.options) &&
      record.options.length === 0
    );
  } catch {
    return false;
  }
};

let hasMediaType = (value: string, expected: string) =>
  value.split(';', 1)[0]?.trim().toLowerCase() === expected.toLowerCase();

let validateSlackResponse = (
  descriptor: WebhookTestRequestDescriptor,
  response: Response,
  body: RetainedResponseBody
) => {
  let expected = descriptor.slack?.expectedResponse;
  if (!expected) return null;
  let accepted = response.status >= 200 && response.status < 300;
  if (expected.kind === 'accepted') return accepted ? null : 'status';
  if (expected.kind === 'rejected') return accepted ? 'status' : null;

  if (body.truncated || body.sourceTruncated) return 'truncated';
  if (response.status !== expected.status) return 'exact';
  if (expected.kind === 'empty') return body.bytes.byteLength === 0 ? null : 'exact';

  let contentType = response.headers.get('content-type') ?? '';
  let expectedContentType =
    expected.kind === 'text' ? expected.contentType : 'application/json';
  if (!hasMediaType(contentType, expectedContentType)) {
    return 'exact';
  }
  if (expected.kind === 'text') {
    return Buffer.from(body.bytes).equals(Buffer.from(expected.body, 'utf8')) ? null : 'exact';
  }
  return hasExactJsonOptionsResponse(body) ? null : 'exact';
};

export let runSendWebhook = async (
  options: SendWebhookCliOptions,
  dependencies: SendWebhookRunDependencies
) => {
  let descriptor = buildCliRequest(options, dependencies);
  if (options.dryRun) {
    writeDryRun(options, descriptor, dependencies.writeOut);
    return 0;
  }

  let timeoutMs = dependencies.timeoutMs ?? 15_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('Webhook request timeout must be a positive integer');
  }
  let abortController = new AbortController();
  let timeout = setTimeout(
    () => abortController.abort(new Error('Webhook request timed out')),
    timeoutMs
  );
  let response: Response;
  let responseBody: RetainedResponseBody;
  try {
    response = await dependencies.fetch(descriptor.url, {
      method: descriptor.method,
      headers: descriptor.headers,
      body: descriptor.body,
      redirect: 'manual',
      signal: abortController.signal
    });
    responseBody = await writeResponseEvidence(
      options,
      descriptor,
      response,
      abortController.signal,
      dependencies.writeOut
    );
  } catch {
    dependencies.writeErr(
      abortController.signal.aborted
        ? 'Webhook request timed out; verify callback availability and retry.'
        : 'Network request failed; verify callback availability and retry the webhook test.'
    );
    return 1;
  } finally {
    clearTimeout(timeout);
  }

  if (descriptor.slack) {
    let validationFailure = validateSlackResponse(descriptor, response, responseBody);
    if (validationFailure === 'truncated') {
      dependencies.writeErr(
        'Response was truncated before exact Slack response validation could complete.'
      );
      return 1;
    }
    if (validationFailure) {
      dependencies.writeErr(
        `Slack callback response did not match the expected response for case ${descriptor.slack.case}.`
      );
      return 1;
    }
    return 0;
  }

  let accepted = response.status >= 200 && response.status < 300;
  if (!options.invalid && !accepted) {
    dependencies.writeErr(
      `Expected a 2xx acceptance for the valid request, but received status ${response.status}. Check callback registration and verification evidence.`
    );
    return 1;
  }
  if (options.invalid && accepted) {
    dependencies.writeErr(
      `Expected the invalid request to be rejected with a non-2xx response, but received status ${response.status}. Check that verification runs before mapping.`
    );
    return 1;
  }
  return 0;
};

export let SEND_WEBHOOK_USAGE =
  'Usage: node dist/send-webhook/index.js <trigger-key> <callback-url> [--invalid] [--bootstrap] [--dry-run] [--slack-case <case>]';

export let isMainModule = (moduleUrl: string, entryPath: string | undefined) => {
  if (entryPath === undefined) return false;

  try {
    let canonicalModuleUrl = pathToFileURL(realpathSync(fileURLToPath(moduleUrl))).href;
    let canonicalEntryUrl = pathToFileURL(realpathSync(resolve(entryPath))).href;
    return canonicalModuleUrl === canonicalEntryUrl;
  } catch {
    return false;
  }
};

export let main = async (argv: readonly string[] = process.argv.slice(2)) => {
  let options: SendWebhookCliOptions;
  try {
    options = parseSendWebhookArguments(argv);
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Invalid arguments';
    process.stderr.write(`${message}\n${SEND_WEBHOOK_USAGE}\n`);
    return 1;
  }
  return runSendWebhook(options, {
    fetch: globalThis.fetch,
    writeOut: value => process.stdout.write(`${value}\n`),
    writeErr: value => process.stderr.write(`${value}\n`)
  });
};

if (isMainModule(import.meta.url, process.argv[1])) {
  main()
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      process.stderr.write(
        'Webhook test failed unexpectedly; retry with --dry-run for details.\n'
      );
      process.exitCode = 1;
    });
}
