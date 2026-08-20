import { AsyncLocalStorage } from 'node:async_hooks';
import {
  badRequestError,
  createError,
  preconditionFailedError,
  ServiceError
} from '@lowerdeck/error';
import {
  computeOriginalWebhookRequestHash,
  createSlatesProviderProtoHandler,
  SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS,
  SLATES_PROTOCOL_VERSION,
  type SlatesParticipant,
  type SlatesScopedInvocationGrantEnvelope,
  slatesWebhookBootstrapCaptureOutput,
  slatesWebhookVerifyOutput,
  type WebhookBootstrapCaptureInput,
  type WebhookBootstrapCaptureOutput,
  type WebhookVerifyInput,
  type WebhookVerifyOutput,
  type WebhookWireRequest
} from '@slates/proto';
import {
  compileConfigRedactionPolicy,
  runWithContext,
  type Slate,
  type SlateAttachment,
  SlateContext,
  SlateLogger,
  type SlateLogListener
} from '@slates/provider';
import { getAction, getActionWithType, getAuthMethod, mapAction, mapAuthMethod } from './spec';
import { EphemeralRequestState, State } from './state';
import { validate } from './validation';
import { serializeWebhookHttpResponse } from './webhook';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let getObjectKeyCount = (value: unknown) =>
  isRecord(value) ? Object.keys(value).length : undefined;

let toFetchWebhookRequest = (request: WebhookWireRequest) =>
  new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body.present ? Buffer.from(request.body.base64, 'base64') : null
  });

let isScopedAuthOutputPresence = (value: unknown) =>
  isRecord(value) &&
  Object.keys(value).length === 1 &&
  isRecord(value.$output) &&
  value.$output.configured === true &&
  Object.keys(value.$output).length === 1;

let collectSecretStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return value.length > 0 ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectSecretStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectSecretStrings);
  return [];
};

let DOWNLOAD_ATTACHMENT_URL_KEYS = new Set([
  'downloadUrl',
  'fileUrl',
  'temporaryDownloadUrl',
  'webContentLink'
]);

let isAttachmentUrl = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

let collectOutputUrlAttachments = (
  value: unknown,
  seen = new Set<string>()
): SlateAttachment[] => {
  if (Array.isArray(value)) {
    return value.flatMap(item => collectOutputUrlAttachments(item, seen));
  }

  if (!isRecord(value)) {
    return [];
  }

  let attachments: SlateAttachment[] = [];

  for (let [key, nestedValue] of Object.entries(value)) {
    if (
      DOWNLOAD_ATTACHMENT_URL_KEYS.has(key) &&
      typeof nestedValue === 'string' &&
      nestedValue.length > 0 &&
      isAttachmentUrl(nestedValue) &&
      !seen.has(nestedValue)
    ) {
      seen.add(nestedValue);
      attachments.push({
        content: {
          type: 'url',
          url: nestedValue
        }
      });
      continue;
    }

    attachments.push(...collectOutputUrlAttachments(nestedValue, seen));
  }

  return attachments;
};

let mergeAttachments = (
  explicitAttachments: SlateAttachment[] | undefined,
  output: unknown
): SlateAttachment[] | undefined => {
  let attachments = [...(explicitAttachments ?? [])];
  let seen = new Set(attachments.map(attachment => JSON.stringify(attachment)));

  for (let attachment of collectOutputUrlAttachments(output)) {
    let key = JSON.stringify(attachment);
    if (seen.has(key)) continue;
    seen.add(key);
    attachments.push(attachment);
  }

  return attachments.length > 0 ? attachments : undefined;
};

let toErrorMetadata = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    };
  }

  return {
    errorValue: String(error)
  };
};

let formatEntityLabel = (name: string, key: string) => `"${name}" (${key})`;
let resolveTraceMessage = <ResultType>(
  message: string | ((result: ResultType) => string),
  result: ResultType
) => (typeof message === 'function' ? message(result) : message);

export type ScopedInvocationGrantOperation =
  | 'webhook_verify'
  | 'webhook_bootstrap_capture'
  | 'webhook_handle'
  | 'tool_invoke';

interface ScopedReceiverWebhookInvocationGrantBindingBase {
  grantId: string;
  tenantId: string;
  slateInstanceId: string;
  configSchemaVersion: number;
  configSchemaHash: string;
  hubInvocationId: string;
  requestId: string;
  actionId: string;
  specHash: string;
  ruleId: string;
  originalRequestHash: string;
  dispatchRequestHash: string;
  issuedAtMs: number;
  expiresAtMs: number;
  receiverId: string;
  receiverTriggerId: string;
  registrationStatus: string;
  registrationGeneration: number;
  registrationVersion: number;
  projectedSecretVersions: Readonly<Record<string, number>>;
  candidateBindings: readonly Readonly<{
    candidateId: string;
    index: number;
    bindingHash: string;
    deliveryIds: readonly string[];
  }>[];
}

export type ScopedInvocationGrantBindings =
  | (ScopedReceiverWebhookInvocationGrantBindingBase &
      (
        | { operation: 'webhook_verify' }
        | { operation: 'webhook_bootstrap_capture' }
        | { operation: 'webhook_handle' }
      ))
  | {
      grantId: string;
      deploymentId: string;
      runtimeIdentityId: string;
      runtimeIdentityGeneration: number;
      tenantId: string;
      slateInstanceId: string;
      configSchemaVersion: number;
      configSchemaHash: string;
      hubInvocationId: string;
      requestId: string;
      actionId: string;
      operation: 'tool_invoke';
      issuedAtMs: number;
      expiresAtMs: number;
      configSecretVersions: Readonly<Record<string, number>>;
      authConfigId: string | null;
      authSecretVersions: Readonly<Record<string, number>>;
      receiverCallback?: Readonly<{
        receiverId: string;
        receiverTriggerId: string;
        triggerActionId: string;
        specHash: string;
        registrationGeneration: number;
        registrationVersion: number;
        projectedSecretVersions: Readonly<Record<string, number>>;
      }>;
    };

export interface RedeemedScopedInvocationGrant<
  Operation extends ScopedInvocationGrantOperation = ScopedInvocationGrantOperation
> {
  bindings: Extract<ScopedInvocationGrantBindings, { operation: Operation }>;
  secrets: Record<string, { value: string; version: number }>;
  /** Mandatory, idempotent terminal cleanup of redeemed material. */
  clear(): void;
}

export interface ProviderHandlerSecurityOptions {
  redeemScopedInvocationGrant?: (d: {
    envelope: SlatesScopedInvocationGrantEnvelope;
    expected: {
      requestId: string;
      operation: ScopedInvocationGrantOperation;
      actionId: string;
      secretNames: readonly string[];
    };
  }) => Promise<RedeemedScopedInvocationGrant>;
  now?: () => number;
  operationTimeoutMs?: number;
  getOperationSignal?: (d: {
    requestId: string;
    operation: ScopedInvocationGrantOperation;
    actionId: string;
  }) => AbortSignal | undefined;
}

let sameStringSet = (first: readonly string[], second: readonly string[]) =>
  first.length === second.length &&
  new Set(first).size === first.length &&
  first.every(value => second.includes(value));

let containsSecretValue = (value: unknown, secretValues: readonly string[]) => {
  let serialized = JSON.stringify(value);
  return secretValues.some(secret => secret.length > 0 && serialized.includes(secret));
};

let sanitizeExactSecretValues = <Value>(
  value: Value,
  secretValues: readonly string[]
): Value => {
  let redact = (value: string) =>
    secretValues
      .filter(secret => secret.length > 0)
      .reduce((result, secret) => result.split(secret).join('[redacted]'), value);
  let seen = new WeakMap<object, unknown>();
  let getOwnDataValue = (source: object, key: PropertyKey) => {
    try {
      let descriptor = Object.getOwnPropertyDescriptor(source, key);
      return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  };
  let copyEnumerableData = (
    source: object,
    target: object,
    visit: (entry: unknown) => unknown,
    skipped = new Set<PropertyKey>()
  ) => {
    let keys: (string | symbol)[];
    try {
      keys = Reflect.ownKeys(source);
    } catch {
      return;
    }
    for (let key of keys) {
      if (skipped.has(key)) continue;
      let descriptor: PropertyDescriptor | undefined;
      try {
        descriptor = Object.getOwnPropertyDescriptor(source, key);
      } catch {
        continue;
      }
      if (!descriptor?.enumerable || !('value' in descriptor)) continue;
      let safeKey =
        typeof key === 'string' ? redact(key) : Symbol(redact(key.description ?? ''));
      Object.defineProperty(target, safeKey, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: visit(descriptor.value)
      });
    }
  };
  let visit = (entry: unknown): unknown => {
    if (typeof entry === 'string') return redact(entry);
    if (entry === null || (typeof entry !== 'object' && typeof entry !== 'function')) {
      return entry;
    }
    let source = entry as object;
    let existing = seen.get(source);
    if (existing !== undefined) return existing;
    if (entry instanceof Error) {
      let rawMessage = getOwnDataValue(source, 'message');
      let safeMessage = typeof rawMessage === 'string' ? redact(rawMessage) : 'Error';
      let placeholder = new Error(safeMessage);
      seen.set(source, placeholder);

      if (entry instanceof ServiceError) {
        let errorRecord = getOwnDataValue(source, 'error');
        let rawData =
          (typeof errorRecord === 'object' && errorRecord !== null) ||
          typeof errorRecord === 'function'
            ? getOwnDataValue(errorRecord as object, 'data')
            : undefined;
        let safeData = visit(rawData);
        if (
          isRecord(safeData) &&
          typeof safeData.status === 'number' &&
          typeof safeData.code === 'string' &&
          typeof safeData.message === 'string'
        ) {
          let sanitized = new ServiceError(createError(safeData as any));
          seen.set(source, sanitized);
          return sanitized;
        }
      }

      let sanitized = placeholder as Error & Record<string, unknown> & { cause?: unknown };
      let rawName = getOwnDataValue(source, 'name');
      if (typeof rawName === 'string') sanitized.name = redact(rawName);
      copyEnumerableData(
        source,
        sanitized,
        visit,
        new Set(['message', 'name', 'stack', 'cause'])
      );
      let cause = getOwnDataValue(source, 'cause');
      if (cause !== undefined) sanitized.cause = visit(cause);
      return sanitized;
    }
    if (Array.isArray(entry)) {
      let result: unknown[] = [];
      seen.set(source, result);
      copyEnumerableData(source, result, visit);
      return result;
    }
    let result: Record<PropertyKey, unknown> = Object.create(null);
    seen.set(source, result);
    copyEnumerableData(source, result, visit);
    return result;
  };
  return visit(value) as Value;
};

let SCOPED_CONSOLE_METHODS = [
  'assert',
  'clear',
  'count',
  'countReset',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'profile',
  'profileEnd',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'timeStamp',
  'trace',
  'warn'
] as const;

let scopedConsoleRedaction = new AsyncLocalStorage<readonly string[]>();
let scopedConsoleLeaseCount = 0;
let originalConsoleDescriptors = new Map<string, PropertyDescriptor | undefined>();

let restoreScopedConsole = () => {
  for (let [name, descriptor] of originalConsoleDescriptors) {
    if (descriptor) Object.defineProperty(console, name, descriptor);
    else delete (console as unknown as Record<string, unknown>)[name];
  }
  originalConsoleDescriptors.clear();
};

let acquireScopedConsoleRedaction = (values: readonly string[]) => {
  let sentinels = [...new Set(values.filter(value => value.length > 0))];
  let released = false;

  if (scopedConsoleLeaseCount++ === 0) {
    try {
      for (let name of SCOPED_CONSOLE_METHODS) {
        let method = (console as unknown as Record<string, unknown>)[name];
        if (typeof method !== 'function') continue;
        originalConsoleDescriptors.set(name, Object.getOwnPropertyDescriptor(console, name));
        Object.defineProperty(console, name, {
          configurable: true,
          enumerable: Object.prototype.propertyIsEnumerable.call(console, name),
          writable: true,
          value: (...args: unknown[]) =>
            Reflect.apply(
              method,
              console,
              args.map(arg =>
                sanitizeExactSecretValues(arg, scopedConsoleRedaction.getStore() ?? [])
              )
            )
        });
      }
    } catch (error) {
      scopedConsoleLeaseCount--;
      restoreScopedConsole();
      throw error;
    }
  }

  return {
    run: <Result>(handler: () => Promise<Result>) =>
      scopedConsoleRedaction.run(sentinels, handler),
    add: (values: readonly string[]) => {
      for (let value of values) {
        if (value.length > 0 && !sentinels.includes(value)) sentinels.push(value);
      }
    },
    release: () => {
      if (released) return;
      released = true;
      sentinels.fill('');
      sentinels.length = 0;
      scopedConsoleLeaseCount--;
      if (scopedConsoleLeaseCount !== 0) return;
      restoreScopedConsole();
    }
  };
};

let redactExactSecretValues = (error: unknown, secretValues: readonly string[]) => {
  let sanitized = sanitizeExactSecretValues(error, secretValues);
  if (sanitized instanceof Error) return sanitized;
  if (typeof sanitized === 'string') return new Error(sanitized);
  return new Error('Provider execution failed');
};

let withOperationCancellation = async <Result>(
  handler: (signal: AbortSignal) => Promise<Result>,
  timeoutMs: number,
  externalSignal?: AbortSignal
) => {
  let controller = new AbortController();
  let terminalReason: 'timeout' | 'cancelled' | undefined;
  let cancel = () => {
    terminalReason = 'cancelled';
    controller.abort(new Error('Scoped webhook operation was cancelled'));
  };
  if (externalSignal?.aborted) cancel();
  else externalSignal?.addEventListener('abort', cancel, { once: true });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    timeout = setTimeout(() => {
      terminalReason = 'timeout';
      controller.abort(new Error('Scoped webhook operation timed out'));
    }, timeoutMs);
    let result: Result;
    try {
      // Deliberately await provider settlement after abort: no timeout/cancel response can be
      // emitted while provider code is still executing with scoped material.
      result = await handler(controller.signal);
    } catch (error) {
      if (terminalReason === 'timeout') throw new Error('Scoped webhook operation timed out');
      if (terminalReason === 'cancelled')
        throw new Error('Scoped webhook operation was cancelled');
      throw error;
    }
    if (terminalReason === 'timeout') throw new Error('Scoped webhook operation timed out');
    if (terminalReason === 'cancelled')
      throw new Error('Scoped webhook operation was cancelled');
    return result;
  } finally {
    if (timeout) clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', cancel);
  }
};

let sameCandidateBindings = (
  first: readonly {
    candidateId: string;
    index: number;
    bindingHash: string;
    deliveryIds: readonly string[];
  }[],
  second: readonly {
    candidateId: string;
    index: number;
    bindingHash: string;
    deliveryIds: readonly string[];
  }[]
) => JSON.stringify(first) === JSON.stringify(second);

export let createProviderHandler = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  listeners: SlateLogListener[],
  security: ProviderHandlerSecurityOptions = {}
) =>
  createSlatesProviderProtoHandler(async manager => {
    let protocol = new State<string | null>(null);
    let participants = new State<SlatesParticipant[] | null>(null);

    let auth = new State<{ authenticationMethodId: string; output: AuthType } | null>(null);
    let config = new State<{ value: ConfigType } | null>(null);
    let session = new State<{ id: string; state: any } | null>(null);
    let scopedToolState = new EphemeralRequestState<{
      config: ConfigType;
      auth: AuthType;
      secrets: Record<string, { value: string; version: number }>;
    }>();

    let logger = new SlateLogger(listeners);
    let configWireSchema = slate.spec.config.wireSchema;
    let configRedactionPolicy = compileConfigRedactionPolicy(
      configWireSchema?.version === 2 ? configWireSchema : undefined
    );
    let providerTrace = {
      providerId: slate.spec.key,
      providerName: slate.spec.name
    };

    let traceProviderCall = async <ResultType>(
      trace: {
        component: 'config' | 'auth' | 'action';
        functionName: string;
        message: string;
        successMessage: string | ((result: ResultType) => string);
        errorMessage?: string;
        metadata?: Record<string, unknown>;
        onSuccess?: (result: ResultType) => Record<string, unknown> | undefined;
        sensitiveValues?: readonly string[];
      },
      handler: () => Promise<ResultType>
    ): Promise<ResultType> => {
      let startedAt = Date.now();

      logger.info({
        ...providerTrace,
        ...trace.metadata,
        component: trace.component,
        functionName: trace.functionName,
        phase: 'start',
        message: trace.message
      });

      try {
        let result = await handler();
        let sanitizedResult = configRedactionPolicy.redact(
          sanitizeExactSecretValues(result, trace.sensitiveValues ?? [])
        );
        let successMessage = resolveTraceMessage(trace.successMessage, sanitizedResult);

        logger.info({
          ...providerTrace,
          ...trace.metadata,
          ...(trace.onSuccess?.(sanitizedResult) ?? {}),
          component: trace.component,
          functionName: trace.functionName,
          phase: 'success',
          durationMs: Date.now() - startedAt,
          message: successMessage
        });

        return result;
      } catch (error) {
        let sanitizedError = configRedactionPolicy.redact(
          sanitizeExactSecretValues(error, trace.sensitiveValues ?? [])
        );
        logger.error({
          ...providerTrace,
          ...trace.metadata,
          ...toErrorMetadata(sanitizedError),
          component: trace.component,
          functionName: trace.functionName,
          phase: 'error',
          durationMs: Date.now() - startedAt,
          message:
            trace.errorMessage ??
            `${typeof trace.successMessage === 'string' ? trace.successMessage : trace.message} failed`
        });
        throw sanitizedError;
      }
    };

    let getContextBasic = () => {
      let currentProtocol = protocol.get();
      let currentParticipants = participants.get();

      if (!currentProtocol || !currentParticipants) {
        throw new ServiceError(
          preconditionFailedError({
            message: 'Connection context has not been initialized'
          })
        );
      }

      return {
        protocol: currentProtocol,
        participants: currentParticipants
      };
    };

    let getContextFull = () => {
      let basic = getContextBasic();

      let currentConfig = config.get();
      let currentSession = session.get();
      let currentAuth = auth.get();

      if (
        !currentConfig ||
        !currentSession ||
        (!currentAuth && slate.spec.auth.authStack.length > 0)
      ) {
        throw new ServiceError(
          preconditionFailedError({
            message: 'Session context has not been initialized'
          })
        );
      }

      return {
        ...basic,
        config: currentConfig.value,
        session: currentSession,
        auth: currentAuth
      };
    };

    let assertOrdinaryInvocationHasNoClassifiedPresence = (
      ctx: ReturnType<typeof getContextFull>
    ) => {
      let configuredConfigSecret =
        configWireSchema?.version === 2 &&
        Object.entries(configWireSchema.fields).some(
          ([key, descriptor]) =>
            descriptor.visibility === 'secret' &&
            isRecord((ctx.config as Record<string, unknown>)[key]) &&
            (ctx.config as Record<string, any>)[key].configured === true
        );
      let configuredAuthSecret = Object.values(
        (ctx.auth?.output ?? {}) as Record<string, unknown>
      ).some(value => isRecord(value) && value.configured === true);
      if (configuredConfigSecret || configuredAuthSecret) {
        throw new ServiceError(
          preconditionFailedError({
            code: 'scoped_invocation_grant_required',
            message:
              'Classified registration, polling, mapping and legacy webhook callbacks require a scoped invocation grant'
          })
        );
      }
    };

    let getAuthConfig = (): Record<string, any> => config.get()?.value ?? {};

    let getEmptyContext = () => new SlateContext({}, {}, {}, slate.spec as any, logger);
    let getAuthContext = () =>
      new SlateContext(getAuthConfig(), {}, {}, slate.spec as any, logger);

    let redeemScopedGrant = async <Operation extends ScopedInvocationGrantOperation>(d: {
      envelope: SlatesScopedInvocationGrantEnvelope;
      requestId: string;
      operation: Operation;
      actionId: string;
      secretNames: readonly string[];
    }) => {
      if (!security.redeemScopedInvocationGrant) {
        throw new ServiceError(
          preconditionFailedError({
            code: 'scoped_invocation_grant_unavailable',
            message: 'Authenticated scoped invocation grant redemption is unavailable'
          })
        );
      }

      let redeemed = await security.redeemScopedInvocationGrant({
        envelope: d.envelope,
        expected: {
          requestId: d.requestId,
          operation: d.operation,
          actionId: d.actionId,
          secretNames: d.secretNames
        }
      });
      let now = security.now?.() ?? Date.now();
      let bindings = redeemed.bindings;
      let secretNames = Object.keys(redeemed.secrets);
      let boundSecretVersions =
        bindings.operation === 'tool_invoke'
          ? {
              ...bindings.configSecretVersions,
              ...bindings.authSecretVersions,
              ...(bindings.receiverCallback
                ? Object.fromEntries(
                    Object.entries(bindings.receiverCallback.projectedSecretVersions).map(
                      ([name, version]) => [`receiver_callback:${name}`, version]
                    )
                  )
                : {})
            }
          : bindings.projectedSecretVersions;
      let receiverCallbackUrl =
        bindings.operation === 'tool_invoke' && bindings.receiverCallback
          ? redeemed.secrets['receiver_callback:$url']
          : undefined;
      let projectedNames = Object.keys(boundSecretVersions);
      if (receiverCallbackUrl) projectedNames.push('receiver_callback:$url');
      let valid =
        bindings.grantId === d.envelope.grantId &&
        bindings.requestId === d.requestId &&
        d.envelope.requestId === d.requestId &&
        bindings.operation === d.operation &&
        bindings.actionId === d.actionId &&
        Number.isInteger(bindings.configSchemaVersion) &&
        bindings.configSchemaVersion > 0 &&
        bindings.configSchemaHash.length > 0 &&
        bindings.hubInvocationId.length > 0 &&
        bindings.tenantId.length > 0 &&
        bindings.slateInstanceId.length > 0 &&
        bindings.issuedAtMs <= now &&
        bindings.expiresAtMs > now &&
        sameStringSet(d.secretNames, secretNames) &&
        sameStringSet(d.secretNames, projectedNames) &&
        secretNames.every(name =>
          name === 'receiver_callback:$url'
            ? receiverCallbackUrl !== undefined &&
              Number.isInteger(receiverCallbackUrl.version) &&
              receiverCallbackUrl.version > 0
            : redeemed.secrets[name]!.version === boundSecretVersions[name]
        ) &&
        (bindings.operation === 'tool_invoke' ||
          (typeof bindings.specHash === 'string' &&
            /^[a-f0-9]{64}$/.test(bindings.specHash) &&
            typeof bindings.ruleId === 'string' &&
            bindings.ruleId.length > 0 &&
            typeof bindings.originalRequestHash === 'string' &&
            /^[a-f0-9]{64}$/.test(bindings.originalRequestHash) &&
            typeof bindings.dispatchRequestHash === 'string' &&
            /^[a-f0-9]{64}$/.test(bindings.dispatchRequestHash) &&
            typeof bindings.receiverId === 'string' &&
            bindings.receiverId.length > 0 &&
            typeof bindings.receiverTriggerId === 'string' &&
            bindings.receiverTriggerId.length > 0 &&
            typeof bindings.registrationStatus === 'string' &&
            bindings.registrationStatus.length > 0 &&
            Number.isInteger(bindings.registrationGeneration) &&
            bindings.registrationGeneration > 0 &&
            Number.isInteger(bindings.registrationVersion) &&
            bindings.registrationVersion > 0 &&
            Array.isArray(bindings.candidateBindings)));

      if (!valid) {
        redeemed.clear();
        throw new ServiceError(
          preconditionFailedError({
            code: 'scoped_invocation_grant_invalid',
            message: 'Scoped invocation grant bindings are invalid or stale'
          })
        );
      }

      return redeemed as unknown as RedeemedScopedInvocationGrant<Operation>;
    };
    let withRequestTraces = <Result extends Record<string, any>>(
      context: SlateContext<any, any, any>,
      result: Result
    ) => {
      let requestTraces = context.getHttpTraces();
      return requestTraces.length > 0 ? { ...result, requestTraces } : result;
    };

    manager.onNotification('slates/hello', async ({ params }) => {
      protocol.set(params.protocol);
    });

    manager.onNotification('slates/participant.set', async ({ params }) => {
      if (!protocol.get()) {
        throw new ServiceError(
          preconditionFailedError({ message: 'Connection protocol has not been initialized' })
        );
      }

      participants.set(params.participants);
    });

    manager.onNotification('slates/auth.set', async ({ params }) => {
      getContextBasic();
      getAuthMethod(slate, params.authenticationMethodId); // validate method ID

      let valRes = isScopedAuthOutputPresence(params.output)
        ? params.output
        : validate(
            slate.spec.authSchema,
            params.output,
            'auth',
            `Invalid authentication output for method ID: ${params.authenticationMethodId}`
          );

      auth.set({
        authenticationMethodId: params.authenticationMethodId,
        output: valRes as AuthType
      });
    });

    manager.onNotification('slates/config.set', async ({ params }) => {
      getContextBasic();

      let value = validate(
        slate.spec.config.providerConfigSchema,
        params.config,
        'config',
        'Invalid configuration'
      );

      config.set({ value: value as ConfigType });
    });

    manager.onNotification('slates/session.start', async ({ params }) => {
      getContextBasic();

      session.set({
        id: params.sessionId,
        state: params.state
      });
    });

    manager.onRequest('slates/config.changed', async ({ params }) => {
      getContextBasic();

      let newConfig = validate(
        slate.spec.config.providerConfigSchema,
        params.newConfig,
        'config',
        'Invalid configuration'
      );

      let configChanged = slate.spec.config.handlers.configChanged;
      if (!configChanged) {
        return {
          success: true,
          config: configRedactionPolicy.projectPresence(newConfig as Record<string, any>)
        };
      }

      let context = getEmptyContext();
      let updatedConfig = await traceProviderCall<{ config?: ConfigType } | undefined>(
        {
          component: 'config',
          functionName: 'configChanged',
          message: 'Running config change handler',
          successMessage: 'Config change handler completed',
          metadata: {
            hasPreviousConfig: params.previousConfig !== null,
            newConfigKeyCount: getObjectKeyCount(newConfig)
          },
          onSuccess: result => ({
            returnedConfig: !!result?.config
          })
        },
        () =>
          runWithContext(context, async () =>
            configChanged({
              previousConfig: params.previousConfig as ConfigType | null,
              newConfig: newConfig as ConfigType
            })
          )
      );

      if (updatedConfig?.config) {
        configRedactionPolicy.assertProviderOutput(updatedConfig.config);
      }

      let mergedConfig = validate(
        slate.spec.config.providerConfigSchema,
        {
          ...(newConfig as Record<string, unknown>),
          ...((updatedConfig?.config ?? {}) as Record<string, unknown>)
        },
        'config',
        'Invalid provider config change output'
      );

      return withRequestTraces(context, {
        success: true,
        config: configRedactionPolicy.projectPresence(mergedConfig as Record<string, any>)
      });
    });

    manager.onRequest('slates/config.get_default', async () => {
      getContextBasic();

      let getDefaultConfig = slate.spec.config.handlers.getDefaultConfig;
      if (!getDefaultConfig) {
        return { config: null };
      }

      let context = getEmptyContext();
      let defaultConfig = await traceProviderCall<ConfigType>(
        {
          component: 'config',
          functionName: 'getDefaultConfig',
          message: 'Getting default config',
          successMessage: 'Default config retrieved',
          onSuccess: result => ({
            configKeyCount: getObjectKeyCount(result)
          })
        },
        () => runWithContext(context, async () => getDefaultConfig())
      );
      let validatedDefault = validate(
        slate.spec.config.configSchema,
        defaultConfig,
        'config',
        'Invalid default configuration'
      );
      return withRequestTraces(context, {
        config: configRedactionPolicy.projectPresence(
          validatedDefault as Record<string, unknown>
        )
      });
    });

    manager.onRequest('slates/config.schema.get', async () => {
      getContextBasic();

      if (!configWireSchema) {
        throw new ServiceError(
          preconditionFailedError({
            code: 'config_schema_v2_required',
            message:
              'Provider config must use configV2 or an approved v1 compatibility declaration'
          })
        );
      }

      return {
        schema: configWireSchema,
        docs: slate.spec.config.docsReferences ?? []
      };
    });

    manager.onRequest('slates/provider.identify', async () => {
      getContextBasic();

      return {
        protocol: SLATES_PROTOCOL_VERSION,
        provider: {
          type: 'provider',
          id: slate.spec.key,
          name: slate.spec.name,
          description: slate.spec.description,
          metadata: slate.spec.parameters.metadata
        },
        capabilities: {
          webhookVerificationRulesV1: true,
          webhookWireV1: true,
          webhookActionSpecHashV1: true,
          configSchemaV2: configWireSchema?.version === 2,
          scopedInvocationGrantV1: true,
          receiverBoundToolContextV1: true,
          webhookSecretNegotiationV1: true,
          webhookInboundVerificationV1: true,
          webhookInboundBootstrapCaptureV1: true
        },
        docs: slate.spec.docs ?? []
      };
    });

    manager.onRequest('slates/auth.methods.list', async () => {
      getContextBasic();

      return {
        authenticationMethods: slate.spec.auth.authStack.map(m => mapAuthMethod(slate, m))
      };
    });

    manager.onRequest('slates/auth.method.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      return {
        authenticationMethod: mapAuthMethod(slate, authMethod)
      };
    });

    manager.onRequest('slates/auth.input.get_default', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if (!authMethod.getDefaultInput) {
        return { input: null };
      }

      let context = getEmptyContext();
      let input = await traceProviderCall(
        {
          component: 'auth',
          functionName: 'getDefaultInput',
          message: 'Getting default authentication input',
          successMessage: 'Default authentication input retrieved',
          metadata: {
            authenticationMethodId: params.authenticationMethodId,
            authenticationMethodName: authMethod.name
          },
          onSuccess: result => ({
            inputKeyCount: getObjectKeyCount(result)
          })
        },
        () => runWithContext(context, () => authMethod.getDefaultInput!())
      );

      return withRequestTraces(context, { input });
    });

    manager.onRequest('slates/auth.input.changed', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if (!authMethod.onInputChanged) {
        return { success: true, input: params.newInput };
      }

      let context = getEmptyContext();
      let updatedInput = await traceProviderCall(
        {
          component: 'auth',
          functionName: 'onInputChanged',
          message: 'Running authentication input change handler',
          successMessage: 'Authentication input change handler completed',
          metadata: {
            authenticationMethodId: params.authenticationMethodId,
            authenticationMethodName: authMethod.name,
            hasPreviousInput: params.previousInput !== null,
            newInputKeyCount: getObjectKeyCount(params.newInput)
          },
          onSuccess: result => ({
            returnedInput: !!result?.input
          })
        },
        () =>
          runWithContext(context, () =>
            authMethod.onInputChanged!({
              previousInput: params.previousInput as any | null,
              newInput: params.newInput
            })
          )
      );

      return withRequestTraces(context, {
        success: true,
        input: updatedInput?.input ?? params.newInput
      });
    });

    manager.onRequest('slates/auth.output.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      let input = params.input;

      if (authMethod.inputSchema) {
        input = validate(
          authMethod.inputSchema,
          input,
          'auth',
          `Invalid authentication input for method ID: ${params.authenticationMethodId}`
        );
      }

      if ('getOutput' in authMethod) {
        let context = getAuthContext();
        let outputRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'getOutput',
            message: 'Getting authentication output',
            successMessage: 'Authentication output retrieved',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              inputKeyCount: getObjectKeyCount(input)
            },
            onSuccess: result => ({
              outputKeyCount: getObjectKeyCount(result.output),
              scopeCount: result.scopes?.length ?? 0
            })
          },
          () =>
            runWithContext(context, () =>
              authMethod.getOutput({
                input,
                config: getAuthConfig()
              })
            )
        );
        return withRequestTraces(context, {
          output: outputRes.output,
          scopes: outputRes.scopes
        });
      }

      return { output: input as any };
    });

    manager.onRequest('slates/auth.authorization_callback.handle', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if ('handleCallback' in authMethod) {
        let context = getEmptyContext();
        let callbackRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'handleCallback',
            message: 'Handling authentication callback',
            successMessage: 'Authentication callback handled',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              hasCallbackState: !!params.callbackState
            },
            onSuccess: result => ({
              outputKeyCount: getObjectKeyCount(result.output),
              returnedInput: !!result.input,
              returnedScopeCount: result.scopes?.length
            })
          },
          () =>
            runWithContext(context, () =>
              authMethod.handleCallback({
                code: params.code,
                state: params.state,
                redirectUri: params.redirectUri,
                input: params.input,
                clientId: params.clientId,
                clientSecret: params.clientSecret,
                scopes: params.scopes,
                callbackParams: params.callbackParams || {},
                callbackState: params.callbackState || {},
                config: getAuthConfig()
              })
            )
        );

        return withRequestTraces(context, {
          output: callbackRes.output,
          input: callbackRes.input,
          scopes: callbackRes.scopes
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support authorization callback handling: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/auth.authorization_url.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if ('getAuthorizationUrl' in authMethod) {
        let context = getEmptyContext();
        let urlRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'getAuthorizationUrl',
            message: 'Getting authentication authorization URL',
            successMessage: 'Authentication authorization URL retrieved',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              inputKeyCount: getObjectKeyCount(params.input)
            },
            onSuccess: result => ({
              returnedInput: !!result.input,
              hasCallbackState: !!result.callbackState
            })
          },
          () =>
            runWithContext(context, () =>
              authMethod.getAuthorizationUrl({
                redirectUri: params.redirectUri,
                state: params.state,
                input: params.input,
                clientId: params.clientId,
                clientSecret: params.clientSecret,
                scopes: params.scopes,
                config: getAuthConfig()
              })
            )
        );

        return withRequestTraces(context, {
          authorizationUrl: urlRes.url,
          input: urlRes.input,
          callbackState: urlRes.callbackState
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support authorization URL retrieval: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/auth.profile.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if (authMethod.getProfile) {
        let context = getAuthContext();
        let profileRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'getProfile',
            message: 'Getting authentication profile',
            successMessage: 'Authentication profile retrieved',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              inputKeyCount: getObjectKeyCount(params.input),
              outputKeyCount: getObjectKeyCount(params.output)
            },
            onSuccess: result => ({
              profileKeyCount: getObjectKeyCount(result.profile)
            })
          },
          () =>
            runWithContext(context, () => {
              if (authMethod.type === 'auth.oauth') {
                return authMethod.getProfile!({
                  output: params.output as any,
                  input: params.input,
                  scopes: params.scopes,
                  config: getAuthConfig()
                });
              }

              return authMethod.getProfile!({
                output: params.output as any,
                input: params.input,
                scopes: params.scopes,
                config: getAuthConfig()
              })!;
            })
        );

        return withRequestTraces(context, {
          profile: profileRes.profile
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support profile retrieval: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/auth.token_refresh.handle', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if ('handleTokenRefresh' in authMethod && authMethod.handleTokenRefresh) {
        let context = getAuthContext();
        let refreshRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'handleTokenRefresh',
            message: 'Refreshing authentication token',
            successMessage: 'Authentication token refreshed',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              inputKeyCount: getObjectKeyCount(params.input),
              outputKeyCount: getObjectKeyCount(params.output)
            },
            onSuccess: result => ({
              refreshedOutputKeyCount: getObjectKeyCount(result.output),
              returnedInput: !!result.input
            })
          },
          () =>
            runWithContext(context, () => {
              if (authMethod.type === 'auth.oauth') {
                return authMethod.handleTokenRefresh!({
                  output: params.output as any,
                  input: params.input,
                  clientId: params.clientId,
                  clientSecret: params.clientSecret,
                  scopes: params.scopes,
                  config: getAuthConfig()
                });
              }

              return authMethod.handleTokenRefresh!({
                output: params.output as any,
                input: params.input,
                clientId: params.clientId,
                clientSecret: params.clientSecret,
                scopes: params.scopes,
                config: getAuthConfig()
              });
            })
        );

        return withRequestTraces(context, {
          output: refreshRes.output,
          input: refreshRes.input
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support token refresh handling: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/actions.list', async () => {
      getContextBasic();

      return {
        actions: slate.actions.map(a => mapAction(slate, a))
      };
    });

    manager.onRequest('slates/action.get', async ({ params }) => {
      getContextBasic();
      let action = getAction(slate, params.actionId);

      return {
        action: mapAction(slate, action)
      };
    });

    manager.onRequest('slates/action.tool.invoke', async ({ params, invocation, id }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'tool', params.actionId);

      let input = validate(
        action.inputSchema,
        params.input,
        'input',
        `Invalid input for tool ID: ${params.actionId}`
      );

      let configSecretNames =
        configWireSchema?.version === 2
          ? Object.entries(configWireSchema.fields)
              .filter(
                ([key, field]) =>
                  field.visibility === 'secret' &&
                  key in (ctx.config as Record<string, unknown>)
              )
              .map(([key]) => `config:${key}`)
          : [];
      let authSecretNames = Object.keys(
        (ctx.auth?.output ?? {}) as Record<string, unknown>
      ).map(key => `auth:${key}`);
      let receiverCapability = (
        action.parameters as typeof action.parameters & {
          receiverBoundToolContextV1?: { secretNames: readonly string[] };
        }
      ).receiverBoundToolContextV1;
      let receiverSecretNames = receiverCapability
        ? [
            'receiver_callback:$url',
            ...receiverCapability.secretNames.map(name => `receiver_callback:${name}`)
          ]
        : [];
      let secretNames = [
        ...configSecretNames,
        ...authSecretNames,
        ...receiverSecretNames
      ].sort();
      if (secretNames.length > 0 && !invocation) {
        throw new ServiceError(
          preconditionFailedError({
            code: 'scoped_invocation_grant_required',
            message: 'Secret-bearing tool invocation requires a scoped invocation grant'
          })
        );
      }
      let redeemed = invocation
        ? await redeemScopedGrant({
            envelope: invocation,
            requestId: id,
            operation: 'tool_invoke',
            actionId: action.key,
            secretNames
          })
        : undefined;
      if (receiverCapability && !redeemed?.bindings.receiverCallback) {
        redeemed?.clear();
        throw new ServiceError(
          preconditionFailedError({
            code: 'receiver_bound_tool_context_unavailable',
            message: 'The receiver-bound tool grant is missing its authoritative binding'
          })
        );
      }
      if (!receiverCapability && redeemed?.bindings.receiverCallback) {
        redeemed.clear();
        throw new ServiceError(
          preconditionFailedError({
            code: 'receiver_bound_tool_context_unexpected',
            message: 'The action does not declare receiver-bound tool context'
          })
        );
      }
      let consoleRedaction: ReturnType<typeof acquireScopedConsoleRedaction> | undefined;
      let classifiedSecretValues = Object.values(redeemed?.secrets ?? {})
        .map(secret => secret.value)
        .filter(value => value.length > 0);
      try {
        if (redeemed) consoleRedaction = acquireScopedConsoleRedaction(classifiedSecretValues);
        let execute = async () => {
          let classified = Object.fromEntries(
            Object.entries(redeemed?.secrets ?? {}).map(([name, secret]) => {
              let value = name.startsWith('receiver_callback:')
                ? secret.value
                : (JSON.parse(secret.value) as unknown);
              let parsedSentinels = collectSecretStrings(value);
              for (let sentinel of parsedSentinels) {
                if (!classifiedSecretValues.includes(sentinel)) {
                  classifiedSecretValues.push(sentinel);
                }
              }
              consoleRedaction?.add(parsedSentinels);
              return [name, { ...secret, value }];
            })
          );
          let invocationConfig = {
            ...(ctx.config as Record<string, unknown>),
            ...Object.fromEntries(
              Object.entries(classified)
                .filter(([name]) => name.startsWith('config:'))
                .map(([name, secret]) => [name.slice('config:'.length), secret.value])
            )
          } as ConfigType;
          let unclassifiedAuth = Object.fromEntries(
            Object.entries((ctx.auth?.output ?? {}) as Record<string, unknown>).filter(
              ([key]) => key !== '$output'
            )
          );
          let scopedAuthOutput = classified['auth:$output']?.value;
          if (scopedAuthOutput !== undefined && !isRecord(scopedAuthOutput)) {
            throw new ServiceError(
              preconditionFailedError({
                code: 'scoped_invocation_grant_invalid',
                message: 'Scoped authentication output is invalid'
              })
            );
          }
          let invocationAuth = validate(
            slate.spec.authSchema,
            {
              ...unclassifiedAuth,
              ...(scopedAuthOutput ?? {}),
              ...Object.fromEntries(
                Object.entries(classified)
                  .filter(([name]) => name.startsWith('auth:') && name !== 'auth:$output')
                  .map(([name, secret]) => [name.slice('auth:'.length), secret.value])
              )
            },
            'auth',
            `Invalid scoped authentication output for method ID: ${ctx.auth?.authenticationMethodId ?? 'none'}`
          ) as AuthType;
          let redactionSecrets = Object.fromEntries(
            Object.entries(classified)
              .filter(([name]) => !name.startsWith('receiver_callback:'))
              .map(([name, secret]) => [
                name,
                {
                  value:
                    typeof secret.value === 'string'
                      ? secret.value
                      : JSON.stringify(secret.value),
                  version: secret.version
                }
              ])
          );
          let receiverCallback = receiverCapability
            ? (() => {
                let url = classified['receiver_callback:$url'];
                if (!url || typeof url.value !== 'string') {
                  throw new ServiceError(
                    preconditionFailedError({
                      code: 'receiver_bound_tool_context_unavailable',
                      message: 'The receiver-bound callback URL is unavailable'
                    })
                  );
                }
                let secrets = Object.fromEntries(
                  receiverCapability.secretNames.map(name => {
                    let secret = classified[`receiver_callback:${name}`];
                    if (!secret || typeof secret.value !== 'string') {
                      throw new ServiceError(
                        preconditionFailedError({
                          code: 'receiver_bound_tool_context_unavailable',
                          message: 'A receiver-bound callback secret is unavailable'
                        })
                      );
                    }
                    return [name, { value: secret.value, version: secret.version }];
                  })
                );
                return { url: url.value, secrets };
              })()
            : undefined;
          return await scopedToolState.run(
            id,
            {
              config: invocationConfig,
              auth: invocationAuth,
              secrets: redactionSecrets
            },
            async scoped => {
              let context: SlateContext<any, any, any> | undefined;
              try {
                let res = await traceProviderCall(
                  {
                    component: 'action',
                    functionName: 'handleInvocation',
                    message: `Starting tool ${formatEntityLabel(action.name, action.key)}`,
                    successMessage: `Completed tool ${formatEntityLabel(action.name, action.key)}`,
                    errorMessage: `Tool ${formatEntityLabel(action.name, action.key)} failed`,
                    metadata: {
                      actionId: action.key,
                      actionName: action.name,
                      actionType: action.type,
                      inputKeyCount: getObjectKeyCount(input)
                    },
                    onSuccess: result => ({
                      hasMessage: !!result.message,
                      actionResultMessage: result.message,
                      outputKeyCount: getObjectKeyCount(result.output),
                      attachmentCount: result.attachments?.length
                    }),
                    sensitiveValues: classifiedSecretValues
                  },
                  () =>
                    withOperationCancellation(
                      signal => {
                        context = new SlateContext(
                          scoped.config,
                          input,
                          scoped.auth,
                          slate.spec,
                          logger,
                          {
                            secrets: scoped.secrets,
                            redactionSentinels: classifiedSecretValues,
                            receiverCallback,
                            abortSignal: signal
                          }
                        );
                        return runWithContext(context, () =>
                          action.handleInvocation(context!)
                        );
                      },
                      security.operationTimeoutMs ?? 30_000,
                      security.getOperationSignal?.({
                        requestId: id,
                        operation: 'tool_invoke',
                        actionId: action.key
                      })
                    )
                );

                if (containsSecretValue(res, classifiedSecretValues)) {
                  throw new ServiceError(
                    preconditionFailedError({
                      code: 'classified_provider_output_rejected',
                      message: 'Provider output attempted to return classified invocation data'
                    })
                  );
                }
                let output = validate(
                  action.outputSchema,
                  res.output,
                  'output',
                  `Invalid output for tool ID: ${params.actionId}`
                );
                return sanitizeExactSecretValues(
                  withRequestTraces(context!, {
                    output,
                    message: res.message,
                    attachments: mergeAttachments(res.attachments, res.output)
                  }),
                  classifiedSecretValues
                );
              } finally {
                context?.clearScopedInvocation();
              }
            }
          );
        };
        return await (consoleRedaction ? consoleRedaction.run(execute) : execute());
      } catch (error) {
        throw redactExactSecretValues(error, classifiedSecretValues);
      } finally {
        consoleRedaction?.release();
        classifiedSecretValues.fill('');
        classifiedSecretValues.length = 0;
        redeemed?.clear();
      }
    });

    manager.onRequest('slates/action.trigger.map_event', async ({ params }) => {
      let ctx = getContextFull();
      assertOrdinaryInvocationHasNoClassifiedPresence(ctx);
      let action = getActionWithType(slate, 'trigger', params.actionId);

      let input = validate(
        action.inputSchema,
        params.input,
        'input',
        `Invalid event for trigger ID: ${params.actionId}`
      );

      let context = new SlateContext(ctx.config, input, ctx.auth?.output!, slate.spec, logger);
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'handleEvent',
          message: `Mapping event for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: result =>
            `Mapped trigger event "${result.type}" for ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while mapping an event`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            inputKeyCount: getObjectKeyCount(input)
          },
          onSuccess: result => ({
            eventType: result.type,
            hasEventId: !!result.id,
            outputKeyCount: getObjectKeyCount(result.output)
          })
        },
        () => runWithContext(context, () => action.handleEvent(context))
      );

      return withRequestTraces(context, { id: res.id, type: res.type, output: res.output });
    });

    manager.onRequest('slates/action.trigger.poll_events', async ({ params }) => {
      let ctx = getContextFull();
      assertOrdinaryInvocationHasNoClassifiedPresence(ctx);
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.pollEvents) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support polling: ${params.actionId}`
          })
        );
      }

      let context = new SlateContext(
        ctx.config,
        { state: params.state },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'pollEvents',
          message: `Polling events for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: result =>
            `Polled ${result.inputs.length} event(s) for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while polling events`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            hasPreviousState: params.state !== null
          },
          onSuccess: result => ({
            inputCount: result.inputs.length,
            hasUpdatedState: result.updatedState !== undefined
          })
        },
        () => runWithContext(context, () => action.pollEvents!(context))
      );

      return withRequestTraces(context, {
        inputs: res.inputs,
        updatedState: res.updatedState
      });
    });

    let getProviderWebhookRule = (actionId: string, ruleId: string) => {
      let action = getActionWithType(slate, 'trigger', actionId);
      let verification = action.http?.ingress?.verification;
      if (!verification || verification.mechanism !== 'provider') {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not declare provider webhook verification: ${actionId}`
          })
        );
      }
      let rule = verification.rules.find(candidate => candidate.id === ruleId);
      if (!rule) {
        throw new ServiceError(
          badRequestError({ message: `Unknown provider webhook rule: ${ruleId}` })
        );
      }
      return { action, rule };
    };

    manager.onRequest(
      'slates/action.trigger.webhook_verify',
      async ({ params, invocation, id }) => {
        getContextBasic();
        let { action, rule } = getProviderWebhookRule(params.actionId, params.ruleId);
        let handlers = action.parameters as typeof action.parameters & {
          verifyWebhook?: (
            context: SlateContext<any, any, WebhookVerifyInput>
          ) => Promise<WebhookVerifyOutput>;
        };
        if (!handlers.verifyWebhook) {
          throw new ServiceError(
            preconditionFailedError({
              message: `Trigger action does not advertise inbound verification: ${params.actionId}`
            })
          );
        }
        let publishedAction = mapAction(slate, action);
        if (
          publishedAction.type !== 'action.trigger' ||
          publishedAction.invocation.type !== 'webhook' ||
          params.specHash !== publishedAction.specHash
        ) {
          throw new ServiceError(
            badRequestError({ message: 'Webhook action spec hash binding is invalid' })
          );
        }
        if (
          computeOriginalWebhookRequestHash(params.originalRequest) !==
          params.originalRequestHash
        ) {
          throw new ServiceError(
            badRequestError({ message: 'Original webhook request hash binding is invalid' })
          );
        }

        let expectedScope =
          rule.result.type === 'dispatch' ? rule.result.scope : 'receiver_trigger';
        if (
          expectedScope === 'verified_items' &&
          params.itemAdapter?.id !== 'graph.body_value.v1'
        ) {
          throw new ServiceError(
            badRequestError({ message: 'The declared verified-items adapter is required' })
          );
        }
        if (
          params.itemAdapter &&
          new Set(params.itemAdapter.candidates.map(candidate => candidate.candidateId))
            .size !== params.itemAdapter.candidates.length
        ) {
          throw new ServiceError(
            badRequestError({ message: 'Webhook item candidates must have unique IDs' })
          );
        }

        let redeemed = await redeemScopedGrant({
          envelope: invocation,
          requestId: id,
          operation: 'webhook_verify',
          actionId: params.actionId,
          secretNames: rule.verify.allowedSecretRefs
        });
        let context: SlateContext<any, any, WebhookVerifyInput> | undefined;
        let secretValues = Object.values(redeemed.secrets).map(secret => secret.value);
        let consoleRedaction: ReturnType<typeof acquireScopedConsoleRedaction> | undefined;
        try {
          consoleRedaction = acquireScopedConsoleRedaction(secretValues);
          if (
            redeemed.bindings.specHash !== params.specHash ||
            redeemed.bindings.ruleId !== params.ruleId ||
            redeemed.bindings.originalRequestHash !== params.originalRequestHash ||
            redeemed.bindings.dispatchRequestHash !== params.originalRequestHash ||
            !redeemed.bindings.receiverId ||
            !redeemed.bindings.receiverTriggerId ||
            redeemed.bindings.registrationGeneration <= 0 ||
            redeemed.bindings.registrationVersion <= 0 ||
            !sameCandidateBindings(
              redeemed.bindings.candidateBindings,
              params.itemAdapter?.candidates ?? []
            )
          ) {
            throw new ServiceError(
              preconditionFailedError({
                code: 'scoped_invocation_grant_invalid',
                message: 'Scoped verification bindings are invalid or stale'
              })
            );
          }
          let result = await consoleRedaction.run(() =>
            withOperationCancellation(
              signal => {
                context = new SlateContext({}, params, {}, slate.spec as any, logger, {
                  secrets: redeemed.secrets,
                  redactionSentinels: secretValues,
                  networkEgress: 'deny_all',
                  sideEffects: 'deny_all',
                  abortSignal: signal
                });
                return runWithContext(context, () => handlers.verifyWebhook!(context!));
              },
              security.operationTimeoutMs ?? 15_000,
              security.getOperationSignal?.({
                requestId: id,
                operation: 'webhook_verify',
                actionId: params.actionId
              })
            )
          );
          let parsed = slatesWebhookVerifyOutput.parse(result);
          if (parsed.status === 'accepted') {
            let allowedAuthenticatedFields = new Set(
              SLATE_WEBHOOK_PROVIDER_VERIFIER_DEFINITIONS[rule.verify.verifierId].presetFields
            );
            if (
              Object.keys(parsed.authenticatedFields ?? {}).some(
                field => !allowedAuthenticatedFields.has(field as never)
              )
            ) {
              throw new ServiceError(
                badRequestError({
                  message: 'Provider verification returned an undeclared authenticated field'
                })
              );
            }
            if (parsed.selection.scope !== expectedScope) {
              throw new ServiceError(
                badRequestError({
                  message: 'Provider verification returned a contradictory scope'
                })
              );
            }
            if (parsed.selection.scope === 'verified_items') {
              let candidates = new Set(
                params.itemAdapter?.candidates.map(candidate => candidate.candidateId) ?? []
              );
              if (
                parsed.selection.itemAdapterId !== params.itemAdapter?.id ||
                parsed.selection.acceptedCandidateIds.some(
                  candidateId => !candidates.has(candidateId)
                )
              ) {
                throw new ServiceError(
                  badRequestError({
                    message: 'Provider verification selected an unknown item candidate'
                  })
                );
              }
            }
          }
          if (containsSecretValue(parsed, secretValues)) {
            throw new ServiceError(
              badRequestError({
                message: 'Provider verification output contains a scoped secret'
              })
            );
          }
          return parsed;
        } catch (error) {
          throw redactExactSecretValues(error, secretValues);
        } finally {
          context?.clearScopedInvocation();
          consoleRedaction?.release();
          secretValues.fill('');
          secretValues.length = 0;
          redeemed.clear();
        }
      }
    );

    manager.onRequest(
      'slates/action.trigger.webhook_bootstrap_capture',
      async ({ params, invocation, id }) => {
        getContextBasic();
        let { action, rule } = getProviderWebhookRule(params.actionId, params.ruleId);
        let handlers = action.parameters as typeof action.parameters & {
          captureWebhookBootstrap?: (
            context: SlateContext<any, any, WebhookBootstrapCaptureInput>
          ) => Promise<WebhookBootstrapCaptureOutput>;
        };
        if (
          !handlers.captureWebhookBootstrap ||
          rule.phase !== 'bootstrap' ||
          rule.result.type !== 'sync_only'
        ) {
          throw new ServiceError(
            preconditionFailedError({
              message: 'Bootstrap capture is not advertised for the selected bootstrap rule'
            })
          );
        }
        let publishedAction = mapAction(slate, action);
        if (
          publishedAction.type !== 'action.trigger' ||
          publishedAction.invocation.type !== 'webhook' ||
          params.specHash !== publishedAction.specHash
        ) {
          throw new ServiceError(
            badRequestError({ message: 'Webhook action spec hash binding is invalid' })
          );
        }
        if (
          computeOriginalWebhookRequestHash(params.originalRequest) !==
          params.originalRequestHash
        ) {
          throw new ServiceError(
            badRequestError({ message: 'Original webhook request hash binding is invalid' })
          );
        }
        let candidateIds = new Set(
          params.itemAdapter?.candidates.map(candidate => candidate.candidateId) ?? []
        );
        if (params.acceptedCandidateIds.some(candidateId => !candidateIds.has(candidateId))) {
          throw new ServiceError(
            badRequestError({ message: 'Bootstrap capture contains an unknown accepted item' })
          );
        }

        let redeemed = await redeemScopedGrant({
          envelope: invocation,
          requestId: id,
          operation: 'webhook_bootstrap_capture',
          actionId: params.actionId,
          secretNames: rule.verify.allowedSecretRefs
        });
        let context: SlateContext<any, any, WebhookBootstrapCaptureInput> | undefined;
        let secretValues = Object.values(redeemed.secrets).map(secret => secret.value);
        let consoleRedaction: ReturnType<typeof acquireScopedConsoleRedaction> | undefined;
        try {
          consoleRedaction = acquireScopedConsoleRedaction(secretValues);
          if (
            redeemed.bindings.specHash !== params.specHash ||
            redeemed.bindings.ruleId !== params.ruleId ||
            redeemed.bindings.originalRequestHash !== params.originalRequestHash ||
            redeemed.bindings.receiverTriggerId !== params.receiverTriggerId ||
            !['pending', 'registering'].includes(redeemed.bindings.registrationStatus ?? '') ||
            redeemed.bindings.registrationGeneration === undefined ||
            redeemed.bindings.registrationVersion !== params.registrationVersion ||
            redeemed.bindings.dispatchRequestHash !== params.originalRequestHash ||
            !sameCandidateBindings(
              redeemed.bindings.candidateBindings,
              (params.itemAdapter?.candidates ?? []).filter(candidate =>
                params.acceptedCandidateIds.includes(candidate.candidateId)
              )
            )
          ) {
            throw new ServiceError(
              preconditionFailedError({
                code: 'scoped_invocation_grant_invalid',
                message: 'Scoped bootstrap bindings are invalid or stale'
              })
            );
          }
          let result = await consoleRedaction.run(() =>
            withOperationCancellation(
              signal => {
                context = new SlateContext({}, params, {}, slate.spec as any, logger, {
                  secrets: redeemed.secrets,
                  redactionSentinels: secretValues,
                  networkEgress: 'deny_all',
                  sideEffects: 'deny_all',
                  abortSignal: signal
                });
                return runWithContext(context, () =>
                  handlers.captureWebhookBootstrap!(context!)
                );
              },
              security.operationTimeoutMs ?? 15_000,
              security.getOperationSignal?.({
                requestId: id,
                operation: 'webhook_bootstrap_capture',
                actionId: params.actionId
              })
            )
          );
          let parsed = slatesWebhookBootstrapCaptureOutput.parse(result);
          if (parsed.status === 'accepted') {
            let allowedCaptureNames = [...rule.verify.allowedBootstrapCaptureRefs].sort();
            let returnedCaptureNames = Object.keys(parsed.capturedSecrets).sort();
            if (
              allowedCaptureNames.length !== returnedCaptureNames.length ||
              allowedCaptureNames.some(
                (secretName, index) => secretName !== returnedCaptureNames[index]
              )
            ) {
              throw new ServiceError(
                badRequestError({
                  message: 'Bootstrap capture must return every declared secret exactly once'
                })
              );
            }
          }
          let nonCaptureOutput =
            parsed.status === 'accepted'
              ? { ...parsed, capturedSecrets: Object.keys(parsed.capturedSecrets) }
              : parsed;
          if (containsSecretValue(nonCaptureOutput, secretValues)) {
            throw new ServiceError(
              badRequestError({ message: 'Bootstrap output leaked a scoped input secret' })
            );
          }
          return parsed;
        } catch (error) {
          throw redactExactSecretValues(error, secretValues);
        } finally {
          context?.clearScopedInvocation();
          consoleRedaction?.release();
          secretValues.fill('');
          secretValues.length = 0;
          redeemed.clear();
        }
      }
    );

    manager.onRequest('slates/action.trigger.webhook_handle', async message => {
      if ('invocation' in message) {
        let { params, invocation, id } = message;
        getContextBasic();
        let action = getActionWithType(slate, 'trigger', params.actionId);
        if (!action.handleRequest) {
          throw new ServiceError(
            badRequestError({
              message: `Trigger action does not support webhook mapping: ${params.actionId}`
            })
          );
        }
        let publishedAction = mapAction(slate, action);
        if (
          publishedAction.type !== 'action.trigger' ||
          publishedAction.invocation.type !== 'webhook' ||
          publishedAction.specHash !== params.specHash ||
          computeOriginalWebhookRequestHash(params.request) !== params.dispatchRequestHash
        ) {
          throw new ServiceError(
            badRequestError({ message: 'Scoped webhook mapping request bindings are invalid' })
          );
        }
        let redeemed = await redeemScopedGrant({
          envelope: invocation,
          requestId: id,
          operation: 'webhook_handle',
          actionId: params.actionId,
          secretNames: []
        });
        let context: SlateContext<any, any, any> | undefined;
        try {
          if (
            redeemed.bindings.specHash !== params.specHash ||
            redeemed.bindings.ruleId !== params.ruleId ||
            redeemed.bindings.originalRequestHash !== params.originalRequestHash ||
            redeemed.bindings.dispatchRequestHash !== params.dispatchRequestHash ||
            redeemed.bindings.receiverTriggerId !== params.triggerId ||
            !sameCandidateBindings(
              redeemed.bindings.candidateBindings,
              params.selectedItems ?? []
            )
          ) {
            throw new ServiceError(
              preconditionFailedError({
                code: 'scoped_invocation_grant_invalid',
                message: 'Scoped mapping bindings are invalid or stale'
              })
            );
          }
          let result = await withOperationCancellation(
            signal => {
              context = new SlateContext(
                {},
                {
                  request: toFetchWebhookRequest(params.request),
                  itemAdapterId: params.itemAdapterId,
                  selectedItems: params.selectedItems
                },
                {},
                slate.spec as any,
                logger,
                {
                  secrets: {},
                  networkEgress: 'deny_all',
                  sideEffects: 'deny_all',
                  abortSignal: signal
                }
              );
              return runWithContext(context, () => action.handleRequest!(context as any));
            },
            security.operationTimeoutMs ?? 15_000,
            security.getOperationSignal?.({
              requestId: id,
              operation: 'webhook_handle',
              actionId: params.actionId
            })
          );
          if (!isRecord(result) || !Array.isArray(result.inputs)) {
            throw new ServiceError(
              badRequestError({ message: 'Scoped webhook mapping output is invalid' })
            );
          }
          if (params.selectedItems) {
            let expectedIds = params.selectedItems.map(item => item.candidateId);
            let actualIds = result.inputs.map(input =>
              isRecord(input) && typeof input.candidateId === 'string'
                ? input.candidateId
                : undefined
            );
            if (
              actualIds.some(idValue => idValue === undefined) ||
              new Set(actualIds).size !== actualIds.length ||
              actualIds.length !== expectedIds.length ||
              expectedIds.some(candidateId => !actualIds.includes(candidateId))
            ) {
              throw new ServiceError(
                badRequestError({ message: 'Scoped webhook mapping output is not exhaustive' })
              );
            }
          }
          return {
            inputs: result.inputs,
            updatedState: result.updatedState,
            response:
              result.response === undefined
                ? undefined
                : await serializeWebhookHttpResponse(result.response)
          };
        } finally {
          context?.clearScopedInvocation();
          redeemed.clear();
        }
      }

      let { params } = message;
      let ctx = getContextFull();
      assertOrdinaryInvocationHasNoClassifiedPresence(ctx);
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.handleRequest) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support webhook requests: ${params.actionId}`
          })
        );
      }

      let req = new Request(params.url, {
        method: params.method,
        headers: params.headers,
        body: params.body
          ? Uint8Array.from(atob(params.body.content), c => c.charCodeAt(0))
          : null
      });

      let context = new SlateContext(
        ctx.config,
        {
          request: req,
          state: params.state,
          registrationDetails: params.registrationDetails ?? null
        },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'handleRequest',
          message: `Handling webhook request for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: result =>
            `Received ${result.inputs.length} webhook event(s) for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while handling a webhook request`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            requestMethod: params.method,
            hasRequestBody: !!params.body,
            hasPreviousState: params.state !== null
          },
          onSuccess: result => ({
            inputCount: result.inputs.length,
            hasUpdatedState: result.updatedState !== undefined,
            hasResponse: result.response !== undefined
          })
        },
        () => runWithContext(context, () => action.handleRequest!(context))
      );

      let response =
        res.response === undefined
          ? undefined
          : await serializeWebhookHttpResponse(res.response);

      return withRequestTraces(context, {
        inputs: res.inputs,
        updatedState: res.updatedState,
        response
      });
    });

    manager.onRequest('slates/action.trigger.webhook_register', async ({ params }) => {
      let ctx = getContextFull();
      assertOrdinaryInvocationHasNoClassifiedPresence(ctx);
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.autoRegisterWebhook) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support webhook auto-registration: ${params.actionId}`
          })
        );
      }

      let verification = action.http?.ingress?.verification;
      let bootstrapCaptureSecrets = new Set(
        verification && 'rules' in verification
          ? verification.rules.flatMap(rule =>
              rule.verify.type === 'provider'
                ? (rule.verify.allowedBootstrapCaptureRefs ?? [])
                : []
            )
          : []
      );
      let declaredSecretNames = [
        ...new Set(
          verification && 'allowedSecretRefs' in verification
            ? verification.allowedSecretRefs
                .filter(secretRef => secretRef.source === 'registration')
                .filter(secretRef => !bootstrapCaptureSecrets.has(secretRef.name))
                .map(secretRef => secretRef.name)
            : []
        )
      ].sort();
      let requestedSecretNames = Object.keys(params.capturedSecretVersions).sort();
      let exactNames = (first: string[], second: string[]) =>
        first.length === second.length && first.every((name, index) => name === second[index]);
      if (!exactNames(requestedSecretNames, declaredSecretNames)) {
        throw new ServiceError(
          badRequestError({
            message:
              'Webhook registration secret-version authority does not match the action declaration'
          })
        );
      }

      let context = new SlateContext(
        ctx.config,
        {
          webhookBaseUrl: params.webhookBaseUrl,
          registrationDetails: params.registrationDetails,
          capturedSecretVersions: Object.freeze({ ...params.capturedSecretVersions })
        },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'autoRegisterWebhook',
          message: `Registering webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: `Registered webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while registering a webhook`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type
          },
          onSuccess: result => ({
            hasRegistrationDetails: result.registrationDetails !== undefined,
            hasState: result.state !== undefined
          })
        },
        () => runWithContext(context, () => action.autoRegisterWebhook!(context))
      );

      {
        let returnedSecretNames = Object.keys(res.capturedSecrets ?? {}).sort();
        if (!exactNames(returnedSecretNames, declaredSecretNames)) {
          throw new ServiceError(
            badRequestError({
              message:
                'Webhook registration must return every declared registration secret exactly once'
            })
          );
        }
        for (let name of declaredSecretNames) {
          let secret = res.capturedSecrets?.[name];
          if (
            !secret ||
            typeof secret.value !== 'string' ||
            secret.value.length === 0 ||
            secret.version !== params.capturedSecretVersions[name]
          ) {
            throw new ServiceError(
              badRequestError({
                message: 'Webhook registration returned a stale or invalid secret'
              })
            );
          }
        }
      }

      return withRequestTraces(context, {
        registrationDetails: res.registrationDetails,
        state: res.state,
        capturedSecrets: res.capturedSecrets
      });
    });

    manager.onRequest('slates/action.trigger.webhook_unregister', async ({ params }) => {
      let ctx = getContextFull();
      assertOrdinaryInvocationHasNoClassifiedPresence(ctx);
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.autoUnregisterWebhook) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support webhook auto-unregistration: ${params.actionId}`
          })
        );
      }

      let context = new SlateContext(
        ctx.config,
        {
          webhookBaseUrl: params.webhookBaseUrl,
          registrationDetails: params.registrationDetails,
          state: params.state
        },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      await traceProviderCall(
        {
          component: 'action',
          functionName: 'autoUnregisterWebhook',
          message: `Unregistering webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: `Unregistered webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while unregistering a webhook`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            hasRegistrationDetails: params.registrationDetails !== null,
            hasPreviousState: params.state !== null
          }
        },
        () => runWithContext(context, () => action.autoUnregisterWebhook!(context))
      );

      return withRequestTraces(context, {});
    });
  });

export {
  deserializeWebhookWireRequest,
  deserializeWebhookWireResponse,
  recomputeWebhookActionSpecHashV1,
  serializeWebhookWireRequest,
  serializeWebhookWireResponse
} from './webhook';
