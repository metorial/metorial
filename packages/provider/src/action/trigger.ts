import type z from 'zod';
import type { SlateSpecification } from '../specification/specification';
import {
  SlateAction,
  type SlateActionParameters,
  type SlatePollingOptions,
  type SlateTriggerMappingHandler,
  type SlateTriggerPollingHandler,
  type SlateTriggerWebhookAutoRegistrationHandler,
  type SlateTriggerWebhookAutoUnregistrationHandler,
  type SlateTriggerWebhookRequestHandler
} from './action';
import { SlateActionBuilder } from './builder';

export let SlateDefaultPollingIntervalSeconds = 60 * 10;

export interface SlateTriggerParameters<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {
    type: string;
  }
> extends SlateActionParameters {
  type: 'trigger';
  source: 'polling' | 'webhook';
  polling?: SlatePollingOptions;
  handleEvent: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
  handleRequest?: SlateTriggerWebhookRequestHandler<ConfigType, AuthType, InputType>;
  pollEvents?: SlateTriggerPollingHandler<ConfigType, AuthType, InputType>;
  autoRegisterWebhook?: SlateTriggerWebhookAutoRegistrationHandler<ConfigType, AuthType>;
  autoUnregisterWebhook?: SlateTriggerWebhookAutoUnregistrationHandler<ConfigType, AuthType>;
}

export class SlateTrigger<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {
    type: string;
  }
> extends SlateAction<'trigger', ConfigType, AuthType, InputType, OutputType> {
  #source: 'polling' | 'webhook';
  #polling: SlatePollingOptions;
  #handleEvent: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
  #handleRequest?: SlateTriggerWebhookRequestHandler<ConfigType, AuthType, InputType>;
  #pollEvents?: SlateTriggerPollingHandler<ConfigType, AuthType, InputType>;
  #autoRegisterWebhook?: SlateTriggerWebhookAutoRegistrationHandler<ConfigType, AuthType>;
  #autoUnregisterWebhook?: SlateTriggerWebhookAutoUnregistrationHandler<ConfigType, AuthType>;

  private constructor(
    spec: SlateSpecification<ConfigType, AuthType>,
    inputSchema: z.ZodType<InputType>,
    outputSchema: z.ZodType<OutputType>,
    params: SlateTriggerParameters<ConfigType, AuthType, InputType, OutputType>
  ) {
    super('trigger', spec, inputSchema, outputSchema, params);

    this.#source = params.source;
    this.#polling = params.polling || {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    };
    this.#handleEvent = params.handleEvent;
    this.#handleRequest = params.handleRequest;
    this.#pollEvents = params.pollEvents;
    this.#autoRegisterWebhook = params.autoRegisterWebhook;
    this.#autoUnregisterWebhook = params.autoUnregisterWebhook;
  }

  static create<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateActionParameters
  ) {
    return new SlateActionBuilder('trigger', spec, params, params => {
      if (params.type !== 'trigger') throw new Error('Invalid action type for trigger');
      return new SlateTrigger(spec, params.inputSchema, params.outputSchema, params);
    });
  }

  get polling() {
    return this.#polling;
  }

  get source() {
    return this.#source;
  }

  get handleEvent() {
    return this.#handleEvent;
  }

  get handleRequest() {
    return this.#handleRequest;
  }

  get pollEvents() {
    return this.#pollEvents;
  }

  get autoRegisterWebhook() {
    return this.#autoRegisterWebhook;
  }

  get autoUnregisterWebhook() {
    return this.#autoUnregisterWebhook;
  }
}

export let trigger = <ConfigType extends {}, AuthType extends {}>(
  spec: SlateSpecification<ConfigType, AuthType>,
  params: SlateActionParameters
) => SlateTrigger.create(spec, params);
