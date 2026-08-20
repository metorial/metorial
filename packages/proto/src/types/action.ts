import { createHash } from 'node:crypto';
import z from 'zod';

let deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach(nested => deepFreeze(nested));
  return Object.freeze(value);
};

export let SLATE_WEBHOOK_HTTP_METHODS = deepFreeze([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS'
] as const);

export let SLATE_WEBHOOK_REGISTRATION_STATUSES = deepFreeze([
  'pending',
  'registering',
  'registered',
  'renewing',
  'failed',
  'unregistering',
  'unregistered'
] as const);

export let SLATE_WEBHOOK_PRESET_IDS = deepFreeze([
  'slack.v0',
  'stripe.v1',
  'zoom.v0',
  'hubspot.v3',
  'gitlab.standard.v1',
  'zendesk.v1',
  'typeform.v1',
  'linear.v1',
  'graph.change_notification.v1',
  'jira.oauth_dynamic_webhook.v1',
  'discord.interactions.v1'
] as const);

export let SLATE_WEBHOOK_ITEM_ADAPTER_IDS = deepFreeze(['graph.body_value.v1'] as const);

export let SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS = deepFreeze([
  'quickbooks.delivery.v1',
  'kofi.delivery.v1',
  'braintree.delivery.v1',
  'paypal.delivery.v1',
  'notion.delivery.v1',
  'asana.delivery.v1',
  'cursor.delivery.v1',
  'google_calendar.delivery.v1',
  'graph.change_notification.provider.v1',
  'meta.delivery.v1',
  'zoom.delivery.v1'
] as const);

export let SLATE_WEBHOOK_SECRET_ENCODINGS = deepFreeze([
  'utf8',
  'hex',
  'base64',
  'base64url'
] as const);

export let SLATE_WEBHOOK_ACTION_CAPABILITIES = deepFreeze([
  'webhookSecretNegotiationV1',
  'webhookInboundVerificationV1',
  'webhookInboundBootstrapCaptureV1'
] as const);

export let SLATE_WEBHOOK_PRESET_FIELD_IDS = deepFreeze([
  'timestamp',
  'delivery_id',
  'event_id',
  'subscription_id',
  'client_state',
  'resource',
  'webhook_id',
  'interaction_id',
  'issued_at'
] as const);

export let SLATE_WEBHOOK_PRESET_DEFINITIONS = deepFreeze({
  'slack.v0': {
    securityHeaders: ['x-slack-signature', 'x-slack-request-timestamp'],
    presetFields: ['timestamp']
  },
  'stripe.v1': {
    securityHeaders: ['stripe-signature'],
    presetFields: ['timestamp', 'event_id']
  },
  'zoom.v0': {
    securityHeaders: ['x-zm-signature', 'x-zm-request-timestamp'],
    presetFields: ['timestamp', 'event_id']
  },
  'hubspot.v3': {
    securityHeaders: ['x-hubspot-signature-v3', 'x-hubspot-request-timestamp'],
    presetFields: ['timestamp', 'event_id']
  },
  'gitlab.standard.v1': {
    securityHeaders: ['x-gitlab-token'],
    presetFields: ['event_id']
  },
  'zendesk.v1': {
    securityHeaders: ['x-zendesk-webhook-signature', 'x-zendesk-webhook-signature-timestamp'],
    presetFields: ['timestamp', 'event_id']
  },
  'typeform.v1': {
    securityHeaders: ['typeform-signature'],
    presetFields: ['event_id']
  },
  'linear.v1': {
    securityHeaders: ['linear-signature'],
    presetFields: ['timestamp', 'event_id']
  },
  'graph.change_notification.v1': {
    securityHeaders: [],
    presetFields: ['delivery_id', 'subscription_id', 'client_state', 'resource'],
    itemAdapterId: 'graph.body_value.v1'
  },
  'jira.oauth_dynamic_webhook.v1': {
    securityHeaders: ['authorization'],
    presetFields: ['issued_at', 'webhook_id']
  },
  'discord.interactions.v1': {
    securityHeaders: ['x-signature-ed25519', 'x-signature-timestamp'],
    presetFields: ['timestamp', 'interaction_id']
  }
} as const);

export let SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS = deepFreeze({
  'quickbooks.delivery.v1': { presetFields: ['event_id'] },
  'kofi.delivery.v1': { presetFields: ['event_id'] },
  'braintree.delivery.v1': { presetFields: ['delivery_id'] },
  'paypal.delivery.v1': { presetFields: ['timestamp', 'event_id', 'delivery_id'] },
  'notion.delivery.v1': { presetFields: ['event_id'] },
  'asana.delivery.v1': { presetFields: ['event_id'] },
  'cursor.delivery.v1': { presetFields: ['event_id'] },
  'google_calendar.delivery.v1': { presetFields: ['event_id'] },
  'meta.delivery.v1': { presetFields: ['event_id'] },
  'zoom.delivery.v1': { presetFields: ['timestamp', 'event_id'] },
  'graph.change_notification.provider.v1': {
    presetFields: ['delivery_id', 'subscription_id', 'client_state', 'resource'],
    itemAdapterId: 'graph.body_value.v1'
  }
} as const);

export let SAFE_WEBHOOK_REJECTION_CODES = deepFreeze([
  'baseline_path_missing',
  'baseline_path_invalid',
  'wire_input_malformed',
  'wire_input_oversized',
  'security_header_ambiguous',
  'no_matching_rule',
  'ambiguous_rule',
  'conflicting_rule_outcomes',
  'conflicting_sync_responses',
  'credential_missing',
  'credential_invalid',
  'credential_stale',
  'credential_future',
  'provider_timeout',
  'provider_error',
  'provider_invalid_result',
  'item_adapter_unknown',
  'item_adapter_invalid',
  'item_candidate_unknown',
  'item_candidate_duplicate',
  'item_candidate_contradictory',
  'replay_duplicate',
  'replay_conflict',
  'mapped_output_invalid',
  'mapped_output_incomplete',
  'mapped_output_extra',
  'state_cas_conflict',
  'routing_projection_unavailable',
  'routing_projection_stale'
] as const);

export let SAFE_WEBHOOK_REJECTION_CODE_VERSION = 1 as const;

let utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

let boundedUtf8String = (maxBytes: number) =>
  z.string().refine(value => utf8ByteLength(value) <= maxBytes, {
    message: `Must be at most ${maxBytes} UTF-8 bytes`
  });

let identifier = boundedUtf8String(128)
  .min(1)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9._:/-]*[A-Za-z0-9])?$/);

let secretKey = boundedUtf8String(128)
  .min(1)
  .regex(
    /^[A-Za-z0-9](?:[A-Za-z0-9._:-]*[A-Za-z0-9])?$/,
    'Secret keys must be flat allowlisted identifiers'
  );

let httpToken = boundedUtf8String(512)
  .min(1)
  .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, 'Must be a valid HTTP token');

let validJsonPointer = (value: string) => {
  if (!value.startsWith('/')) return false;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '~') continue;
    if (value[index + 1] !== '0' && value[index + 1] !== '1') return false;
    index += 1;
  }

  return true;
};

let jsonPointer = boundedUtf8String(512)
  .min(1)
  .refine(validJsonPointer, 'Must be a non-empty RFC 6901 JSON pointer');

let durationSeconds = (minimum: number, maximum: number) =>
  z.number().int().safe().min(minimum).max(maximum);

let canonicalBase64 = (value: string) => {
  if (value === '') return true;
  if (value.length % 4 !== 0) return false;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    return false;
  }

  try {
    return Buffer.from(value, 'base64').toString('base64') === value;
  } catch {
    return false;
  }
};

export let slatesWebhookHttpMethod = z.enum(SLATE_WEBHOOK_HTTP_METHODS);
export let slatesWebhookRegistrationStatus = z.enum(SLATE_WEBHOOK_REGISTRATION_STATUSES);
export let safeWebhookRejectionCode = z.enum(SAFE_WEBHOOK_REJECTION_CODES);

export let slatesWebhookSecretRef = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('registration'),
    name: identifier,
    registrationKey: secretKey,
    encoding: z.enum(SLATE_WEBHOOK_SECRET_ENCODINGS)
  }),
  z.strictObject({
    source: z.literal('generated'),
    name: identifier,
    binding: z.enum(['receiver', 'receiver_trigger']),
    encoding: z.enum(SLATE_WEBHOOK_SECRET_ENCODINGS)
  }),
  z.strictObject({
    source: z.literal('config'),
    name: identifier,
    configKey: secretKey,
    encoding: z.enum(SLATE_WEBHOOK_SECRET_ENCODINGS)
  }),
  z.strictObject({
    source: z.literal('platform'),
    name: identifier,
    credentialKey: secretKey,
    encoding: z.enum(SLATE_WEBHOOK_SECRET_ENCODINGS)
  })
]);

export let slatesActionScopeClause = z.object({
  OR: z.array(z.string()).min(1)
});

export let slatesActionScopes = z.object({
  AND: z.array(slatesActionScopeClause).min(1)
});

export let slatesActionBase = z.object({
  id: z.string(),

  name: z.string(),
  description: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  tags: z
    .object({
      destructive: z.boolean().optional(),
      readOnly: z.boolean().optional()
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  scopes: slatesActionScopes.optional(),
  authMethods: z.array(z.string()).optional(),

  inputSchema: z.record(z.string(), z.any()),
  outputSchema: z.record(z.string(), z.any()),

  docs: z.array(
    z.object({
      type: z.literal('docs.action.general').optional(),
      name: z.string(),
      url: z.string()
    })
  )
});

export let slatesActionTool = slatesActionBase.extend({
  type: z.literal('action.tool'),
  capabilities: z.strictObject({
    receiverBoundToolContextV1: z
      .strictObject({
        secretNames: z
          .array(identifier)
          .min(1)
          .max(16)
          .refine(names => new Set(names).size === names.length, {
            message: 'Receiver-bound tool secret names must be unique'
          })
      })
      .optional()
  })
});

export let slatesWebhookRequestMatcher = z
  .strictObject({
    method: slatesWebhookHttpMethod.optional(),
    hasQueryParam: boundedUtf8String(512).min(1).optional(),
    lacksQueryParam: boundedUtf8String(512).min(1).optional(),
    hasHeader: httpToken.optional(),
    jsonBodyField: z
      .strictObject({
        path: boundedUtf8String(512).min(1),
        equals: boundedUtf8String(512).optional()
      })
      .optional(),
    formBodyField: z
      .strictObject({
        path: boundedUtf8String(512).min(1),
        equals: boundedUtf8String(512).optional()
      })
      .optional()
  })
  .refine(matcher => Object.values(matcher).some(value => value !== undefined), {
    message: 'A request matcher must contain at least one condition'
  });

export let slatesWebhookSelector = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('preset'),
    presetField: z.enum(SLATE_WEBHOOK_PRESET_FIELD_IDS)
  }),
  z.strictObject({
    source: z.literal('header'),
    headerName: httpToken
  }),
  z.strictObject({
    source: z.literal('json_pointer'),
    pointer: jsonPointer
  })
]);

export let slatesWebhookStaticTokenSelector = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('header'),
    headerName: httpToken
  }),
  z.strictObject({
    source: z.literal('query'),
    queryParam: boundedUtf8String(512).min(1)
  }),
  z.strictObject({
    source: z.literal('json_pointer'),
    pointer: jsonPointer
  })
]);

let webhookFreshnessFields = {
  format: z.enum(['unix_seconds', 'unix_milliseconds', 'rfc3339']),
  maxAgeSeconds: durationSeconds(1, 31_536_000),
  maxFutureSkewSeconds: durationSeconds(0, 86_400)
};

export let slatesWebhookFreshness = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('preset'),
    presetField: z.enum(SLATE_WEBHOOK_PRESET_FIELD_IDS),
    ...webhookFreshnessFields
  }),
  z.strictObject({
    source: z.literal('header'),
    headerName: httpToken,
    ...webhookFreshnessFields
  }),
  z.strictObject({
    source: z.literal('json_pointer'),
    pointer: jsonPointer,
    ...webhookFreshnessFields
  })
]);

let webhookDeduplicateFields = {
  ttlSeconds: durationSeconds(1, 31_536_000),
  scope: z.enum(['request', 'verified_item'])
};

export let slatesWebhookDeduplicate = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('preset'),
    presetField: z.enum(SLATE_WEBHOOK_PRESET_FIELD_IDS),
    ...webhookDeduplicateFields
  }),
  z.strictObject({
    source: z.literal('header'),
    headerName: httpToken,
    ...webhookDeduplicateFields
  }),
  z.strictObject({
    source: z.literal('json_pointer'),
    pointer: jsonPointer,
    ...webhookDeduplicateFields
  })
]);

export let slatesWebhookReplayPolicy = z.union([
  z.strictObject({
    kind: z.literal('enforced'),
    freshness: slatesWebhookFreshness,
    deduplicate: slatesWebhookDeduplicate.optional()
  }),
  z.strictObject({
    kind: z.literal('enforced'),
    freshness: slatesWebhookFreshness.optional(),
    deduplicate: slatesWebhookDeduplicate
  }),
  z.strictObject({
    kind: z.literal('not_applicable'),
    reason: z.literal('bootstrap_sync_only')
  })
]);

export let slatesWebhookMessagePart = z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('body') }),
  z.strictObject({ source: z.literal('method') }),
  z.strictObject({ source: z.literal('url') }),
  z.strictObject({ source: z.literal('header'), headerName: httpToken }),
  z.strictObject({
    source: z.literal('query'),
    queryParam: boundedUtf8String(512).min(1)
  }),
  z.strictObject({ source: z.literal('literal'), value: boundedUtf8String(512) })
]);

export let slatesWebhookSignatureSource = z.strictObject({
  headerName: httpToken,
  encoding: z.enum(['hex', 'base64', 'base64url']),
  prefix: boundedUtf8String(64)
    .regex(/^[A-Za-z0-9._-]*$/, 'Signature prefixes may contain only safe ASCII characters')
    .optional(),
  duplicateHeaderPolicy: z.enum(['reject', 'allow_identical', 'preserve']),
  multipleSignaturePolicy: z.enum(['reject', 'any_valid', 'all_valid'])
});

export let slatesWebhookVerifier = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('path_secret')
  }),
  z.strictObject({
    type: z.literal('static_token'),
    secretName: identifier,
    selector: slatesWebhookStaticTokenSelector
  }),
  z.strictObject({
    type: z.literal('raw_hmac'),
    secretName: identifier,
    algorithm: z.enum(['sha256', 'sha512']),
    signature: slatesWebhookSignatureSource,
    message: z.array(slatesWebhookMessagePart).min(1).max(16)
  }),
  z.strictObject({
    type: z.literal('ed25519'),
    publicKeyName: identifier,
    publicKeyEncoding: z.enum(['hex', 'base64', 'base64url']),
    signature: slatesWebhookSignatureSource,
    message: z.array(slatesWebhookMessagePart).min(1).max(16)
  }),
  z.strictObject({
    type: z.literal('preset'),
    preset: z.enum(SLATE_WEBHOOK_PRESET_IDS)
  })
]);

export let slatesWebhookRuleResult = z.union([
  z.strictObject({ type: z.literal('sync_only') }),
  z.strictObject({
    type: z.literal('dispatch'),
    scope: z.literal('receiver_trigger')
  }),
  z.strictObject({
    type: z.literal('dispatch'),
    scope: z.literal('verified_items')
  })
]);

let slatesWebhookRuleBase = z.strictObject({
  id: identifier,
  phase: z.enum(['bootstrap', 'delivery', 'lifecycle']),
  maxBodyBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024)
    .optional(),
  when: z.strictObject({
    methods: z.array(slatesWebhookHttpMethod).min(1).max(SLATE_WEBHOOK_HTTP_METHODS.length),
    registrationStatuses: z.array(slatesWebhookRegistrationStatus).min(1).optional(),
    matcher: slatesWebhookRequestMatcher.optional()
  }),
  result: slatesWebhookRuleResult,
  replay: slatesWebhookReplayPolicy.optional()
});

let validateRule = (
  rule: {
    phase: 'bootstrap' | 'delivery' | 'lifecycle';
    when: {
      methods: string[];
      registrationStatuses?: string[];
      matcher?: z.infer<typeof slatesWebhookRequestMatcher>;
    };
    verify: { type: string; preset?: string; verifierId?: string };
    result:
      | { type: 'sync_only' }
      | {
          type: 'dispatch';
          scope: 'receiver_trigger' | 'verified_items';
        };
    replay?: {
      kind: 'enforced' | 'not_applicable';
      reason?: string;
      freshness?: { source: string; presetField?: string };
      deduplicate?: { source: string; presetField?: string };
    };
  },
  context: z.RefinementCtx
) => {
  if (new Set(rule.when.methods).size !== rule.when.methods.length) {
    context.addIssue({
      code: 'custom',
      path: ['when', 'methods'],
      message: 'Webhook rule methods must not contain duplicates'
    });
  }

  if (rule.result.type === 'sync_only' && rule.phase !== 'bootstrap') {
    context.addIssue({
      code: 'custom',
      path: ['result'],
      message: 'sync_only is valid only for bootstrap rules'
    });
  }

  if (rule.verify.type === 'path_secret') {
    if (
      rule.phase !== 'bootstrap' ||
      rule.result.type !== 'sync_only' ||
      !rule.when.matcher ||
      !rule.when.registrationStatuses ||
      rule.when.registrationStatuses.some(
        status => status !== 'pending' && status !== 'registering' && status !== 'renewing'
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['verify'],
        message:
          'path_secret requires a matched pending/registering/renewing bootstrap sync_only rule'
      });
    }
  }

  if (rule.phase === 'delivery' || rule.phase === 'lifecycle') {
    if (rule.replay?.kind !== 'enforced') {
      context.addIssue({
        code: 'custom',
        path: ['replay'],
        message: 'Delivery and lifecycle rules require an enforced replay policy'
      });
    }
  }

  if (rule.replay?.kind === 'not_applicable') {
    if (rule.phase !== 'bootstrap' || rule.result.type !== 'sync_only') {
      context.addIssue({
        code: 'custom',
        path: ['replay'],
        message: 'not_applicable replay is valid only for bootstrap sync_only rules'
      });
    }
  }

  if (rule.result.type === 'dispatch' && rule.result.scope === 'verified_items') {
    let itemAdapterId =
      rule.verify.type === 'preset' && rule.verify.preset
        ? (
            SLATE_WEBHOOK_PRESET_DEFINITIONS[
              rule.verify.preset as keyof typeof SLATE_WEBHOOK_PRESET_DEFINITIONS
            ] as { itemAdapterId?: string } | undefined
          )?.itemAdapterId
        : rule.verify.type === 'provider' && rule.verify.verifierId
          ? (
              SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS[
                rule.verify
                  .verifierId as keyof typeof SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS
              ] as { itemAdapterId?: string } | undefined
            )?.itemAdapterId
          : undefined;
    if (!itemAdapterId) {
      context.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'verified_items requires an item adapter declared by the verifier registry'
      });
    }
  }

  let verifierDefinition =
    rule.verify.type === 'preset' && rule.verify.preset
      ? SLATE_WEBHOOK_PRESET_DEFINITIONS[
          rule.verify.preset as keyof typeof SLATE_WEBHOOK_PRESET_DEFINITIONS
        ]
      : rule.verify.type === 'provider' && rule.verify.verifierId
        ? SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS[
            rule.verify.verifierId as keyof typeof SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS
          ]
        : undefined;
  let presetSelectors = [rule.replay?.freshness, rule.replay?.deduplicate].filter(
    (selector): selector is { source: 'preset'; presetField: string } =>
      selector?.source === 'preset' && typeof selector.presetField === 'string'
  );
  presetSelectors.forEach(selector => {
    if (
      !verifierDefinition ||
      !(verifierDefinition.presetFields as readonly string[]).includes(selector.presetField)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['replay'],
        message: `Preset field ${selector.presetField} is not declared by the selected verifier`
      });
    }
  });
};

export let slatesWebhookVerificationRule = slatesWebhookRuleBase
  .extend({ verify: slatesWebhookVerifier })
  .superRefine(validateRule);

export let slatesWebhookProviderVerifierId = z.enum(SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS);

export let slatesWebhookProviderRule = slatesWebhookRuleBase
  .extend({
    verify: z.strictObject({
      type: z.literal('provider'),
      verifierId: slatesWebhookProviderVerifierId,
      allowedSecretRefs: z.array(identifier).max(64),
      allowedBootstrapCaptureRefs: z.array(identifier).max(64).default([])
    })
  })
  .superRefine(validateRule);

let matcherConstraintsCanIntersect = (
  first: z.infer<typeof slatesWebhookRequestMatcher> | undefined,
  second: z.infer<typeof slatesWebhookRequestMatcher> | undefined
) => {
  if (!first || !second) return true;
  if (first.method && second.method && first.method !== second.method) return false;
  if (
    (first.hasQueryParam && first.hasQueryParam === second.lacksQueryParam) ||
    (second.hasQueryParam && second.hasQueryParam === first.lacksQueryParam)
  ) {
    return false;
  }

  for (let field of ['jsonBodyField', 'formBodyField'] as const) {
    let firstField = first[field];
    let secondField = second[field];
    if (
      firstField &&
      secondField &&
      firstField.path === secondField.path &&
      firstField.equals !== undefined &&
      secondField.equals !== undefined &&
      firstField.equals !== secondField.equals
    ) {
      return false;
    }
  }

  // Header/query/body predicates on different fields may all be true for one request. Treat
  // every combination as overlapping unless a concrete contradictory equality was found.
  return true;
};

let ruleMethods = (
  rule:
    | z.infer<typeof slatesWebhookVerificationRule>
    | z.infer<typeof slatesWebhookProviderRule>
) =>
  rule.when.matcher?.method
    ? rule.when.methods.filter(method => method === rule.when.matcher!.method)
    : rule.when.methods;

let rulesOverlap = (
  first:
    | z.infer<typeof slatesWebhookVerificationRule>
    | z.infer<typeof slatesWebhookProviderRule>,
  second:
    | z.infer<typeof slatesWebhookVerificationRule>
    | z.infer<typeof slatesWebhookProviderRule>
) => {
  let firstMethods = ruleMethods(first);
  let secondMethods = ruleMethods(second);
  if (!firstMethods.some(method => secondMethods.includes(method))) return false;

  let firstStatuses = first.when.registrationStatuses;
  let secondStatuses = second.when.registrationStatuses;
  if (
    firstStatuses &&
    secondStatuses &&
    !firstStatuses.some(status => secondStatuses.includes(status))
  ) {
    return false;
  }

  return matcherConstraintsCanIntersect(first.when.matcher, second.when.matcher);
};

let validateRules = (
  rules: Array<
    z.infer<typeof slatesWebhookVerificationRule> | z.infer<typeof slatesWebhookProviderRule>
  >,
  context: z.RefinementCtx
) => {
  let ids = new Set<string>();
  rules.forEach((rule, index) => {
    if (ids.has(rule.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: `Duplicate webhook rule ID: ${rule.id}`
      });
    }
    ids.add(rule.id);
  });

  for (let firstIndex = 0; firstIndex < rules.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < rules.length; secondIndex += 1) {
      let first = rules[firstIndex]!;
      let second = rules[secondIndex]!;
      if (first.result.type !== second.result.type && rulesOverlap(first, second)) {
        context.addIssue({
          code: 'custom',
          path: [secondIndex],
          message: 'Statically overlapping sync and dispatch rules are not allowed'
        });
      }
    }
  }
};

let validateSecretRefs = (
  secretRefs: z.infer<typeof slatesWebhookSecretRef>[],
  rules: Array<
    z.infer<typeof slatesWebhookVerificationRule> | z.infer<typeof slatesWebhookProviderRule>
  >,
  context: z.RefinementCtx
) => {
  let secretNames = new Set<string>();
  secretRefs.forEach((secretRef, index) => {
    if (secretNames.has(secretRef.name)) {
      context.addIssue({
        code: 'custom',
        path: ['allowedSecretRefs', index, 'name'],
        message: `Duplicate webhook secret name: ${secretRef.name}`
      });
    }
    secretNames.add(secretRef.name);
  });

  rules.forEach((rule, ruleIndex) => {
    if (rule.verify.type === 'provider') {
      let verifierSecretNames = new Set<string>();
      rule.verify.allowedSecretRefs.forEach((secretName, secretIndex) => {
        if (verifierSecretNames.has(secretName)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', ruleIndex, 'verify', 'allowedSecretRefs', secretIndex],
            message: `Duplicate provider verifier secret reference: ${secretName}`
          });
        }
        if (!secretNames.has(secretName)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', ruleIndex, 'verify', 'allowedSecretRefs', secretIndex],
            message: `Provider verifier secret reference is not declared: ${secretName}`
          });
        }
        verifierSecretNames.add(secretName);
      });

      let registrationSecretNames = new Set(
        secretRefs
          .filter(secretRef => secretRef.source === 'registration')
          .map(secretRef => secretRef.name)
      );
      let captureSecretNames = new Set<string>();
      rule.verify.allowedBootstrapCaptureRefs.forEach((secretName, secretIndex) => {
        if (captureSecretNames.has(secretName)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', ruleIndex, 'verify', 'allowedBootstrapCaptureRefs', secretIndex],
            message: `Duplicate bootstrap capture secret reference: ${secretName}`
          });
        }
        if (!registrationSecretNames.has(secretName)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', ruleIndex, 'verify', 'allowedBootstrapCaptureRefs', secretIndex],
            message: `Bootstrap capture secret reference is not a declared registration secret: ${secretName}`
          });
        }
        captureSecretNames.add(secretName);
      });

      if (
        rule.verify.allowedBootstrapCaptureRefs.length > 0 &&
        (rule.phase !== 'bootstrap' || rule.result.type !== 'sync_only')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['rules', ruleIndex, 'verify', 'allowedBootstrapCaptureRefs'],
          message: 'Bootstrap capture refs are valid only for bootstrap sync_only rules'
        });
      }
      return;
    }

    let requiredSecretName =
      rule.verify.type === 'static_token' || rule.verify.type === 'raw_hmac'
        ? rule.verify.secretName
        : rule.verify.type === 'ed25519'
          ? rule.verify.publicKeyName
          : undefined;
    if (requiredSecretName && !secretNames.has(requiredSecretName)) {
      context.addIssue({
        code: 'custom',
        path: ['rules', ruleIndex, 'verify'],
        message: `Hub verifier secret reference is not declared: ${requiredSecretName}`
      });
    }
  });
};

let hubRules = z
  .tuple([slatesWebhookVerificationRule], slatesWebhookVerificationRule)
  .superRefine((rules, context) => {
    if (rules.length > 64) {
      context.addIssue({ code: 'custom', message: 'At most 64 webhook rules are allowed' });
    }
    validateRules(rules, context);
  });
let providerRules = z
  .tuple([slatesWebhookProviderRule], slatesWebhookProviderRule)
  .superRefine((rules, context) => {
    if (rules.length > 64) {
      context.addIssue({ code: 'custom', message: 'At most 64 webhook rules are allowed' });
    }
    validateRules(rules, context);
  });

export let slatesWebhookVerification = z.discriminatedUnion('mechanism', [
  z
    .strictObject({
      mechanism: z.literal('hub'),
      baseline: z.literal('receiver_path_secret'),
      allowedSecretRefs: z.array(slatesWebhookSecretRef).max(64),
      rules: hubRules
    })
    .superRefine((verification, context) =>
      validateSecretRefs(verification.allowedSecretRefs, verification.rules, context)
    ),
  z
    .strictObject({
      mechanism: z.literal('provider'),
      baseline: z.literal('receiver_path_secret'),
      reason: boundedUtf8String(512).min(1),
      allowedSecretRefs: z.array(slatesWebhookSecretRef).max(64),
      rules: providerRules
    })
    .superRefine((verification, context) =>
      validateSecretRefs(verification.allowedSecretRefs, verification.rules, context)
    ),
  z.strictObject({
    mechanism: z.literal('path_secret_only'),
    baseline: z.literal('receiver_path_secret'),
    reason: boundedUtf8String(512).min(1)
  })
]);

let sharedProvisionedAppVerification = z
  .strictObject({
    mechanism: z.literal('hub'),
    allowedSecretRefs: z.array(slatesWebhookSecretRef).max(64),
    rules: hubRules
  })
  .superRefine((verification, context) => {
    validateSecretRefs(verification.allowedSecretRefs, verification.rules, context);
    verification.rules.forEach((rule, index) => {
      if (rule.verify.type !== 'preset') {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'verify'],
          message: 'Shared provisioned-app routes require an exact Hub preset'
        });
      }
    });
  });

export let slatesWebhookIngress = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('receiver_route'),
    baseline: z.literal('receiver_path_secret'),
    verification: slatesWebhookVerification
  }),
  z.strictObject({
    kind: z.literal('shared_provisioned_app'),
    baseline: z.literal('app_route_secret'),
    routeFamily: identifier,
    verification: sharedProvisionedAppVerification
  })
]);

export let webhookWireBody = z.discriminatedUnion('present', [
  z.strictObject({ present: z.literal(false) }),
  z.strictObject({
    present: z.literal(true),
    base64: z.string().refine(canonicalBase64, 'Must be canonical base64')
  })
]);

let webhookWireHeaders = z.array(z.tuple([httpToken, z.string()]));

export let webhookWireRequest = z.strictObject({
  url: z.string(),
  method: slatesWebhookHttpMethod,
  headers: webhookWireHeaders,
  body: webhookWireBody
});

export let webhookWireResponse = z.strictObject({
  status: z.number().int().min(100).max(599),
  headers: webhookWireHeaders,
  body: webhookWireBody
});

export let SLATE_WEBHOOK_CANONICAL_WIRE_VERSION = 1 as const;

let cloneWebhookWireBody = (body: WebhookWireBody): WebhookWireBody =>
  body.present ? { present: true, base64: body.base64 } : { present: false };

export let parseWebhookWireRequest = (value: unknown): WebhookWireRequest => {
  let request = webhookWireRequest.parse(value);
  return {
    ...request,
    headers: request.headers.map(([name, headerValue]) => [name, headerValue]),
    body: cloneWebhookWireBody(request.body)
  };
};

export let parseWebhookWireResponse = (value: unknown): WebhookWireResponse => {
  let response = webhookWireResponse.parse(value);
  return {
    ...response,
    headers: response.headers.map(([name, headerValue]) => [name, headerValue]),
    body: cloneWebhookWireBody(response.body)
  };
};

export let decodeWebhookWireBody = (body: WebhookWireBody): Uint8Array | null =>
  body.present ? new Uint8Array(Buffer.from(body.base64, 'base64')) : null;

export let encodeWebhookWireBody = (body: Uint8Array | null): WebhookWireBody =>
  body === null
    ? { present: false }
    : { present: true, base64: Buffer.from(body).toString('base64') };

export let getWebhookHeaderValues = (
  wire: Pick<WebhookWireRequest | WebhookWireResponse, 'headers'>,
  headerName: string
) => {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(headerName)) {
    throw new Error('Invalid HTTP header name');
  }
  let normalized = headerName.toLowerCase();
  return wire.headers
    .filter(([name]) => name.toLowerCase() === normalized)
    .map(([, value]) => value);
};

class WebhookBinaryWriter {
  private chunks: Uint8Array[] = [];

  byte(value: number) {
    this.chunks.push(Uint8Array.of(value));
  }

  uint16(value: number) {
    let bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, false);
    this.chunks.push(bytes);
  }

  uint32(value: number) {
    let bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, false);
    this.chunks.push(bytes);
  }

  bytes(value: Uint8Array) {
    this.uint32(value.byteLength);
    this.chunks.push(value);
  }

  string(value: string) {
    this.bytes(new TextEncoder().encode(value));
  }

  finish() {
    let byteLength = this.chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    let result = new Uint8Array(byteLength);
    let offset = 0;
    this.chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return result;
  }
}

let writeWebhookHeaders = (writer: WebhookBinaryWriter, headers: [string, string][]) => {
  writer.uint32(headers.length);
  headers.forEach(([name, value]) => {
    writer.string(name);
    writer.string(value);
  });
};

let writeWebhookBody = (writer: WebhookBinaryWriter, body: WebhookWireBody) => {
  writer.byte(body.present ? 1 : 0);
  if (body.present) writer.bytes(new Uint8Array(Buffer.from(body.base64, 'base64')));
};

export let encodeCanonicalWebhookWireRequestV1 = (value: WebhookWireRequest) => {
  let request = parseWebhookWireRequest(value);
  let writer = new WebhookBinaryWriter();
  writer.string('metorial.webhook-wire\0request\0v1\0');
  writer.string(request.url);
  writer.string(request.method);
  writeWebhookHeaders(writer, request.headers);
  writeWebhookBody(writer, request.body);
  return writer.finish();
};

export let encodeCanonicalWebhookWireResponseV1 = (value: WebhookWireResponse) => {
  let response = parseWebhookWireResponse(value);
  let writer = new WebhookBinaryWriter();
  writer.string('metorial.webhook-wire\0response\0v1\0');
  writer.uint16(response.status);
  writeWebhookHeaders(writer, response.headers);
  writeWebhookBody(writer, response.body);
  return writer.finish();
};

let hashWebhookBytes = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export let hashWebhookWireRequestV1 = (request: WebhookWireRequest) =>
  hashWebhookBytes(encodeCanonicalWebhookWireRequestV1(request));

export let hashWebhookWireResponseV1 = (response: WebhookWireResponse) =>
  hashWebhookBytes(encodeCanonicalWebhookWireResponseV1(response));

export let computeOriginalWebhookRequestHash = (request: WebhookWireRequest) =>
  hashWebhookWireRequestV1(request);

export let computeDispatchWebhookRequestHash = (request: WebhookWireRequest) =>
  hashWebhookWireRequestV1(request);

/**
 * Fixed, language-neutral fixtures consumed by Hub, provider-handler, and client tests.
 * Expected bytes/hashes are literals so a coordinated but incompatible encoder change fails.
 */
export let SLATE_WEBHOOK_WIRE_CONFORMANCE_FIXTURES_V1 = [
  {
    name: 'absent',
    request: {
      url: 'https://edge.example/callback?token=one&token=two',
      method: 'POST',
      headers: [
        ['X-Signature', 'first'],
        ['x-signature', 'second'],
        ['X-Comma', 'one,two']
      ],
      body: { present: false }
    },
    canonicalBase64:
      'AAAAIW1ldG9yaWFsLndlYmhvb2std2lyZQByZXF1ZXN0AHYxAAAAADFodHRwczovL2VkZ2UuZXhhbXBsZS9jYWxsYmFjaz90b2tlbj1vbmUmdG9rZW49dHdvAAAABFBPU1QAAAADAAAAC1gtU2lnbmF0dXJlAAAABWZpcnN0AAAAC3gtc2lnbmF0dXJlAAAABnNlY29uZAAAAAdYLUNvbW1hAAAAB29uZSx0d28A',
    requestHash: '584b1120f9b1479ea3e974e27134cc25b6d809696e572343c73cd0fed17848d3'
  },
  {
    name: 'present-empty',
    request: {
      url: 'https://edge.example/callback?token=one&token=two',
      method: 'POST',
      headers: [
        ['X-Signature', 'first'],
        ['x-signature', 'second'],
        ['X-Comma', 'one,two']
      ],
      body: { present: true, base64: '' }
    },
    canonicalBase64:
      'AAAAIW1ldG9yaWFsLndlYmhvb2std2lyZQByZXF1ZXN0AHYxAAAAADFodHRwczovL2VkZ2UuZXhhbXBsZS9jYWxsYmFjaz90b2tlbj1vbmUmdG9rZW49dHdvAAAABFBPU1QAAAADAAAAC1gtU2lnbmF0dXJlAAAABWZpcnN0AAAAC3gtc2lnbmF0dXJlAAAABnNlY29uZAAAAAdYLUNvbW1hAAAAB29uZSx0d28BAAAAAA==',
    requestHash: '533dfa493daa1c5bc1d845806e7992a4f3d20796cde67d7fe02c159f2118ca15'
  },
  {
    name: 'binary',
    request: {
      url: 'https://edge.example/callback?token=one&token=two',
      method: 'POST',
      headers: [
        ['X-Signature', 'first'],
        ['x-signature', 'second'],
        ['X-Comma', 'one,two']
      ],
      body: { present: true, base64: 'AP8NCg==' }
    },
    canonicalBase64:
      'AAAAIW1ldG9yaWFsLndlYmhvb2std2lyZQByZXF1ZXN0AHYxAAAAADFodHRwczovL2VkZ2UuZXhhbXBsZS9jYWxsYmFjaz90b2tlbj1vbmUmdG9rZW49dHdvAAAABFBPU1QAAAADAAAAC1gtU2lnbmF0dXJlAAAABWZpcnN0AAAAC3gtc2lnbmF0dXJlAAAABnNlY29uZAAAAAdYLUNvbW1hAAAAB29uZSx0d28BAAAABAD/DQo=',
    requestHash: '7c70ec6b0319c265f66ef0b1cbc3c230198d9765543213ff1c238a08afe8304d'
  }
] as const satisfies readonly {
  name: string;
  request: WebhookWireRequest;
  canonicalBase64: string;
  requestHash: string;
}[];

export let slatesWebhookHttp = z.strictObject({
  registration: z.strictObject({ mode: z.enum(['automatic', 'manual_bootstrap']) }).optional(),
  methods: z
    .array(slatesWebhookHttpMethod)
    .min(1)
    .max(SLATE_WEBHOOK_HTTP_METHODS.length)
    .refine(methods => new Set(methods).size === methods.length, {
      message: 'Webhook HTTP methods must not contain duplicates'
    })
    .optional(),
  sync: z
    .strictObject({
      mode: z.enum(['never', 'match', 'always']),
      match: z.array(slatesWebhookRequestMatcher).optional(),
      timeoutMs: z.number().int().positive().max(15_000).optional()
    })
    .optional(),
  ingress: slatesWebhookIngress.optional()
});

export let slatesActionTrigger = slatesActionBase
  .extend({
    type: z.literal('action.trigger'),
    capabilities: z.strictObject({
      webhookSecretNegotiationV1: z.boolean().optional(),
      webhookInboundVerificationV1: z.boolean().optional(),
      webhookInboundBootstrapCaptureV1: z.boolean().optional()
    }),

    specHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),

    invocation: z.union([
      z.object({
        type: z.literal('polling'),
        intervalSeconds: z.number().min(60 * 10)
      }),
      z.object({
        type: z.literal('webhook'),
        autoRegistration: z.boolean(),
        autoUnregistration: z.boolean(),
        http: slatesWebhookHttp.optional()
      })
    ])
  })
  .superRefine((action, context) => {
    if (action.invocation.type === 'webhook' && !action.specHash) {
      context.addIssue({
        code: 'custom',
        path: ['specHash'],
        message: 'Webhook actions must publish a v1 spec hash'
      });
    }
    if (action.invocation.type === 'polling' && action.specHash !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['specHash'],
        message: 'Polling actions must not publish a webhook spec hash'
      });
    }
  });

export let slatesAction = z.union([slatesActionTool, slatesActionTrigger]);

export let SLATE_WEBHOOK_ACTION_SPEC_HASH_VERSION = 1 as const;
export let SLATE_WEBHOOK_ACTION_SPEC_HASH_DOMAIN = 'metorial.webhook-action-spec\0v1\0';

let assertValidUnicode = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    let code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      let next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError('JCS strings must contain valid Unicode scalar values');
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError('JCS strings must contain valid Unicode scalar values');
    }
  }
};

/** RFC 8785 / JCS serialization for values already constrained to the JSON data model. */
export let canonicalizeJsonJcs = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    assertValidUnicode(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('JCS numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalizeJsonJcs(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    let object = value as Record<string, unknown>;
    let entries = Object.keys(object)
      .filter(key => object[key] !== undefined)
      .sort()
      .map(key => {
        assertValidUnicode(key);
        return `${JSON.stringify(key)}:${canonicalizeJsonJcs(object[key])}`;
      });
    return `{${entries.join(',')}}`;
  }

  throw new TypeError('JCS values must use the JSON data model');
};

export interface SlateWebhookActionSpecHashInputV1 {
  id: string;
  type: 'action.trigger';
  capabilities: Record<string, unknown>;
  invocation: {
    type: 'webhook';
    autoRegistration: boolean;
    autoUnregistration: boolean;
    http?: z.input<typeof slatesWebhookHttp>;
  };
}

/**
 * Selects only the serialized fields that authorize webhook matching, verification, and
 * binding. Presentation metadata, schemas, runtime values, and the published hash are omitted.
 */
export let getWebhookActionSpecHashContractV1 = (
  action: SlateWebhookActionSpecHashInputV1
) => {
  let http = action.invocation.http ? slatesWebhookHttp.parse(action.invocation.http) : {};
  let allowedMethodSet = new Set(http.methods ?? SLATE_WEBHOOK_HTTP_METHODS);
  let allowedMethods = SLATE_WEBHOOK_HTTP_METHODS.filter(method =>
    allowedMethodSet.has(method)
  );

  return {
    id: action.id,
    type: action.type,
    capabilities: action.capabilities,
    invocation: {
      type: action.invocation.type,
      autoRegistration: action.invocation.autoRegistration,
      autoUnregistration: action.invocation.autoUnregistration,
      http: {
        registration: http.registration,
        allowedMethods,
        sync: http.sync,
        ingress: http.ingress
      }
    }
  };
};

export let encodeWebhookActionSpecHashContractV1 = (
  action: SlateWebhookActionSpecHashInputV1
) => new TextEncoder().encode(canonicalizeJsonJcs(getWebhookActionSpecHashContractV1(action)));

export let computeWebhookActionSpecHashV1 = (action: SlateWebhookActionSpecHashInputV1) =>
  createHash('sha256')
    .update(new TextEncoder().encode(SLATE_WEBHOOK_ACTION_SPEC_HASH_DOMAIN))
    .update(encodeWebhookActionSpecHashContractV1(action))
    .digest('hex');

export let webhookActionSpecHashMatchesV1 = (
  action: SlateWebhookActionSpecHashInputV1 & {
    specHash?: string;
  }
) =>
  typeof action.specHash === 'string' &&
  action.specHash.length === 64 &&
  computeWebhookActionSpecHashV1(action) === action.specHash;

/** Fixed conformance fixture shared by action producers and independent consumers. */
export let SLATE_WEBHOOK_ACTION_SPEC_HASH_FIXTURE_V1 = deepFreeze({
  action: {
    id: 'webhook.delivery',
    type: 'action.trigger',
    capabilities: {},
    invocation: {
      type: 'webhook',
      autoRegistration: true,
      autoUnregistration: false,
      http: {
        methods: ['POST', 'GET'],
        sync: {
          mode: 'match',
          match: [{ method: 'GET', hasQueryParam: 'challenge' }],
          timeoutMs: 2500
        },
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
          verification: {
            mechanism: 'hub',
            baseline: 'receiver_path_secret',
            allowedSecretRefs: [
              {
                source: 'registration',
                name: 'signing_secret',
                registrationKey: 'signing_secret',
                encoding: 'utf8'
              }
            ],
            rules: [
              {
                id: 'delivery.v1',
                phase: 'delivery',
                when: { methods: ['POST'] },
                verify: {
                  type: 'raw_hmac',
                  secretName: 'signing_secret',
                  algorithm: 'sha256',
                  signature: {
                    headerName: 'X-Signature',
                    encoding: 'hex',
                    duplicateHeaderPolicy: 'reject',
                    multipleSignaturePolicy: 'any_valid'
                  },
                  message: [{ source: 'body' }, { source: 'literal', value: '.v1' }]
                },
                result: { type: 'dispatch', scope: 'receiver_trigger' },
                replay: {
                  kind: 'enforced',
                  deduplicate: {
                    source: 'header',
                    headerName: 'X-Delivery-Id',
                    ttlSeconds: 86_400,
                    scope: 'request'
                  }
                }
              }
            ]
          }
        }
      }
    }
  } satisfies SlateWebhookActionSpecHashInputV1,
  expectedHash: '1cc404e61c919b1ce942fb02c0014365df43f1cf961115ced5153f30a1184bf7'
});

export type SlateWebhookHttpMethod = (typeof SLATE_WEBHOOK_HTTP_METHODS)[number];
export type SlateWebhookRegistrationStatus =
  (typeof SLATE_WEBHOOK_REGISTRATION_STATUSES)[number];
export type SlateWebhookPresetId = (typeof SLATE_WEBHOOK_PRESET_IDS)[number];
export type SlateWebhookItemAdapterId = (typeof SLATE_WEBHOOK_ITEM_ADAPTER_IDS)[number];
export type SlateWebhookProviderVerifierId =
  (typeof SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS)[number];
export type SlateWebhookSecretEncoding = (typeof SLATE_WEBHOOK_SECRET_ENCODINGS)[number];
export type SlateWebhookPresetFieldId = (typeof SLATE_WEBHOOK_PRESET_FIELD_IDS)[number];
export type SafeWebhookRejectionCode = (typeof SAFE_WEBHOOK_REJECTION_CODES)[number];
export type SlateWebhookVerificationMechanism = 'hub' | 'provider' | 'path_secret_only';
export type SlateWebhookRequestMatcher = z.infer<typeof slatesWebhookRequestMatcher>;
export type SlateWebhookSelector = z.infer<typeof slatesWebhookSelector>;
export type SlateWebhookFreshness = z.infer<typeof slatesWebhookFreshness>;
export type SlateWebhookDeduplicate = z.infer<typeof slatesWebhookDeduplicate>;
export type SlateWebhookReplayPolicy = z.infer<typeof slatesWebhookReplayPolicy>;
export type SlateWebhookMessagePart = z.infer<typeof slatesWebhookMessagePart>;
export type SlateWebhookSignatureSource = z.infer<typeof slatesWebhookSignatureSource>;
export type SlateWebhookVerifier = z.infer<typeof slatesWebhookVerifier>;
export type SlateWebhookRuleResult = z.infer<typeof slatesWebhookRuleResult>;
export type SlateWebhookVerificationRule = z.infer<typeof slatesWebhookVerificationRule>;
export type SlateWebhookProviderRule = z.infer<typeof slatesWebhookProviderRule>;
export type SlateWebhookSecretRef = z.infer<typeof slatesWebhookSecretRef>;

export type SlateWebhookVerification =
  | {
      mechanism: 'hub';
      baseline: 'receiver_path_secret';
      allowedSecretRefs: SlateWebhookSecretRef[];
      rules: [SlateWebhookVerificationRule, ...SlateWebhookVerificationRule[]];
    }
  | {
      mechanism: 'provider';
      baseline: 'receiver_path_secret';
      reason: string;
      allowedSecretRefs: SlateWebhookSecretRef[];
      rules: [SlateWebhookProviderRule, ...SlateWebhookProviderRule[]];
    }
  | {
      mechanism: 'path_secret_only';
      baseline: 'receiver_path_secret';
      reason: string;
    };

export type SlateWebhookIngress =
  | {
      kind: 'receiver_route';
      baseline: 'receiver_path_secret';
      verification: SlateWebhookVerification;
    }
  | {
      kind: 'shared_provisioned_app';
      baseline: 'app_route_secret';
      routeFamily: string;
      verification: {
        mechanism: 'hub';
        allowedSecretRefs: SlateWebhookSecretRef[];
        rules: [SlateWebhookVerificationRule, ...SlateWebhookVerificationRule[]];
      };
    };

export type WebhookWireBody = z.infer<typeof webhookWireBody>;
export type WebhookWireRequest = z.infer<typeof webhookWireRequest>;
export type WebhookWireResponse = z.infer<typeof webhookWireResponse>;

export type SlatesAction = z.infer<typeof slatesAction>;
export type SlatesActionTool = z.infer<typeof slatesActionTool>;
export type SlatesActionTrigger = z.infer<typeof slatesActionTrigger>;
export type SlatesActionScopes = z.infer<typeof slatesActionScopes>;
export type SlatesWebhookHttp = z.infer<typeof slatesWebhookHttp>;
