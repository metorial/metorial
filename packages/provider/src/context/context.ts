import type { SlateHttpTrace } from '../axios/trace';
import type { SlateLogger, SlateLogMessageInput } from '../logger';
import type { SlateSpecification } from '../specification/specification';

export type SlateScopedSecret = Readonly<{ value: string }>;
export type SlateScopedSecrets = Readonly<Record<string, SlateScopedSecret>>;

export interface SlateContextSecurity {
  secrets?: Record<string, { value: string }>;
  /** Exact primitive values that must be removed from logs and traces. */
  redactionSentinels?: readonly string[];
  networkEgress?: 'default' | 'deny_all';
  abortSignal?: AbortSignal;
  sideEffects?: 'default' | 'deny_all';
  receiverCallback?: Readonly<{
    url: string;
    secrets: Readonly<Record<string, { value: string }>>;
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

export class SlatePublicContext<InputType extends {}> {
  #input: InputType;
  #httpTraces: SlateHttpTrace[] = [];

  constructor(
    input: InputType,
    private readonly spec: SlateSpecification<any, any>,
    private readonly logger: SlateLogger,
    private readonly redactionSentinels: readonly string[] = []
  ) {
    this.#input = input;
  }

  get specification() {
    return this.spec;
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

  recordHttpTrace(trace: SlateHttpTrace) {
    this.#httpTraces.push(redactExactValues(trace, this.redactionSentinels));
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
    this.logger.info(redactExactValues(message, this.redactionSentinels));
  }

  warn(message: SlateLogMessageInput) {
    this.logger.warn(redactExactValues(message, this.redactionSentinels));
  }

  error(message: SlateLogMessageInput) {
    this.logger.error(redactExactValues(message, this.redactionSentinels));
  }

  progress(message: SlateLogMessageInput) {
    this.logger.progress(redactExactValues(message, this.redactionSentinels));
  }
}

export class SlateContext<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
> extends SlatePublicContext<InputType> {
  #config: ConfigType;
  #auth: AuthType;
  #scopedSecrets: Record<string, SlateScopedSecret>;
  #scopedSecretValues: string[];
  #networkEgress: 'default' | 'deny_all';
  #abortSignal?: AbortSignal;
  #sideEffects: 'default' | 'deny_all';
  #receiverCallback:
    | Readonly<{
        url: string;
        secrets: Readonly<Record<string, SlateScopedSecret>>;
      }>
    | undefined;

  constructor(
    config: ConfigType,
    input: InputType,
    auth: AuthType,
    spec: SlateSpecification<ConfigType, AuthType>,
    logger: SlateLogger,
    security: SlateContextSecurity = {}
  ) {
    let scopedSecrets = Object.fromEntries(
      Object.entries(security.secrets ?? {}).map(([name, secret]) => [
        name,
        Object.freeze({ value: secret.value })
      ])
    );
    let receiverCallback = security.receiverCallback
      ? Object.freeze({
          url: security.receiverCallback.url,
          secrets: Object.freeze(
            Object.fromEntries(
              Object.entries(security.receiverCallback.secrets).map(([name, secret]) => [
                name,
                Object.freeze({ value: secret.value })
              ])
            )
          )
        })
      : undefined;
    let scopedSecretValues = [
      ...Object.values(scopedSecrets).map(secret => secret.value),
      ...(security.redactionSentinels ?? []),
      ...(receiverCallback
        ? [
            receiverCallback.url,
            ...Object.values(receiverCallback.secrets).map(secret => secret.value)
          ]
        : [])
    ].filter(value => value.length > 0);

    super(input, spec, logger, scopedSecretValues);
    this.#config = config;
    this.#auth = auth;
    this.#scopedSecrets = scopedSecrets;
    this.#scopedSecretValues = scopedSecretValues;
    this.#networkEgress = security.networkEgress ?? 'default';
    this.#abortSignal = security.abortSignal;
    this.#sideEffects = security.sideEffects ?? 'default';
    this.#receiverCallback = receiverCallback;
  }

  get config() {
    return Object.freeze(this.#config);
  }

  get auth() {
    return Object.freeze(this.#auth);
  }

  get secrets(): SlateScopedSecrets {
    return Object.freeze({ ...this.#scopedSecrets });
  }

  get networkEgress() {
    return this.#networkEgress;
  }

  get abortSignal() {
    return this.#abortSignal;
  }

  get sideEffects() {
    return this.#sideEffects;
  }

  get receiverCallback() {
    return this.#receiverCallback;
  }

  clearScopedInvocation() {
    Object.keys(this.#scopedSecrets).forEach(name => delete this.#scopedSecrets[name]);
    this.#scopedSecretValues.fill('');
    this.#scopedSecretValues.length = 0;
    this.#receiverCallback = undefined;
  }
}
