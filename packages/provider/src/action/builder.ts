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
  SlatePublicToolInvocationHandler,
  SlateToolInvocationHandler,
  SlateTriggerMappingHandler,
  SlateTriggerMatchesHandler
} from './action';
import { validateScopes } from './scopes';
import type { SlateTriggerGroup } from './triggerGroup';

export class SlateActionBuilder<
  Type extends SlateActionType,
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {},
  Result extends SlateAction<Type, ConfigType, AuthType, any, any>,
  IsPublic extends boolean = false
> {
  #configSchema: z.ZodType<ConfigType>;
  #authSchema: z.ZodType<AuthType>;
  #inputSchema: z.ZodType<InputType> | null = null;
  #outputSchema: z.ZodType<OutputType> | null = null;
  #scopes: SlateActionScopes | undefined;
  #authMethods: string[] | undefined;

  #toolParams: SlateActionParametersTool<ConfigType, AuthType, InputType, OutputType> | null =
    null;
  #triggerGroup: SlateTriggerGroup<ConfigType, AuthType> | null = null;
  #triggerMatches: SlateTriggerMatchesHandler | null = null;
  #triggerMap: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType> | null =
    null;
  #interfaceLocked = false;

  constructor(
    private readonly type: Type,
    readonly spec: SlateSpecification<ConfigType, AuthType>,
    private readonly params: SlateActionParameters,
    private readonly factory: (
      params: SlateActionCreateParameters<any, any, any, any>
    ) => Result,
    private readonly isPublicTool: IsPublic = false as IsPublic
  ) {
    this.#configSchema = spec.configSchema;
    this.#authSchema = spec.authSchema;
  }

  input<NewInputType extends {}>(
    schema: z.ZodType<NewInputType>
  ): SlateActionBuilder<
    Type,
    ConfigType,
    AuthType,
    NewInputType,
    OutputType,
    Result,
    IsPublic
  > {
    if (this.#interfaceLocked) {
      throw new SlateDeclarationError('Adapter contract input schema cannot be changed');
    }

    this.#inputSchema = schema as any;
    return this as any;
  }

  output<NewOutputType extends {}>(
    schema: z.ZodType<NewOutputType>
  ): SlateActionBuilder<
    Type,
    ConfigType,
    AuthType,
    InputType,
    NewOutputType,
    Result,
    IsPublic
  > {
    if (this.#interfaceLocked) {
      throw new SlateDeclarationError('Adapter contract output schema cannot be changed');
    }

    this.#outputSchema = schema as any;
    return this as any;
  }

  lockInterface(): SlateActionBuilder<
    Type,
    ConfigType,
    AuthType,
    InputType,
    OutputType,
    Result,
    IsPublic
  > {
    this.#interfaceLocked = true;
    return this;
  }

  scopes(
    scopes: SlateActionScopes
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result, IsPublic> {
    validateScopes(scopes);
    this.#scopes = scopes;
    return this;
  }

  authMethods(
    authMethods: string[]
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result, IsPublic> {
    if (this.isPublicTool) {
      throw new SlateDeclarationError('Public tools cannot require authentication methods');
    }

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
    handler: IsPublic extends true
      ? SlatePublicToolInvocationHandler<InputType, OutputType>
      : SlateToolInvocationHandler<ConfigType, AuthType, InputType, OutputType>
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result, IsPublic> {
    if (this.type !== 'tool') {
      throw new SlateDeclarationError('handleInvocation can only be set for tool actions');
    }

    this.#toolParams = {
      type: 'tool',
      handleInvocation: handler as SlateToolInvocationHandler<
        ConfigType,
        AuthType,
        InputType,
        OutputType
      >
    };

    return this;
  }

  triggerGroup(
    group: SlateTriggerGroup<ConfigType, AuthType>
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result, IsPublic> {
    if (this.type !== 'trigger') {
      throw new SlateDeclarationError('triggerGroup can only be set for trigger actions');
    }

    this.#triggerGroup = group;
    return this;
  }

  matches(
    handler: SlateTriggerMatchesHandler
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result, IsPublic> {
    if (this.type !== 'trigger') {
      throw new SlateDeclarationError('matches can only be set for trigger actions');
    }

    this.#triggerMatches = handler;
    return this;
  }

  map(
    handler: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>
  ): SlateActionBuilder<Type, ConfigType, AuthType, InputType, OutputType, Result, IsPublic> {
    if (this.type !== 'trigger') {
      throw new SlateDeclarationError('map can only be set for trigger actions');
    }

    this.#triggerMap = handler;
    return this;
  }

  build() {
    let scopes = this.#scopes ?? this.params.scopes;
    if (scopes) {
      validateScopes(scopes);
    }
    let authMethods = this.validateAuthMethods(this.#authMethods ?? this.params.authMethods);

    if (this.isPublicTool && authMethods) {
      throw new SlateDeclarationError('Public tools cannot require authentication methods');
    }

    if (!this.#inputSchema) {
      throw new SlateDeclarationError('Input schema is not defined');
    }
    if (!this.#outputSchema) {
      throw new SlateDeclarationError('Output schema is not defined');
    }
    if (this.type === 'tool' && !this.#toolParams) {
      throw new SlateDeclarationError('Tool invocation handler is not defined');
    }
    if (this.type === 'trigger' && !this.#triggerGroup) {
      throw new SlateDeclarationError('Trigger group is not defined');
    }
    if (this.type === 'trigger' && !this.#triggerMatches) {
      throw new SlateDeclarationError('Trigger matches handler is not defined');
    }
    if (this.type === 'trigger' && !this.#triggerMap) {
      throw new SlateDeclarationError('Trigger map handler is not defined');
    }

    let triggerParams: SlateActionParametersTrigger<
      ConfigType,
      AuthType,
      InputType,
      OutputType & { type: string }
    > | null =
      this.type === 'trigger'
        ? {
            type: 'trigger',
            triggerGroup: this.#triggerGroup!,
            matches: this.#triggerMatches!,
            map: this.#triggerMap! as any
          }
        : null;

    return this.factory({
      ...this.params,
      scopes,
      authMethods,
      isPublic: this.isPublicTool === true,
      configSchema: this.#configSchema,
      authSchema: this.#authSchema,
      inputSchema: this.#inputSchema,
      outputSchema: this.#outputSchema,

      ...this.#toolParams!,
      ...(triggerParams as any)!
    }) as Result;
  }
}
