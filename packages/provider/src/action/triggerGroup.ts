import { z } from 'zod';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from '../specification/specification';
import type { SlateContext } from '../context';
import type { SlateWebhookHttpResponseInit } from './action';

export let SlateDefaultPollingIntervalSeconds = 60 * 10;

export type SlateTriggerRoutingMatcher = Record<string, any>;

export type SlateWebhookTargetOwnership = 'single_user' | 'multi_user';

export interface SlateWebhookTarget {
  webhookTargetIdentifier: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  webhookTargetPayload: any;
  targetOwnership: SlateWebhookTargetOwnership;
}

export type SlateTriggerGroupRoutingMatchersHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<ConfigType, AuthType, {}>
) => Promise<SlateTriggerRoutingMatcher[]>;

export type SlateTriggerGroupPollHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<ConfigType, AuthType, { state: any | null }>
) => Promise<{
  events: { payload: any; idempotencyKey?: string }[];
  updatedState?: any;
}>;

export type SlateWebhookTargetListHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<ConfigType, AuthType, { pageToken: any | null }>
) => Promise<{
  targets: SlateWebhookTarget[];
  nextPageToken: any | null;
}>;

export type SlateWebhookRegisterHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    {
      webhookTargetIdentifier: string;
      webhookTargetPayload: any;
      webhookUrl: string;
    }
  >
) => Promise<{
  webhookRegistrationIdentifier: string;
  webhookRegistrationPayload: any;
}>;

export type SlateWebhookUnregisterHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    {
      webhookRegistrationIdentifier: string;
      webhookRegistrationPayload: any;
    }
  >
) => Promise<unknown>;

export type SlateWebhookManualSetupHandler<FullConfigSchema extends z.ZodType<any> = z.ZodType<any>> =
  (
    context: SlateContext<{}, {}, { webhookUrl: string }>
  ) => Promise<{
    webhookSetupDocument: string;
    partialWebhookRegistrationPayload: Partial<z.infer<FullConfigSchema>>;
  }>;

export type SlateWebhookManualFinishHandler<
  UserConfigSchema extends z.ZodType<any> = z.ZodType<any>,
  FullConfigSchema extends z.ZodType<any> = z.ZodType<any>
> = (
  context: SlateContext<
    {},
    {},
    {
      webhookUrl: string;
      partialWebhookRegistrationPayload: Partial<z.infer<FullConfigSchema>>;
      userWebhookRegistrationPayload: z.infer<UserConfigSchema>;
    }
  >
) => Promise<{
  webhookRegistrationPayload: z.infer<FullConfigSchema>;
}>;

export type SlateWebhookProcessHandler = (
  context: SlateContext<
    {},
    {},
    {
      request: Request;
      webhookRegistrationPayload: any;
    }
  >
) => Promise<{
  events: {
    matchers: SlateTriggerRoutingMatcher[];
    payload: any;
    idempotencyKey?: string;
  }[];
  response?: Response | SlateWebhookHttpResponseInit;
}>;

export interface SlateTriggerGroupPollingParameters<ConfigType extends {}, AuthType extends {}> {
  intervalSeconds: number;
  pollEvents: SlateTriggerGroupPollHandler<ConfigType, AuthType>;
}

export interface SlateTriggerGroupWebhookAutoRegistrationParameters<
  ConfigType extends {},
  AuthType extends {}
> {
  webhookTargetList: SlateWebhookTargetListHandler<ConfigType, AuthType>;
  webhookRegister: SlateWebhookRegisterHandler<ConfigType, AuthType>;
  webhookUnregister: SlateWebhookUnregisterHandler<ConfigType, AuthType>;
}

export interface SlateTriggerGroupWebhookManualRegistrationParameters<
  UserConfigSchema extends z.ZodType<any> = z.ZodType<any>,
  FullConfigSchema extends z.ZodType<any> = z.ZodType<any>
> {
  userConfigSchema: UserConfigSchema;
  fullConfigSchema: FullConfigSchema;
  setup: SlateWebhookManualSetupHandler<FullConfigSchema>;
  finish?: SlateWebhookManualFinishHandler<UserConfigSchema, FullConfigSchema>;
}

export interface SlateTriggerGroupWebhookParameters<ConfigType extends {}, AuthType extends {}> {
  autoRegistration?: SlateTriggerGroupWebhookAutoRegistrationParameters<ConfigType, AuthType>;
  manualRegistration?: SlateTriggerGroupWebhookManualRegistrationParameters<any, any>;
  process: SlateWebhookProcessHandler;
}

export interface SlateTriggerGroupCreateParameters<InputType extends {} = Record<string, unknown>> {
  key: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  eventSchema?: z.ZodType<InputType>;
}

export interface SlateTriggerGroupParameters<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {} = Record<string, unknown>
> extends SlateTriggerGroupCreateParameters<InputType> {
  source: 'polling' | 'webhook';
  polling?: SlateTriggerGroupPollingParameters<ConfigType, AuthType>;
  webhook?: SlateTriggerGroupWebhookParameters<ConfigType, AuthType>;
  routingMatchers: SlateTriggerGroupRoutingMatchersHandler<ConfigType, AuthType>;
}

export class SlateTriggerGroup<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {} = Record<string, unknown>
> {
  private constructor(
    private readonly _spec: SlateSpecification<ConfigType, AuthType>,
    private readonly _params: SlateTriggerGroupParameters<ConfigType, AuthType, InputType>
  ) {}

  static create<ConfigType extends {}, AuthType extends {}, InputType extends {} = Record<string, unknown>>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateTriggerGroupCreateParameters<InputType>
  ) {
    return new SlateTriggerGroupBuilder(spec, params, p => new SlateTriggerGroup(spec, p));
  }

  get spec() {
    return this._spec;
  }

  get key() {
    return this._params.key;
  }

  get name() {
    return this._params.name;
  }

  get description() {
    return this._params.description;
  }

  get metadata() {
    return this._params.metadata;
  }

  get eventSchema() {
    return this._params.eventSchema ?? (z.object({}).passthrough() as z.ZodType<InputType>);
  }

  get source() {
    return this._params.source;
  }

  get polling() {
    return this._params.polling;
  }

  get webhook() {
    return this._params.webhook;
  }

  get routingMatchers() {
    return this._params.routingMatchers;
  }
}

export class SlateTriggerGroupBuilder<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {} = Record<string, unknown>
> {
  #source: 'polling' | 'webhook' | null = null;
  #polling: SlateTriggerGroupPollingParameters<ConfigType, AuthType> | null = null;
  #webhook: SlateTriggerGroupWebhookParameters<ConfigType, AuthType> | null = null;
  #routingMatchers: SlateTriggerGroupRoutingMatchersHandler<ConfigType, AuthType> | null = null;

  constructor(
    private readonly spec: SlateSpecification<ConfigType, AuthType>,
    private readonly params: SlateTriggerGroupCreateParameters<InputType>,
    private readonly factory: (
      params: SlateTriggerGroupParameters<ConfigType, AuthType, InputType>
    ) => SlateTriggerGroup<ConfigType, AuthType, InputType>
  ) {}

  polling(props: {
    intervalSeconds?: number;
    pollEvents: SlateTriggerGroupPollHandler<ConfigType, AuthType>;
  }): SlateTriggerGroupBuilder<ConfigType, AuthType, InputType> {
    if (this.#source) {
      throw new SlateDeclarationError('Trigger group invocation is already defined');
    }

    this.#source = 'polling';
    this.#polling = {
      intervalSeconds: props.intervalSeconds ?? SlateDefaultPollingIntervalSeconds,
      pollEvents: props.pollEvents
    };

    return this;
  }

  webhook<
    UserConfigSchema extends z.ZodType<any> = z.ZodType<any>,
    FullConfigSchema extends z.ZodType<any> = z.ZodType<any>
  >(props: {
    autoRegistration?: SlateTriggerGroupWebhookAutoRegistrationParameters<ConfigType, AuthType>;
    manualRegistration?: SlateTriggerGroupWebhookManualRegistrationParameters<
      UserConfigSchema,
      FullConfigSchema
    >;
    process: SlateWebhookProcessHandler;
  }): SlateTriggerGroupBuilder<ConfigType, AuthType, InputType> {
    if (this.#source) {
      throw new SlateDeclarationError('Trigger group invocation is already defined');
    }

    if (!!props.autoRegistration === !!props.manualRegistration) {
      throw new SlateDeclarationError(
        'Webhook trigger groups require exactly one of autoRegistration or manualRegistration'
      );
    }

    this.#source = 'webhook';
    this.#webhook = {
      autoRegistration: props.autoRegistration,
      manualRegistration: props.manualRegistration,
      process: props.process
    };

    return this;
  }

  routingMatchers(
    handler: SlateTriggerGroupRoutingMatchersHandler<ConfigType, AuthType>
  ): SlateTriggerGroupBuilder<ConfigType, AuthType, InputType> {
    this.#routingMatchers = handler;
    return this;
  }

  build(): SlateTriggerGroup<ConfigType, AuthType, InputType> {
    if (!this.#source) {
      throw new SlateDeclarationError(
        'Trigger group invocation (polling or webhook) is not defined'
      );
    }
    if (!this.#routingMatchers) {
      throw new SlateDeclarationError('Trigger group routing matchers handler is not defined');
    }

    return this.factory({
      ...this.params,
      source: this.#source,
      polling: this.#polling ?? undefined,
      webhook: this.#webhook ?? undefined,
      routingMatchers: this.#routingMatchers
    });
  }
}

export let triggerGroup = <
  ConfigType extends {},
  AuthType extends {},
  InputType extends {} = Record<string, unknown>
>(
  spec: SlateSpecification<ConfigType, AuthType>,
  params: SlateTriggerGroupCreateParameters<InputType>
) => SlateTriggerGroup.create(spec, params);
