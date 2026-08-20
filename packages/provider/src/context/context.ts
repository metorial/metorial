import type { SlateHttpTrace } from '../axios/trace';
import { type ConfigRedactionPolicy, compileConfigRedactionPolicy } from '../config';
import type { SlateLogger, SlateLogMessageInput } from '../logger';
import type { SlateSpecification } from '../specification/specification';

export type SlateScopedSecret = Readonly<{ value: string; version: number }>;
export type SlateScopedSecrets = Readonly<Record<string, SlateScopedSecret>>;

export interface SlateContextSecurity {
  secrets?: Record<string, { value: string; version: number }>;
  /** Exact primitive values that must be removed from logs/traces but are not exposed
   * through `context.secrets` (for example values nested inside an auth output). */
  redactionSentinels?: readonly string[];
  networkEgress?: 'default' | 'deny_all';
  abortSignal?: AbortSignal;
  sideEffects?: 'default' | 'deny_all';
  receiverCallback?: Readonly<{
    url: string;
    secrets: Readonly<Record<string, { value: string; version: number }>>;
  }>;
}

let redactExactValues = <Value>(value: Value, secrets: readonly string[]): Value => {
  let activeSecrets = secrets.filter(secret => secret.length > 0);
  if (activeSecrets.length === 0) return value;

  let seen = new WeakMap<object, unknown>();
  let visit = (entry: unknown): unknown => {
    if (typeof entry === 'string') {
      return activeSecrets.reduce(
        (redacted, secret) => redacted.split(secret).join('[redacted]'),
        entry
      );
    }
    if (entry === null || typeof entry !== 'object') return entry;
    if (entry instanceof Error) {
      let error = new Error(visit(entry.message) as string);
      error.name = entry.name;
      error.stack =
        typeof entry.stack === 'string' ? (visit(entry.stack) as string) : undefined;
      return error;
    }
    let existing = seen.get(entry);
    if (existing) return existing;
    if (Array.isArray(entry)) {
      let result: unknown[] = [];
      seen.set(entry, result);
      entry.forEach(item => result.push(visit(item)));
      return result;
    }
    let result: Record<string, unknown> = {};
    seen.set(entry, result);
    Object.entries(entry).forEach(([key, nested]) => {
      result[key] = visit(nested);
    });
    return result;
  };

  return visit(value) as Value;
};

export class SlateContext<ConfigType extends {}, AuthType extends {}, InputType extends {}> {
  #config: ConfigType;
  #input: InputType;
  #auth: AuthType;
  #httpTraces: SlateHttpTrace[] = [];
  #scopedSecrets: Record<string, SlateScopedSecret> = {};
  #scopedSecretValues: string[] = [];
  #networkEgress: 'default' | 'deny_all';
  #abortSignal?: AbortSignal;
  #sideEffects: 'default' | 'deny_all';
  #redactionPolicy: ConfigRedactionPolicy;
  #receiverCallback:
    | Readonly<{
        url: string;
        secrets: Readonly<Record<string, Readonly<{ value: string; version: number }>>>;
      }>
    | undefined;

  constructor(
    config: ConfigType,
    input: InputType,
    auth: AuthType,
    private readonly spec: SlateSpecification<ConfigType, AuthType>,
    private readonly logger: SlateLogger,
    security: SlateContextSecurity = {}
  ) {
    this.#config = config;
    this.#input = input;
    this.#auth = auth;
    this.#scopedSecrets = Object.fromEntries(
      Object.entries(security.secrets ?? {}).map(([name, secret]) => [
        name,
        Object.freeze({ value: secret.value, version: secret.version })
      ])
    );
    this.#scopedSecretValues = [
      ...Object.values(this.#scopedSecrets).map(secret => secret.value),
      ...(security.redactionSentinels ?? [])
    ].filter(value => value.length > 0);
    this.#networkEgress = security.networkEgress ?? 'default';
    this.#abortSignal = security.abortSignal;
    this.#sideEffects = security.sideEffects ?? 'default';
    this.#receiverCallback = security.receiverCallback
      ? Object.freeze({
          url: security.receiverCallback.url,
          secrets: Object.freeze(
            Object.fromEntries(
              Object.entries(security.receiverCallback.secrets).map(([name, secret]) => [
                name,
                Object.freeze({ value: secret.value, version: secret.version })
              ])
            )
          )
        })
      : undefined;
    if (this.#receiverCallback) {
      this.#scopedSecretValues.push(
        this.#receiverCallback.url,
        ...Object.values(this.#receiverCallback.secrets).map(secret => secret.value)
      );
    }
    let configWireSchema = (this.spec as any)?.config?.wireSchema;
    this.#redactionPolicy = compileConfigRedactionPolicy(
      configWireSchema?.version === 2 ? configWireSchema : undefined
    );
  }

  get specification() {
    return this.spec;
  }

  get config() {
    return Object.freeze(this.#config);
  }

  get input() {
    return Object.freeze(this.#input);
  }

  get event() {
    return Object.freeze(this.#input);
  }

  get state() {
    return Object.freeze((this.#input as any).state) as 'state' extends keyof InputType
      ? InputType['state']
      : never;
  }

  get request() {
    return Object.freeze((this.#input as any).request) as 'request' extends keyof InputType
      ? InputType['request']
      : never;
  }

  get registrationDetails() {
    return Object.freeze(
      (this.#input as any).registrationDetails
    ) as 'registrationDetails' extends keyof InputType
      ? InputType['registrationDetails']
      : never;
  }

  get auth() {
    return Object.freeze(this.#auth);
  }

  /** The immutable, operation-scoped projection redeemed for this one request. */
  get secrets(): SlateScopedSecrets {
    return Object.freeze({ ...this.#scopedSecrets });
  }

  get networkEgress() {
    return this.#networkEgress;
  }

  /** Cancellation for a bounded scoped invocation. Providers must stop promptly when aborted. */
  get abortSignal() {
    return this.#abortSignal;
  }

  /** Scoped verification/mapping contexts expose no event, mapping, or mutation authority. */
  get sideEffects() {
    return this.#sideEffects;
  }

  /** One-use receiver binding derived by the trusted Hub path, never ordinary tool input. */
  get receiverCallback() {
    return this.#receiverCallback;
  }

  /** Provider-handler calls this from a terminal finally block on every outcome. */
  clearScopedInvocation() {
    Object.keys(this.#scopedSecrets).forEach(name => delete this.#scopedSecrets[name]);
    this.#scopedSecretValues = [];
    this.#receiverCallback = undefined;
  }

  recordHttpTrace(trace: SlateHttpTrace) {
    this.#httpTraces.push(
      this.#redactionPolicy.redact(redactExactValues(trace, this.#scopedSecretValues))
    );
  }

  getHttpTraces() {
    return this.#httpTraces.map(trace => ({
      ...trace,
      request: {
        ...trace.request,
        ...(trace.request.headers ? { headers: { ...trace.request.headers } } : {}),
        ...(trace.request.body ? { body: { ...trace.request.body } } : {})
      },
      ...(trace.response
        ? {
            response: {
              ...trace.response,
              ...(trace.response.headers ? { headers: { ...trace.response.headers } } : {}),
              ...(trace.response.body ? { body: { ...trace.response.body } } : {})
            }
          }
        : {}),
      ...(trace.error ? { error: { ...trace.error } } : {})
    }));
  }

  info(message: SlateLogMessageInput) {
    this.logger.info(
      this.#redactionPolicy.redact(redactExactValues(message, this.#scopedSecretValues))
    );
  }

  warn(message: SlateLogMessageInput) {
    this.logger.warn(
      this.#redactionPolicy.redact(redactExactValues(message, this.#scopedSecretValues))
    );
  }

  error(message: SlateLogMessageInput) {
    this.logger.error(
      this.#redactionPolicy.redact(redactExactValues(message, this.#scopedSecretValues))
    );
  }

  progress(message: SlateLogMessageInput) {
    this.logger.progress(
      this.#redactionPolicy.redact(redactExactValues(message, this.#scopedSecretValues))
    );
  }
}
