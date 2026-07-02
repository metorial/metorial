import type z from 'zod';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from '../specification/specification';
import type {
  SlateAction,
  SlateActionCreateParameters,
  SlateActionParameters,
  SlateActionParametersTool,
  SlateActionParametersTrigger,
  SlateActionScopes,
  SlateActionType,
  SlatePollingOptions,
  SlateToolInvocationHandler,
  SlateTriggerMappingHandler,
  SlateTriggerPollingHandler,
  SlateTriggerWebhookAutoRegistrationHandler,
  SlateTriggerWebhookAutoUnregistrationHandler,
  SlateTriggerWebhookRequestHandler
} from './action';
import { validateScopes } from './scopes';

export class SlateActionBuilder<
  Type extends SlateActionType,
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {},
  Result extends SlateAction<Type, ConfigType, AuthType, any, any>
> {
  #configSchema: z.ZodType<ConfigType>;
  #authSchema: z.ZodType<AuthType>;
  #inputSchema: z.ZodType<InputType> | null = null;
  #outputSchema: z.ZodType<OutputType> | null = null;
  #scopes: SlateActionScopes | undefined;
  #authMethods: string[] | undefined;

  #toolParams: SlateActionParametersTool<ConfigType, AuthType, InputType, OutputType> | null =
    null;
  #triggerParams: SlateActionParametersTrigger<
    ConfigType,
    AuthType,
    InputType,
    OutputType
  > | null = null;

  constructor(
    private readonly type: Type,
    readonly spec: SlateSpecification<ConfigType, AuthType>,
    private readonly params: SlateActionParameters,
    private readonly factory: (
      params: SlateActionCreateParameters<any, any, any, any>
    ) => Result
  ) {
    this.#configSchema = spec.configSchema;
    this.#authSchema = spec.authSchema;
  }

  input<NewInputType extends {}>(
    schema: z.ZodType<NewInputType>
  ): SlateActionBuilder<Type, ConfigType, AuthType, NewInputType, OutputType, Result> {
    this.#inputSchema = schema as any;
    return this as any;
  }

  output<NewOutputType extends {}>(
    schema: z.ZodType<NewOutputType>
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, NewOutputType, Result> {
    this.#outputSchema = schema as any;
    return this as any;
  }

  scopes(
    scopes: SlateActionScopes
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result> {
    validateScopes(scopes);
    this.#scopes = scopes;
    return this;
  }

  authMethods(
    authMethods: string[]
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result> {
    this.#authMethods = this.validateAuthMethods(authMethods);
    return this;
  }

  private validateAuthMethods(authMethods: string[] | undefined) {
    if (!authMethods) return undefined;

    let normalized = [...new Set(authMethods.map(authMethod => authMethod.trim()))];
    if (normalized.some(authMethod => !authMethod)) {
      throw new SlateDeclarationError('Auth method IDs must be non-empty strings');
    }

    return normalized;
  }

  handleInvocation(
    handler: SlateToolInvocationHandler<ConfigType, AuthType, InputType, OutputType>
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result> {
    if (this.type !== 'tool') {
      throw new SlateDeclarationError('handleInvocation can only be set for tool actions');
    }

    this.#toolParams = {
      type: 'tool',
      handleInvocation: handler
    };

    return this;
  }

  webhook(props: {
    handleEvent: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
    handleRequest: SlateTriggerWebhookRequestHandler<ConfigType, AuthType, InputType>;
    autoRegisterWebhook?: SlateTriggerWebhookAutoRegistrationHandler<ConfigType, AuthType>;
    autoUnregisterWebhook?: SlateTriggerWebhookAutoUnregistrationHandler<ConfigType, AuthType>;
  }): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result> {
    if (this.type !== 'trigger') {
      throw new SlateDeclarationError('handleEvent can only be set for trigger actions');
    }

    this.#triggerParams = {
      type: 'trigger',
      source: 'webhook',
      handleEvent: props.handleEvent,
      handleRequest: props.handleRequest,
      autoRegisterWebhook: props.autoRegisterWebhook,
      autoUnregisterWebhook: props.autoUnregisterWebhook
    };

    return this;
  }

  polling(props: {
    options?: SlatePollingOptions;
    pollEvents?: SlateTriggerPollingHandler<ConfigType, AuthType, InputType>;
    handleEvent: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
  }): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result> {
    if (this.type !== 'trigger') {
      throw new SlateDeclarationError('handleEvent can only be set for trigger actions');
    }

    this.#triggerParams = {
      type: 'trigger',
      source: 'polling',
      polling: props.options,
      pollEvents: props.pollEvents,
      handleEvent: props.handleEvent
    };

    return this;
  }

  build() {
    let scopes = this.#scopes ?? this.params.scopes;
    if (scopes) {
      validateScopes(scopes);
    }
    let authMethods = this.validateAuthMethods(this.#authMethods ?? this.params.authMethods);

    if (!this.#inputSchema) {
      throw new SlateDeclarationError('Input schema is not defined');
    }
    if (!this.#outputSchema) {
      throw new SlateDeclarationError('Output schema is not defined');
    }
    if (this.type === 'tool' && !this.#toolParams) {
      throw new SlateDeclarationError('Tool invocation handler is not defined');
    }
    if (this.type === 'trigger' && !this.#triggerParams) {
      throw new SlateDeclarationError('Trigger event handlers are not defined');
    }

    return this.factory({
      ...this.params,
      scopes,
      authMethods,
      configSchema: this.#configSchema,
      authSchema: this.#authSchema,
      inputSchema: this.#inputSchema,
      outputSchema: this.#outputSchema,

      ...this.#toolParams!,
      ...this.#triggerParams!
    }) as Result;
  }
}
