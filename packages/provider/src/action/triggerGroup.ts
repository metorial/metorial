import { z } from 'zod';
import type { SlateContext } from '../context';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from '../specification/specification';
import type { SlateWebhookHttpResponseInit } from './action';
import type { SlateOptionListPage } from './optionList';

export let SlateDefaultPollingIntervalSeconds = 60 * 10;

export type SlateTriggerRoutingMatcher = Record<string, any>;

export type SlateTriggerGroupSelection = Record<string, any>;

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

/** Lists the values an account can pick for one selection field. `selection` holds what is entered so far and may be incomplete. */
export type SlateTriggerGroupSelectionOptionsHandler<
  ConfigType extends {},
  AuthType extends {}
> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { query: string | null; pageToken: any | null; selection: SlateTriggerGroupSelection }
  >
) => Promise<SlateOptionListPage>;

/** An option list exported by another integration, run with that integration's connection for the same account. */
export interface SlateLinkedOptionList {
  /** Registry name of the integration, as `<scope>/<name>`. */
  slate: string;
  optionList: string;
  params?: Record<string, any>;
}

export interface SlateTriggerGroupSelectionOptionsSources<
  ConfigType extends {},
  AuthType extends {}
> {
  list?: SlateTriggerGroupSelectionOptionsHandler<ConfigType, AuthType>;
  linked?: SlateLinkedOptionList;
}

let LINKED_SLATE_PATTERN = /^[^/\s]+\/[^/\s]+$/;

let checkSelectionOptions = <ConfigType extends {}, AuthType extends {}>(
  field: string,
  sources: SlateTriggerGroupSelectionOptionsSources<ConfigType, AuthType>,
  shape: Record<string, unknown>
): SlateTriggerGroupSelectionOptionsSources<ConfigType, AuthType> => {
  if (!Object.hasOwn(shape, field)) {
    throw new SlateDeclarationError(
      `Selection field "${field}" is not a top-level property of the selection schema`
    );
  }
  if (typeof sources !== 'object' || sources === null) {
    throw new SlateDeclarationError(
      `Selection field "${field}" must be declared as { list, linked }`
    );
  }

  let { list, linked } = sources;
  if (!list && !linked) {
    throw new SlateDeclarationError(
      `Selection field "${field}" needs its own options list, a linked option list, or both`
    );
  }
  if (list !== undefined && typeof list !== 'function') {
    throw new SlateDeclarationError(`Selection field "${field}" list must be a function`);
  }
  if (linked) {
    if (typeof linked.slate !== 'string' || !LINKED_SLATE_PATTERN.test(linked.slate)) {
      throw new SlateDeclarationError(
        `Selection field "${field}" links to slate "${linked.slate}", which must be written as <scope>/<name>`
      );
    }
    if (typeof linked.optionList !== 'string' || !linked.optionList.trim()) {
      throw new SlateDeclarationError(
        `Selection field "${field}" must name the option list it links to`
      );
    }
  }

  return {
    ...(list ? { list } : {}),
    ...(linked ? { linked } : {})
  };
};

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
      deliveryConfig?: unknown;
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
      deliveryConfig?: unknown;
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

/**
 * Routing keys name the registrations a request addresses; an empty list acknowledges it
 * without handing it to any. A rejection answers the sender with its status.
 */
export type SlateWebhookDeliveryAuthentication =
  | { routingKeys: string[]; rejected?: undefined }
  | { rejected: { status: number }; routingKeys?: undefined };

export type SlateWebhookDeliveryAuthenticateHandler = (
  context: SlateContext<{}, {}, { request: Request; deliveryConfig: unknown }>
) => Promise<SlateWebhookDeliveryAuthentication>;

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
  authenticate: SlateWebhookDeliveryAuthenticateHandler;
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
  selectionOptions?: Record<
    string,
    SlateTriggerGroupSelectionOptionsSources<ConfigType, AuthType>
  >;
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

  get selectionOptions() {
    return this._params.selectionOptions ?? {};
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
  #selectionOptions: Record<
    string,
    SlateTriggerGroupSelectionOptionsSources<ConfigType, AuthType>
  > = {};

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
      if (!props.deliveryConfig.authenticate) {
        throw new SlateDeclarationError(
          'A webhook delivery config requires an authenticate handler'
        );
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

    this.#source = 'webhook';
    this.#webhook = {
      autoRegistration: props.autoRegistration,
      manualRegistration: props.manualRegistration,
      deliveryConfig: props.deliveryConfig,
      process: props.process,
      expandWebhook: props.expandWebhook,
      reconcileIntervalSeconds: props.reconcileIntervalSeconds
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

  /**
   * Lets the dashboard offer a list for these selection fields instead of a typed-in value.
   * Each field must be a top-level property of the selection schema, which must be a zod object.
   * For an array property the listed options are values for its items.
   */
  selectionOptions(
    declarations: Record<
      string,
      SlateTriggerGroupSelectionOptionsSources<ConfigType, AuthType>
    >
  ): SlateTriggerGroupBuilder<ConfigType, AuthType, InputType> {
    let schema = this.params.selectionSchema;
    if (!schema) {
      throw new SlateDeclarationError('Selection options require a selection schema');
    }
    if (schema._zod?.def?.type !== 'object') {
      throw new SlateDeclarationError(
        'Selection options require the selection schema to be a zod object'
      );
    }

    let shape = (schema as z.ZodObject<any>).shape;
    for (let [field, sources] of Object.entries(declarations)) {
      this.#selectionOptions[field] = checkSelectionOptions(field, sources, shape);
    }
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
      routingMatchers: this.#routingMatchers,
      selectionOptions: this.#selectionOptions
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
