import { createHash } from 'node:crypto';
import {
  decodeWebhookWireBody,
  encodeWebhookWireBody,
  getWebhookHeaderValues,
  parseWebhookWireRequest,
  type SafeWebhookRejectionCode,
  SLATE_WEBHOOK_ITEM_ADAPTER_IDS,
  SLATE_WEBHOOK_PRESET_DEFINITIONS,
  SLATE_WEBHOOK_PRESET_IDS,
  SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS,
  SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS,
  type SlateWebhookItemAdapterId,
  type SlateWebhookPresetId,
  type SlateWebhookProviderRule,
  type SlateWebhookRequestMatcher as SlateWebhookRuleRequestMatcher,
  type SlateWebhookVerificationRule,
  type WebhookWireRequest
} from '@slates/proto';

export type {
  SafeWebhookRejectionCode,
  SlateWebhookDeduplicate,
  SlateWebhookFreshness,
  SlateWebhookHttpMethod,
  SlateWebhookIngress,
  SlateWebhookItemAdapterId,
  SlateWebhookMessagePart,
  SlateWebhookPresetId,
  SlateWebhookProviderRule,
  SlateWebhookReplayPolicy,
  SlateWebhookRequestMatcher as SlateWebhookRuleRequestMatcher,
  SlateWebhookRuleResult,
  SlateWebhookSecretEncoding,
  SlateWebhookSecretRef,
  SlateWebhookSelector,
  SlateWebhookSignatureSource,
  SlateWebhookVerification,
  SlateWebhookVerificationRule,
  SlateWebhookVerifier,
  WebhookWireBody,
  WebhookWireRequest,
  WebhookWireResponse
} from '@slates/proto';
export {
  computeDispatchWebhookRequestHash,
  computeOriginalWebhookRequestHash,
  computeWebhookActionSpecHashV1,
  decodeWebhookWireBody,
  encodeCanonicalWebhookWireRequestV1,
  encodeCanonicalWebhookWireResponseV1,
  encodeWebhookWireBody,
  getWebhookHeaderValues,
  hashWebhookWireRequestV1,
  hashWebhookWireResponseV1,
  parseWebhookWireRequest,
  parseWebhookWireResponse,
  SLATE_WEBHOOK_ACTION_SPEC_HASH_DOMAIN,
  SLATE_WEBHOOK_ACTION_SPEC_HASH_VERSION,
  SLATE_WEBHOOK_CANONICAL_WIRE_VERSION,
  slatesWebhookHttp,
  webhookWireRequest,
  webhookWireResponse
} from '@slates/proto';

export let SLATE_WEBHOOK_MAX_GRAPH_CANDIDATES = 1000;
export let SLATE_WEBHOOK_MAX_JSON_DEPTH = 64;

let sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export let slateWebhookPresetIds = SLATE_WEBHOOK_PRESET_IDS;
export let slateWebhookItemAdapterIds = SLATE_WEBHOOK_ITEM_ADAPTER_IDS;

let canonicalJson = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('JSON numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    let object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .filter(key => object[key] !== undefined)
      .map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(',')}}`;
  }
  throw new Error('Value is not JSON serializable');
};

let readJsonBodyText = (request: WebhookWireRequest) => {
  let parsed = parseWebhookWireRequest(request);
  let body = decodeWebhookWireBody(parsed.body);
  if (body === null) throw new WebhookItemAdapterError('item_adapter_invalid');

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
};

let readJsonBody = (request: WebhookWireRequest) => {
  try {
    return JSON.parse(readJsonBodyText(request)) as unknown;
  } catch {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
};

let jsonPointerValue = (root: unknown, pointer: string): unknown => {
  if (!pointer.startsWith('/')) return undefined;
  return pointer
    .slice(1)
    .split('/')
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>((current, segment) => {
      if (typeof current !== 'object' || current === null) return undefined;
      return (current as Record<string, unknown>)[segment];
    }, root);
};

let matcherMatches = (
  matcher: SlateWebhookRuleRequestMatcher,
  request: WebhookWireRequest
) => {
  if (matcher.method && matcher.method !== request.method) return false;
  let url = new URL(request.url);
  if (matcher.hasQueryParam && !url.searchParams.has(matcher.hasQueryParam)) return false;
  if (matcher.lacksQueryParam && url.searchParams.has(matcher.lacksQueryParam)) return false;
  if (matcher.hasHeader && getWebhookHeaderValues(request, matcher.hasHeader).length === 0) {
    return false;
  }

  if (matcher.jsonBodyField) {
    let root: unknown;
    try {
      root = readJsonBody(request);
    } catch {
      return false;
    }
    let current = matcher.jsonBodyField.path.startsWith('/')
      ? jsonPointerValue(root, matcher.jsonBodyField.path)
      : matcher.jsonBodyField.path
          .split('.')
          .filter(Boolean)
          .reduce<unknown>((value, segment) => {
            if (typeof value !== 'object' || value === null) return undefined;
            return (value as Record<string, unknown>)[segment];
          }, root);
    if (current === undefined) return false;
    if (
      matcher.jsonBodyField.equals !== undefined &&
      String(current) !== matcher.jsonBodyField.equals
    ) {
      return false;
    }
  }

  if (matcher.formBodyField) {
    let body = decodeWebhookWireBody(request.body);
    if (body === null) return false;
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(body));
    } catch {
      return false;
    }
    if (!params.has(matcher.formBodyField.path)) return false;
    if (
      matcher.formBodyField.equals !== undefined &&
      params.get(matcher.formBodyField.path) !== matcher.formBodyField.equals
    ) {
      return false;
    }
  }

  return true;
};

export let selectWebhookVerificationRule = <
  Rule extends SlateWebhookVerificationRule | SlateWebhookProviderRule
>(d: {
  rules: readonly Rule[];
  request: WebhookWireRequest;
  registrationStatus:
    | 'pending'
    | 'registering'
    | 'registered'
    | 'renewing'
    | 'failed'
    | 'unregistering'
    | 'unregistered';
}):
  | { status: 'selected'; rule: Rule }
  | { status: 'rejected'; code: SafeWebhookRejectionCode } => {
  let request = parseWebhookWireRequest(d.request);
  let matches = d.rules.filter(rule => {
    if (!rule.when.methods.includes(request.method)) return false;
    if (
      rule.when.registrationStatuses &&
      !rule.when.registrationStatuses.includes(d.registrationStatus)
    ) {
      return false;
    }
    return !rule.when.matcher || matcherMatches(rule.when.matcher, request);
  });

  if (matches.length === 0) return { status: 'rejected', code: 'no_matching_rule' };
  if (matches.length !== 1) return { status: 'rejected', code: 'ambiguous_rule' };
  return { status: 'selected', rule: matches[0]! };
};

export type GraphWebhookItemCandidate = Readonly<{
  candidateId: string;
  index: number;
  bindingHash: string;
  deliveryIds: readonly string[];
}>;

export class WebhookItemAdapterError extends Error {
  constructor(readonly code: SafeWebhookRejectionCode) {
    super(code);
    this.name = 'WebhookItemAdapterError';
  }
}

let getGraphCandidateBinding = (value: Record<string, unknown>, rawItem: string) => ({
  subscriptionId: value.subscriptionId ?? null,
  clientState: value.clientState ?? null,
  resource: value.resource ?? null,
  itemDigest: sha256(new TextEncoder().encode(rawItem))
});

let getGraphCandidateDeliveryIds = (value: Record<string, unknown>, rawItem: string) => {
  let explicitIds = [value.id, value.changeId, value.sequenceNumber].filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );
  if (explicitIds.length > 0) return explicitIds;
  return [`sha256:${sha256(new TextEncoder().encode(rawItem))}`];
};

let skipJsonWhitespace = (source: string, start: number) => {
  let index = start;
  while (index < source.length && /[\t\n\r ]/.test(source[index]!)) index += 1;
  return index;
};

let scanJsonStringEnd = (source: string, start: number) => {
  if (source[start] !== '"') throw new WebhookItemAdapterError('item_adapter_invalid');
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    let character = source[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '"') return index + 1;
  }
  throw new WebhookItemAdapterError('item_adapter_invalid');
};

let scanJsonValueEnd = (source: string, start: number, depth = 0): number => {
  if (depth > SLATE_WEBHOOK_MAX_JSON_DEPTH) {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }

  let index = skipJsonWhitespace(source, start);
  let initial = source[index];
  if (initial === '"') return scanJsonStringEnd(source, index);

  if (initial === '[') {
    index = skipJsonWhitespace(source, index + 1);
    if (source[index] === ']') return index + 1;
    while (index < source.length) {
      index = skipJsonWhitespace(source, scanJsonValueEnd(source, index, depth + 1));
      if (source[index] === ']') return index + 1;
      if (source[index] !== ',') throw new WebhookItemAdapterError('item_adapter_invalid');
      index = skipJsonWhitespace(source, index + 1);
    }
  }

  if (initial === '{') {
    index = skipJsonWhitespace(source, index + 1);
    if (source[index] === '}') return index + 1;
    while (index < source.length) {
      let keyEnd = scanJsonStringEnd(source, index);
      index = skipJsonWhitespace(source, keyEnd);
      if (source[index] !== ':') throw new WebhookItemAdapterError('item_adapter_invalid');
      index = skipJsonWhitespace(source, scanJsonValueEnd(source, index + 1, depth + 1));
      if (source[index] === '}') return index + 1;
      if (source[index] !== ',') throw new WebhookItemAdapterError('item_adapter_invalid');
      index = skipJsonWhitespace(source, index + 1);
    }
  }

  while (index < source.length && !/[\t\n\r ,\]}]/.test(source[index]!)) index += 1;
  if (index === skipJsonWhitespace(source, start)) {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
  return index;
};

let scanJsonArrayItems = (source: string, arrayStart: number) => {
  let index = skipJsonWhitespace(source, arrayStart + 1);
  let items: { start: number; end: number; raw: string }[] = [];
  if (source[index] === ']') {
    return { items, contentStart: arrayStart + 1, contentEnd: index };
  }

  while (index < source.length) {
    let itemStart = index;
    let itemEnd = scanJsonValueEnd(source, itemStart);
    items.push({ start: itemStart, end: itemEnd, raw: source.slice(itemStart, itemEnd) });
    index = skipJsonWhitespace(source, itemEnd);
    if (source[index] === ']') {
      return { items, contentStart: arrayStart + 1, contentEnd: index };
    }
    if (source[index] !== ',') throw new WebhookItemAdapterError('item_adapter_invalid');
    index = skipJsonWhitespace(source, index + 1);
  }
  throw new WebhookItemAdapterError('item_adapter_invalid');
};

let locateGraphValueArray = (source: string) => {
  let index = skipJsonWhitespace(source, 0);
  if (source[index] !== '{') throw new WebhookItemAdapterError('item_adapter_invalid');
  index = skipJsonWhitespace(source, index + 1);
  let located: ReturnType<typeof scanJsonArrayItems> | null = null;

  while (index < source.length && source[index] !== '}') {
    let keyEnd = scanJsonStringEnd(source, index);
    let key: unknown;
    try {
      key = JSON.parse(source.slice(index, keyEnd));
    } catch {
      throw new WebhookItemAdapterError('item_adapter_invalid');
    }
    index = skipJsonWhitespace(source, keyEnd);
    if (source[index] !== ':') throw new WebhookItemAdapterError('item_adapter_invalid');
    let valueStart = skipJsonWhitespace(source, index + 1);
    let valueEnd = scanJsonValueEnd(source, valueStart);
    if (key === 'value') {
      if (located || source[valueStart] !== '[') {
        throw new WebhookItemAdapterError('item_adapter_invalid');
      }
      located = scanJsonArrayItems(source, valueStart);
    }
    index = skipJsonWhitespace(source, valueEnd);
    if (source[index] === '}') break;
    if (source[index] !== ',') throw new WebhookItemAdapterError('item_adapter_invalid');
    index = skipJsonWhitespace(source, index + 1);
  }

  if (!located) throw new WebhookItemAdapterError('item_adapter_invalid');
  return located;
};

let parseGraphBody = (request: WebhookWireRequest) => {
  let source = readJsonBodyText(request);
  let root: unknown;
  try {
    root = JSON.parse(source) as unknown;
  } catch {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
  let values = (root as Record<string, unknown>).value;
  if (!Array.isArray(values) || values.length > SLATE_WEBHOOK_MAX_GRAPH_CANDIDATES) {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
  if (
    values.some(value => typeof value !== 'object' || value === null || Array.isArray(value))
  ) {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
  let array = locateGraphValueArray(source);
  if (array.items.length !== values.length) {
    throw new WebhookItemAdapterError('item_adapter_invalid');
  }
  return {
    source,
    values: values as Record<string, unknown>[],
    array
  };
};

export let extractGraphBodyValueCandidates = (
  request: WebhookWireRequest
): readonly GraphWebhookItemCandidate[] => {
  let { values, array } = parseGraphBody(request);
  return Object.freeze(
    values.map((value, index) => {
      let rawItem = array.items[index]!.raw;
      let bindingHash = sha256(
        new TextEncoder().encode(
          canonicalJson({
            adapterId: 'graph.body_value.v1',
            index,
            binding: getGraphCandidateBinding(value, rawItem)
          })
        )
      );
      return Object.freeze({
        candidateId: `graph.body_value.v1:${index}:${bindingHash.slice(0, 16)}`,
        index,
        bindingHash,
        deliveryIds: Object.freeze([...getGraphCandidateDeliveryIds(value, rawItem)])
      });
    })
  );
};

export let validateGraphBodyValueSelection = (
  candidates: readonly GraphWebhookItemCandidate[],
  acceptedCandidateIds: readonly string[]
):
  | { status: 'accepted'; candidates: readonly GraphWebhookItemCandidate[] }
  | { status: 'rejected'; code: SafeWebhookRejectionCode } => {
  let known = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));
  let seen = new Set<string>();
  let selected: GraphWebhookItemCandidate[] = [];

  for (let candidateId of acceptedCandidateIds) {
    if (seen.has(candidateId)) {
      return { status: 'rejected', code: 'item_candidate_duplicate' };
    }
    seen.add(candidateId);
    let candidate = known.get(candidateId);
    if (!candidate) return { status: 'rejected', code: 'item_candidate_unknown' };
    selected.push(candidate);
  }

  selected.sort((first, second) => first.index - second.index);
  return { status: 'accepted', candidates: Object.freeze(selected) };
};

export let reconstructGraphBodyValueRequest = (
  originalRequest: WebhookWireRequest,
  acceptedCandidateIds: readonly string[]
): WebhookWireRequest => {
  let request = parseWebhookWireRequest(originalRequest);
  let { source, array } = parseGraphBody(request);
  let candidates = extractGraphBodyValueCandidates(request);
  let selection = validateGraphBodyValueSelection(candidates, acceptedCandidateIds);
  if (selection.status === 'rejected') throw new WebhookItemAdapterError(selection.code);

  if (selection.candidates.length === candidates.length) return request;

  let acceptedItems = selection.candidates.map(candidate => array.items[candidate.index]!.raw);
  let replaceStart = array.items[0]?.start ?? array.contentStart;
  let replaceEnd = array.items.at(-1)?.end ?? array.contentEnd;
  let reconstructed =
    source.slice(0, replaceStart) + acceptedItems.join(',') + source.slice(replaceEnd);

  return parseWebhookWireRequest({
    ...request,
    body: encodeWebhookWireBody(new TextEncoder().encode(reconstructed))
  });
};

export type WebhookMappedCandidateResult<Output = unknown> = {
  candidateId: string;
  output: Output;
};

export let validateExhaustiveWebhookMappedResults = <Output>(
  acceptedCandidateIds: readonly string[],
  results: readonly WebhookMappedCandidateResult<Output>[]
):
  | { status: 'accepted'; results: readonly WebhookMappedCandidateResult<Output>[] }
  | { status: 'rejected'; code: SafeWebhookRejectionCode } => {
  let accepted = new Set(acceptedCandidateIds);
  let seen = new Set<string>();

  for (let result of results) {
    if (seen.has(result.candidateId)) {
      return { status: 'rejected', code: 'mapped_output_extra' };
    }
    seen.add(result.candidateId);
    if (!accepted.has(result.candidateId)) {
      return { status: 'rejected', code: 'mapped_output_extra' };
    }
  }

  if (results.length !== accepted.size || [...accepted].some(id => !seen.has(id))) {
    return { status: 'rejected', code: 'mapped_output_incomplete' };
  }

  return { status: 'accepted', results: Object.freeze([...results]) };
};

export let slateWebhookPresetRegistry = SLATE_WEBHOOK_PRESET_DEFINITIONS;

export let getSlateWebhookPreset = (presetId: string) =>
  Object.prototype.hasOwnProperty.call(slateWebhookPresetRegistry, presetId)
    ? slateWebhookPresetRegistry[presetId as SlateWebhookPresetId]
    : null;

export type SlateWebhookProviderVerifierDefinition = {
  id: string;
};

export let createSlateWebhookProviderVerifierRegistry = (
  definitions: readonly SlateWebhookProviderVerifierDefinition[]
) => {
  let registry = new Map<string, SlateWebhookProviderVerifierDefinition>();
  definitions.forEach(definition => {
    if (!(SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS as readonly string[]).includes(definition.id)) {
      throw new Error(`Unknown provider verifier ID: ${definition.id}`);
    }
    if (registry.has(definition.id)) {
      throw new Error(`Duplicate provider verifier ID: ${definition.id}`);
    }
    registry.set(definition.id, Object.freeze({ ...definition }));
  });

  return Object.freeze({
    get(id: string) {
      return registry.get(id) ?? null;
    },
    require(id: string) {
      let definition = registry.get(id);
      if (!definition) throw new Error(`Unknown provider verifier ID: ${id}`);
      return definition;
    },
    ids: Object.freeze([...registry.keys()])
  });
};

export let slateWebhookItemAdapterRegistry = Object.freeze({
  'graph.body_value.v1': Object.freeze({
    id: 'graph.body_value.v1' as const,
    extractCandidates: extractGraphBodyValueCandidates,
    reconstruct: reconstructGraphBodyValueRequest
  })
});

export let getSlateWebhookItemAdapter = (adapterId: string) =>
  Object.prototype.hasOwnProperty.call(slateWebhookItemAdapterRegistry, adapterId)
    ? slateWebhookItemAdapterRegistry[adapterId as SlateWebhookItemAdapterId]
    : null;

export let getSlateWebhookItemAdapterIdForRule = (
  rule: SlateWebhookVerificationRule | SlateWebhookProviderRule
): SlateWebhookItemAdapterId | null => {
  if (rule.result.type !== 'dispatch' || rule.result.scope !== 'verified_items') return null;

  let definition =
    rule.verify.type === 'preset'
      ? SLATE_WEBHOOK_PRESET_DEFINITIONS[rule.verify.preset]
      : rule.verify.type === 'provider'
        ? SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS[rule.verify.verifierId]
        : undefined;
  return definition && 'itemAdapterId' in definition ? definition.itemAdapterId : null;
};
