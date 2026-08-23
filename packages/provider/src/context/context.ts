import type { SlateHttpTrace } from '../axios/trace';
import type { SlateLogger, SlateLogMessageInput } from '../logger';
import type { SlateSpecification } from '../specification/specification';

export class SlatePublicContext<InputType extends {}> {
  #input: InputType;
  #httpTraces: SlateHttpTrace[] = [];

  constructor(
    input: InputType,
    private readonly spec: SlateSpecification<any, any>,
    private readonly logger: SlateLogger
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
    this.#httpTraces.push(trace);
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
    this.logger.info(message);
  }

  warn(message: SlateLogMessageInput) {
    this.logger.warn(message);
  }

  error(message: SlateLogMessageInput) {
    this.logger.error(message);
  }

  progress(message: SlateLogMessageInput) {
    this.logger.progress(message);
  }
}

export class SlateContext<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
> extends SlatePublicContext<InputType> {
  #config: ConfigType;
  #auth: AuthType;

  constructor(
    config: ConfigType,
    input: InputType,
    auth: AuthType,
    spec: SlateSpecification<ConfigType, AuthType>,
    logger: SlateLogger
  ) {
    super(input, spec, logger);
    this.#config = config;
    this.#auth = auth;
  }

  get config() {
    return Object.freeze(this.#config);
  }

  get auth() {
    return Object.freeze(this.#auth);
  }
}
