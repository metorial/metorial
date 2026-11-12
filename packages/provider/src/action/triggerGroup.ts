import { z } from 'zod';
import type { SlateContext } from '../context';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from '../specification/specification';
import type { SlateWebhookHttpResponseInit } from './action';

export let SlateDefaultPollingIntervalSeconds = 60 * 10;

export type SlateTriggerRoutingMatcher = Record<string, any>;

export type SlateTriggerGroupSelection = Record<string, any>;

export let slateGooglePubSubProducts = ['gmail', 'forms', 'meet', 'storage'] as const;

export type SlateGooglePubSubProduct = (typeof slateGooglePubSubProducts)[number];

export interface SlateGooglePubSubCapability {
  product: SlateGooglePubSubProduct;
}

export interface SlateGooglePubSubInfrastructure {
  projectId: string;
  topicName: string;
  subscriptionName: string;
  pushServiceAccountEmail: string;
  audience: string;
}

/** Nonsecret delivery infrastructure the runtime supplies from a saved delivery config. */
export interface SlateTriggerGroupInfrastructure {
  googlePubSub: SlateGooglePubSubInfrastructure;
}

export type SlateWebhookTargetOwnership = 'single_user' | 'multi_user';

export interface SlateWebhookTarget {
  webhookTargetIdentifier: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  webhookTargetPayload: any;
  targetOwnership: SlateWebhookTargetOwnership;
}

export type SlateTriggerGroupRoutingMatchersHandler<
  ConfigType extends {},
  AuthType extends {}
> = (context: SlateContext<ConfigType, AuthType, {}>) => Promise<SlateTriggerRoutingMatcher[]>;

export type SlateTriggerGroupPollHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { state: any | null; selection?: SlateTriggerGroupSelection }
  >
) => Promise<{
  events: { payload: any; idempotencyKey?: string }[];
  updatedState?: any;
}>;

export interface SlateGatewayEvent {
  payload: any;
  idempotencyKey?: string;
}

export type SlateTriggerGroupGatewayConnectHandler<
  ConfigType extends {},
  AuthType extends {}
> = (
  context: SlateContext<ConfigType, AuthType, { state: any | null }>
) => Promise<{ url: string; state?: any }>;

/** `closed` is set, with no frames, when the socket closed unexpectedly. */
export type SlateTriggerGroupGatewayReceiveHandler<
  ConfigType extends {},
  AuthType extends {}
> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { state: any | null; frames: string[]; closed?: { code: number; reason: string } | null }
  >
) => Promise<{
  state?: any;
  send?: string[];
  events?: SlateGatewayEvent[];
  /** With `expectsAck`, the hub reconnects when no `heartbeatAcked` arrives before the next beat. */
  heartbeat?: { intervalMs: number; frame: string; expectsAck?: boolean } | null;
  /** Set when `frames` included the provider's heartbeat acknowledgement. */
  heartbeatAcked?: boolean;
  close?: { reconnect: boolean; reason?: string } | null;
}>;

export type SlateWebhookTargetListHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { pageToken: any | null; selection?: SlateTriggerGroupSelection }
  >
) => Promise<{
  targets: SlateWebhookTarget[];
  nextPageToken: any | null;
  // Set when targets were skipped for a limit rather than exhausted by pagination.
  isPartial?: boolean;
}>;

export type SlateWebhookRegisterHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    {
      webhookTargetIdentifier: string;
      webhookTargetPayload: any;
      webhookUrl: string;
      operationId?: string;
      selection?: SlateTriggerGroupSelection;
      infrastructure?: SlateTriggerGroupInfrastructure;
    }
  >
) => Promise<SlateWebhookRegistrationResult>;

export interface SlateWebhookRegistrationResult {
  webhookRegistrationIdentifier: string;
  webhookRegistrationPayload: any;
  expiresAt?: string | null;
  renewAfter?: string | null;
  /** Identities of this registration on a delivery channel shared with other registrations. */
  routingKeys?: string[];
}

export type SlateWebhookRenewHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    {
      webhookRegistrationIdentifier: string;
      webhookRegistrationPayload: any;
      webhookUrl: string;
      webhookTargetIdentifier: string;
      webhookTargetPayload: any;
      operationId: string;
      selection?: SlateTriggerGroupSelection;
      infrastructure?: SlateTriggerGroupInfrastructure;
    }
  >
) => Promise<SlateWebhookRegistrationResult>;

export type SlateWebhookExpandHandler<ConfigType extends {}, AuthType extends {}> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    {
      payload: unknown | null;
      state: any | null;
      selection?: SlateTriggerGroupSelection;
      deliveryId: string;
      webhookRegistrationPayload: any;
    }
  >
) => Promise<{
  events: { payload: any; idempotencyKey?: string }[];
  updatedState?: any;
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

export type SlateWebhookManualSetupHandler<
  FullConfigSchema extends z.ZodType<any> = z.ZodType<any>
> = (context: SlateContext<{}, {}, { webhookUrl: string }>) => Promise<{
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
  skipped?: SlateWebhookSkipped;
}>;

export interface SlateWebhookSkipped {
  reason: string;
}

export interface SlateTriggerGroupPollingParameters<
  ConfigType extends {},
  AuthType extends {}
> {
  intervalSeconds: number;
  pollEvents: SlateTriggerGroupPollHandler<ConfigType, AuthType>;
}

export interface SlateTriggerGroupGatewayParameters<
  ConfigType extends {},
  AuthType extends {}
> {
  connect: SlateTriggerGroupGatewayConnectHandler<ConfigType, AuthType>;
  receive: SlateTriggerGroupGatewayReceiveHandler<ConfigType, AuthType>;
}

export interface SlateTriggerGroupWebhookAutoRegistrationParameters<
  ConfigType extends {},
  AuthType extends {}
> {
  webhookTargetList: SlateWebhookTargetListHandler<ConfigType, AuthType>;
  webhookRegister: SlateWebhookRegisterHandler<ConfigType, AuthType>;
  webhookRenew?: SlateWebhookRenewHandler<ConfigType, AuthType>;
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

/** A delivery setup a person completes once for an automatically registered group. */
export type SlateTriggerGroupWebhookDeliveryConfigParameters<
  UserConfigSchema extends z.ZodType<any> = z.ZodType<any>,
  FullConfigSchema extends z.ZodType<any> = z.ZodType<any>
> = SlateTriggerGroupWebhookManualRegistrationParameters<
  UserConfigSchema,
  FullConfigSchema
> & {
  finish: SlateWebhookManualFinishHandler<UserConfigSchema, FullConfigSchema>;
};

export interface SlateTriggerGroupWebhookParameters<
  ConfigType extends {},
  AuthType extends {}
> {
  autoRegistration?: SlateTriggerGroupWebhookAutoRegistrationParameters<ConfigType, AuthType>;
  manualRegistration?: SlateTriggerGroupWebhookManualRegistrationParameters<any, any>;
  deliveryConfig?: SlateTriggerGroupWebhookDeliveryConfigParameters<any, any>;
  process: SlateWebhookProcessHandler;
  expandWebhook?: SlateWebhookExpandHandler<ConfigType, AuthType>;
  reconcileIntervalSeconds?: number;
  googlePubSub?: SlateGooglePubSubCapability;
}

export interface SlateTriggerGroupCreateParameters<
  InputType extends {} = Record<string, unknown>
> {
  key: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  eventSchema?: z.ZodType<InputType>;
  selectionSchema?: z.ZodType<SlateTriggerGroupSelection>;
}

export interface SlateTriggerGroupParameters<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {} = Record<string, unknown>
> extends SlateTriggerGroupCreateParameters<InputType> {
  source: 'polling' | 'webhook' | 'gateway';
  polling?: SlateTriggerGroupPollingParameters<ConfigType, AuthType>;
  webhook?: SlateTriggerGroupWebhookParameters<ConfigType, AuthType>;
  gateway?: SlateTriggerGroupGatewayParameters<ConfigType, AuthType>;
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

  static create<
    ConfigType extends {},
    AuthType extends {},
    InputType extends {} = Record<string, unknown>
  >(
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

  get selectionSchema() {
    return this._params.selectionSchema;
  }

  get polling() {
    return this._params.polling;
  }

  get webhook() {
    return this._params.webhook;
  }

  get gateway() {
    return this._params.gateway;
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
  #source: 'polling' | 'webhook' | 'gateway' | null = null;
  #polling: SlateTriggerGroupPollingParameters<ConfigType, AuthType> | null = null;
  #webhook: SlateTriggerGroupWebhookParameters<ConfigType, AuthType> | null = null;
  #gateway: SlateTriggerGroupGatewayParameters<ConfigType, AuthType> | null = null;
  #routingMatchers: SlateTriggerGroupRoutingMatchersHandler<ConfigType, AuthType> | null =
    null;

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
    autoRegistration?: SlateTriggerGroupWebhookAutoRegistrationParameters<
      ConfigType,
      AuthType
    >;
    manualRegistration?: SlateTriggerGroupWebhookManualRegistrationParameters<
      UserConfigSchema,
      FullConfigSchema
    >;
    deliveryConfig?: SlateTriggerGroupWebhookDeliveryConfigParameters<
      UserConfigSchema,
      FullConfigSchema
    >;
    process: SlateWebhookProcessHandler;
    expandWebhook?: SlateWebhookExpandHandler<ConfigType, AuthType>;
    reconcileIntervalSeconds?: number;
    googlePubSub?: SlateGooglePubSubCapability;
  }): SlateTriggerGroupBuilder<ConfigType, AuthType, InputType> {
    if (this.#source) {
      throw new SlateDeclarationError('Trigger group invocation is already defined');
    }

    if (!!props.autoRegistration === !!props.manualRegistration) {
      throw new SlateDeclarationError(
        'Webhook trigger groups require exactly one of autoRegistration or manualRegistration'
      );
    }

    if (props.deliveryConfig !== undefined) {
      if (!props.autoRegistration) {
        throw new SlateDeclarationError(
          'A webhook delivery config requires automatic webhook registration'
        );
      }
      if (!props.deliveryConfig.finish) {
        throw new SlateDeclarationError('A webhook delivery config requires a finish handler');
      }
    }

    if (props.reconcileIntervalSeconds !== undefined) {
      if (
        !Number.isSafeInteger(props.reconcileIntervalSeconds) ||
        props.reconcileIntervalSeconds < 900
      ) {
        throw new SlateDeclarationError(
          'Webhook reconciliation interval must be an integer of at least 900 seconds'
        );
      }
      if (!props.expandWebhook) {
        throw new SlateDeclarationError(
          'Webhook reconciliation requires an expandWebhook handler'
        );
      }
    }

    if (props.googlePubSub !== undefined) {
      let capability = z
        .strictObject({ product: z.enum(slateGooglePubSubProducts) })
        .safeParse(props.googlePubSub);
      if (!capability.success || !props.autoRegistration || !props.deliveryConfig) {
        throw new SlateDeclarationError(
          'Google Pub/Sub delivery requires a supported product, automatic webhook registration, and a delivery config'
        );
      }
    }

    this.#source = 'webhook';
    this.#webhook = {
      autoRegistration: props.autoRegistration,
      manualRegistration: props.manualRegistration,
      deliveryConfig: props.deliveryConfig,
      process: props.process,
      expandWebhook: props.expandWebhook,
      reconcileIntervalSeconds: props.reconcileIntervalSeconds,
      googlePubSub: props.googlePubSub
    };

    return this;
  }

  /** Receive events over a platform-managed persistent connection (e.g. a WebSocket gateway). */
  gateway(
    props: SlateTriggerGroupGatewayParameters<ConfigType, AuthType>
  ): SlateTriggerGroupBuilder<ConfigType, AuthType, InputType> {
    if (this.#source) {
      throw new SlateDeclarationError('Trigger group invocation is already defined');
    }

    this.#source = 'gateway';
    this.#gateway = { connect: props.connect, receive: props.receive };

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
        'Trigger group invocation (polling, webhook, or gateway) is not defined'
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
      gateway: this.#gateway ?? undefined,
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
