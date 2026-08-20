import type {
  WebhookBootstrapCaptureInput,
  WebhookBootstrapCaptureOutput,
  WebhookVerifyInput,
  WebhookVerifyOutput
} from '@slates/proto';
import type { z } from 'zod';
import type { SlateContext } from '../context';
import type { SlateActionDocsReference } from '../docs';
import type { SlateSpecification } from '../specification/specification';
import { SlateDeclarationError } from '../error';
import type { SlateWebhookHttpMethod, SlateWebhookIngress } from '../webhook/verification';
import type { SlateAttachment } from './attachment';

export type {
  SafeWebhookRejectionCode,
  SlateWebhookDeduplicate,
  SlateWebhookFreshness,
  SlateWebhookHttpMethod,
  SlateWebhookIngress,
  SlateWebhookItemAdapterId,
  SlateWebhookProviderRule,
  SlateWebhookReplayPolicy,
  SlateWebhookRuleRequestMatcher as SlateWebhookVerificationRequestMatcher,
  SlateWebhookSecretEncoding,
  SlateWebhookSecretRef,
  SlateWebhookSelector,
  SlateWebhookVerification,
  SlateWebhookVerificationRule,
  SlateWebhookVerifier,
  WebhookWireBody,
  WebhookWireRequest,
  WebhookWireResponse
} from '../webhook/verification';

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
  eventTypes?: readonly string[];
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

export interface SlateWebhookHttpResponseInit {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array | null;
}

export interface SlateWebhookRequestMatcher {
  method?: SlateWebhookHttpMethod;
  hasQueryParam?: string;
  lacksQueryParam?: string;
  hasHeader?: string;
  jsonBodyField?: {
    path: string;
    equals?: string;
  };
  formBodyField?: {
    path: string;
    equals?: string;
  };
}

export interface SlateWebhookHttpOptions {
  registration?: { mode: 'automatic' | 'manual_bootstrap' };
  methods?: SlateWebhookHttpMethod[];
  sync?: {
    mode: 'never' | 'match' | 'always';
    match?: SlateWebhookRequestMatcher[];
    timeoutMs?: number;
  };
  /** The versioned inbound-authenticity declaration. */
  ingress?: SlateWebhookIngress;
}

export type SlateTriggerWebhookRequestHandler<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { request: Request; state: any | null; registrationDetails: any | null }
  >
) => Promise<{
  inputs: InputType[];
  updatedState?: any;
  response?: Response | SlateWebhookHttpResponseInit;
}>;

export type SlateTriggerWebhookAutoRegistrationHandler<
  ConfigType extends {},
  AuthType extends {}
> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    {
      webhookBaseUrl: string;
      registrationDetails?: any | null;
      capturedSecretVersions: Readonly<Record<string, number>>;
    }
  >
) => Promise<{
  registrationDetails: any;
  state?: any;
  capturedSecrets?: Record<string, { value: string; version: number }>;
}>;

export type SlateTriggerWebhookVerifyHandler = (
  context: SlateContext<Record<string, never>, Record<string, never>, WebhookVerifyInput>
) => Promise<WebhookVerifyOutput>;

export type SlateTriggerWebhookBootstrapCaptureHandler = (
  context: SlateContext<
    Record<string, never>,
    Record<string, never>,
    WebhookBootstrapCaptureInput
  >
) => Promise<WebhookBootstrapCaptureOutput>;

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
  receiverBoundToolContextV1?: Readonly<{
    secretNames: readonly string[];
  }>;
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
  http?: SlateWebhookHttpOptions;
  pollEvents?: SlateTriggerPollingHandler<ConfigType, AuthType, InputType>;
  autoRegisterWebhook?: SlateTriggerWebhookAutoRegistrationHandler<ConfigType, AuthType>;
  autoUnregisterWebhook?: SlateTriggerWebhookAutoUnregistrationHandler<ConfigType, AuthType>;
  verifyWebhook?: SlateTriggerWebhookVerifyHandler;
  captureWebhookBootstrap?: SlateTriggerWebhookBootstrapCaptureHandler;
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
  ) {
    if (type === 'tool' && _params.eventTypes !== undefined) {
      throw new SlateDeclarationError('eventTypes can only be declared for trigger actions');
    }

    if (
      _params.eventTypes &&
      (_params.eventTypes.some(eventType => !eventType || eventType !== eventType.trim()) ||
        new Set(_params.eventTypes).size !== _params.eventTypes.length)
    ) {
      throw new SlateDeclarationError(
        'Trigger event types must be unique, non-empty strings without surrounding whitespace'
      );
    }
  }

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

  get eventTypes() {
    return this._params.eventTypes ?? [];
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
}
