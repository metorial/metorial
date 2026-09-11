import type { z } from 'zod';
import type { SlateContext, SlatePublicContext } from '../context';
import type { SlateActionDocsReference } from '../docs';
import type { SlateSpecification } from '../specification/specification';
import type { SlateAttachment } from './attachment';
import type { SlateTriggerGroup } from './triggerGroup';

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
  authMethods?: string[];
  docs?: SlateActionDocsReference[];
  adapter?: string | null;
  isPublic?: boolean;
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

export type SlatePublicToolInvocationHandler<InputType extends {}, OutputType extends {}> = (
  context: SlatePublicContext<InputType>
) => Promise<{
  output: OutputType;
  message: string;
  attachments?: SlateAttachment[];
}>;

export type SlateTriggerMatchesHandler = (payload: unknown) => boolean;

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

export interface SlateWebhookHttpResponseInit {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array | null;
}

export interface SlateActionParametersTool<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> {
  type: 'tool';
  handleInvocation: SlateToolInvocationHandler<ConfigType, AuthType, InputType, OutputType>;
}

export interface SlateActionParametersTrigger<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> {
  type: 'trigger';
  triggerGroup: SlateTriggerGroup<ConfigType, AuthType>;
  matches: SlateTriggerMatchesHandler;
  map: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
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

  get authMethods() {
    return this._params.authMethods;
  }

  get docs() {
    return this._params.docs;
  }

  get adapter() {
    return this._params.adapter ?? null;
  }

  get isPublic() {
    return this._params.isPublic === true;
  }
}
