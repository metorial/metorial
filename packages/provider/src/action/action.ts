import type { z } from 'zod';
import type { SlateContext } from '../context';
import type { SlateActionDocsReference } from '../docs';
import type { SlateSpecification } from '../specification/specification';
import type { SlateAttachment } from './attachment';

export type SlateActionType = 'tool' | 'trigger';

export interface SlateActionScopeClause {
  OR: string[];
}

export interface SlateActionScopes {
  AND: SlateActionScopeClause[];
}

export interface SlateActionParameters {
  key: string;
  name: string;
  description?: string;
  instructions?: string[];
  constraints?: string[];
  tags?: {
    destructive?: boolean;
    readOnly?: boolean;
    [key: string]: boolean | undefined;
  };
  metadata?: Record<string, any>;
  scopes?: SlateActionScopes;
  docs?: SlateActionDocsReference[];
}

export type SlateToolInvocationHandler<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> = (context: SlateContext<ConfigType, AuthType, InputType>) => Promise<{
  output: OutputType;
  message: string;
  attachments?: SlateAttachment[];
}>;

export type SlateTriggerMappingHandler<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> = (context: SlateContext<ConfigType, AuthType, InputType>) => Promise<{
  type: string;
  id: string;
  output: OutputType;
}>;

export type SlateTriggerPollingHandler<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
> = (context: SlateContext<ConfigType, AuthType, { state: any | null }>) => Promise<{
  inputs: InputType[];
  updatedState?: any;
}>;

export type SlateTriggerWebhookRequestHandler<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
> = (
  context: SlateContext<ConfigType, AuthType, { request: Request; state: any | null }>
) => Promise<{
  inputs: InputType[];
  updatedState?: any;
}>;

export type SlateTriggerWebhookAutoRegistrationHandler<
  ConfigType extends {},
  AuthType extends {}
> = (context: SlateContext<ConfigType, AuthType, { webhookBaseUrl: string }>) => Promise<{
  registrationDetails: any;
  state?: any;
}>;

export type SlateTriggerWebhookAutoUnregistrationHandler<
  ConfigType extends {},
  AuthType extends {}
> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { webhookBaseUrl: string; registrationDetails: any; state: any | null }
  >
) => Promise<unknown>;

export interface SlateActionParametersTool<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> {
  type: 'tool';
  handleInvocation: SlateToolInvocationHandler<ConfigType, AuthType, InputType, OutputType>;
}

export interface SlatePollingOptions {
  intervalInSeconds?: number;
}

export interface SlateActionParametersTrigger<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> {
  type: 'trigger';
  source: 'polling' | 'webhook';
  polling?: SlatePollingOptions;
  handleEvent: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
  handleRequest?: SlateTriggerWebhookRequestHandler<ConfigType, AuthType, InputType>;
  pollEvents?: SlateTriggerPollingHandler<ConfigType, AuthType, InputType>;
  autoRegisterWebhook?: SlateTriggerWebhookAutoRegistrationHandler<ConfigType, AuthType>;
  autoUnregisterWebhook?: SlateTriggerWebhookAutoUnregistrationHandler<ConfigType, AuthType>;
}

export type SlateActionParametersAny<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> =
  | SlateActionParametersTool<ConfigType, AuthType, InputType, OutputType>
  | SlateActionParametersTrigger<ConfigType, AuthType, InputType, OutputType>;

export type SlateActionCreateParameters<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> = SlateActionParametersAny<ConfigType, AuthType, InputType, OutputType> &
  SlateActionParameters & {
    configSchema: z.ZodType<ConfigType>;
    authSchema: z.ZodType<AuthType>;
    inputSchema: z.ZodType<InputType>;
    outputSchema: z.ZodType<OutputType>;
  };

export abstract class SlateAction<
  Type extends SlateActionType,
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> {
  constructor(
    public readonly type: Type,
    protected readonly _spec: SlateSpecification<ConfigType, AuthType>,
    protected readonly _inputSchema: z.ZodType<InputType>,
    protected readonly _outputSchema: z.ZodType<OutputType>,
    protected readonly _params: SlateActionParameters
  ) {}

  get configSchema() {
    return this._spec.configSchema;
  }

  get inputSchema() {
    return this._inputSchema;
  }

  get outputSchema() {
    return this._outputSchema;
  }

  get parameters() {
    return this._params;
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

  get tags() {
    return this._params.tags;
  }

  get instructions() {
    return this._params.instructions;
  }

  get constraints() {
    return this._params.constraints;
  }

  get metadata() {
    return this._params.metadata;
  }

  get scopes() {
    return this._params.scopes;
  }

  get docs() {
    return this._params.docs;
  }
}
