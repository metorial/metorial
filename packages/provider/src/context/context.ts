import type { SlateHttpTrace } from '../axios/trace';
import type { SlateLogger, SlateLogMessageInput } from '../logger';
import type { SlateSpecification } from '../specification/specification';

export class SlateContext<ConfigType extends {}, AuthType extends {}, InputType extends {}> {
  #config: ConfigType;
  #input: InputType;
  #auth: AuthType;
  #httpTraces: SlateHttpTrace[] = [];

  constructor(
    config: ConfigType,
    input: InputType,
    auth: AuthType,
    private readonly spec: SlateSpecification<ConfigType, AuthType>,
    private readonly logger: SlateLogger
  ) {
    this.#config = config;
    this.#input = input;
    this.#auth = auth;
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

  get auth() {
    return Object.freeze(this.#auth);
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
