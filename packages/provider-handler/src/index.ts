import { badRequestError, preconditionFailedError, ServiceError } from '@lowerdeck/error';
import {
  createSlatesProviderProtoHandler,
  SLATES_PROTOCOL_VERSION,
  type SlatesParticipant
} from '@slates/proto';
import {
  runWithContext,
  type Slate,
  type SlateAttachment,
  SlateContext,
  SlateLogger,
  type SlateLogListener
} from '@slates/provider';
import { getAction, getActionWithType, getAuthMethod, mapAction, mapAuthMethod } from './spec';
import { State } from './state';
import { toJsonSchema, validate } from './validation';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let getObjectKeyCount = (value: unknown) =>
  isRecord(value) ? Object.keys(value).length : undefined;

let DOWNLOAD_ATTACHMENT_URL_KEYS = new Set([
  'downloadUrl',
  'fileUrl',
  'temporaryDownloadUrl',
  'webContentLink'
]);

let isAttachmentUrl = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

let collectOutputUrlAttachments = (
  value: unknown,
  seen = new Set<string>()
): SlateAttachment[] => {
  if (Array.isArray(value)) {
    return value.flatMap(item => collectOutputUrlAttachments(item, seen));
  }

  if (!isRecord(value)) {
    return [];
  }

  let attachments: SlateAttachment[] = [];

  for (let [key, nestedValue] of Object.entries(value)) {
    if (
      DOWNLOAD_ATTACHMENT_URL_KEYS.has(key) &&
      typeof nestedValue === 'string' &&
      nestedValue.length > 0 &&
      isAttachmentUrl(nestedValue) &&
      !seen.has(nestedValue)
    ) {
      seen.add(nestedValue);
      attachments.push({
        content: {
          type: 'url',
          url: nestedValue
        }
      });
      continue;
    }

    attachments.push(...collectOutputUrlAttachments(nestedValue, seen));
  }

  return attachments;
};

let mergeAttachments = (
  explicitAttachments: SlateAttachment[] | undefined,
  output: unknown
): SlateAttachment[] | undefined => {
  let attachments = [...(explicitAttachments ?? [])];
  let seen = new Set(attachments.map(attachment => JSON.stringify(attachment)));

  for (let attachment of collectOutputUrlAttachments(output)) {
    let key = JSON.stringify(attachment);
    if (seen.has(key)) continue;
    seen.add(key);
    attachments.push(attachment);
  }

  return attachments.length > 0 ? attachments : undefined;
};

let toErrorMetadata = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    };
  }

  return {
    errorValue: String(error)
  };
};

let formatEntityLabel = (name: string, key: string) => `"${name}" (${key})`;
let resolveTraceMessage = <ResultType>(
  message: string | ((result: ResultType) => string),
  result: ResultType
) => (typeof message === 'function' ? message(result) : message);

export let createProviderHandler = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  listeners: SlateLogListener[]
) =>
  createSlatesProviderProtoHandler(async manager => {
    let protocol = new State<string | null>(null);
    let participants = new State<SlatesParticipant[] | null>(null);

    let auth = new State<{ authenticationMethodId: string; output: AuthType } | null>(null);
    let config = new State<{ value: ConfigType } | null>(null);
    let session = new State<{ id: string; state: any } | null>(null);

    let logger = new SlateLogger(listeners);
    let providerTrace = {
      providerId: slate.spec.key,
      providerName: slate.spec.name
    };

    let traceProviderCall = async <ResultType>(
      trace: {
        component: 'config' | 'auth' | 'action';
        functionName: string;
        message: string;
        successMessage: string | ((result: ResultType) => string);
        errorMessage?: string;
        metadata?: Record<string, unknown>;
        onSuccess?: (result: ResultType) => Record<string, unknown> | undefined;
      },
      handler: () => Promise<ResultType>
    ): Promise<ResultType> => {
      let startedAt = Date.now();

      logger.info({
        ...providerTrace,
        ...trace.metadata,
        component: trace.component,
        functionName: trace.functionName,
        phase: 'start',
        message: trace.message
      });

      try {
        let result = await handler();
        let successMessage = resolveTraceMessage(trace.successMessage, result);

        logger.info({
          ...providerTrace,
          ...trace.metadata,
          ...(trace.onSuccess?.(result) ?? {}),
          component: trace.component,
          functionName: trace.functionName,
          phase: 'success',
          durationMs: Date.now() - startedAt,
          message: successMessage
        });

        return result;
      } catch (error) {
        logger.error({
          ...providerTrace,
          ...trace.metadata,
          ...toErrorMetadata(error),
          component: trace.component,
          functionName: trace.functionName,
          phase: 'error',
          durationMs: Date.now() - startedAt,
          message:
            trace.errorMessage ??
            `${typeof trace.successMessage === 'string' ? trace.successMessage : trace.message} failed`
        });
        throw error;
      }
    };

    let getContextBasic = () => {
      let currentProtocol = protocol.get();
      let currentParticipants = participants.get();

      if (!currentProtocol || !currentParticipants) {
        throw new ServiceError(
          preconditionFailedError({
            message: 'Connection context has not been initialized'
          })
        );
      }

      return {
        protocol: currentProtocol,
        participants: currentParticipants
      };
    };

    let getContextFull = () => {
      let basic = getContextBasic();

      let currentConfig = config.get();
      let currentSession = session.get();
      let currentAuth = auth.get();

      if (
        !currentConfig ||
        !currentSession ||
        (!currentAuth && slate.spec.auth.authStack.length > 0)
      ) {
        throw new ServiceError(
          preconditionFailedError({
            message: 'Session context has not been initialized'
          })
        );
      }

      return {
        ...basic,
        config: currentConfig.value,
        session: currentSession,
        auth: currentAuth
      };
    };

    let getAuthConfig = (): Record<string, any> => config.get()?.value ?? {};

    let getEmptyContext = () => new SlateContext({}, {}, {}, slate.spec as any, logger);
    let getAuthContext = () =>
      new SlateContext(getAuthConfig(), {}, {}, slate.spec as any, logger);
    let withRequestTraces = <Result extends Record<string, any>>(
      context: SlateContext<any, any, any>,
      result: Result
    ) => {
      let requestTraces = context.getHttpTraces();
      return requestTraces.length > 0 ? { ...result, requestTraces } : result;
    };

    manager.onNotification('slates/hello', async ({ params }) => {
      protocol.set(params.protocol);
    });

    manager.onNotification('slates/participant.set', async ({ params }) => {
      if (!protocol.get()) {
        throw new ServiceError(
          preconditionFailedError({ message: 'Connection protocol has not been initialized' })
        );
      }

      participants.set(params.participants);
    });

    manager.onNotification('slates/auth.set', async ({ params }) => {
      getContextBasic();
      getAuthMethod(slate, params.authenticationMethodId); // validate method ID

      let valRes = validate(
        slate.spec.authSchema,
        params.output,
        'auth',
        `Invalid authentication output for method ID: ${params.authenticationMethodId}`
      );

      auth.set({
        authenticationMethodId: params.authenticationMethodId,
        output: valRes
      });
    });

    manager.onNotification('slates/config.set', async ({ params }) => {
      getContextBasic();

      let value = validate(
        slate.spec.configSchema,
        params.config,
        'config',
        'Invalid configuration'
      );

      config.set({ value });
    });

    manager.onNotification('slates/session.start', async ({ params }) => {
      getContextBasic();

      session.set({
        id: params.sessionId,
        state: params.state
      });
    });

    manager.onRequest('slates/config.changed', async ({ params }) => {
      getContextBasic();

      let newConfig = validate(
        slate.spec.config.configSchema,
        params.newConfig,
        'config',
        'Invalid configuration'
      );

      let configChanged = slate.spec.config.handlers.configChanged;
      if (!configChanged) {
        return { success: true, config: newConfig };
      }

      let context = getEmptyContext();
      let updatedConfig = await traceProviderCall<{ config?: ConfigType } | undefined>(
        {
          component: 'config',
          functionName: 'configChanged',
          message: 'Running config change handler',
          successMessage: 'Config change handler completed',
          metadata: {
            hasPreviousConfig: params.previousConfig !== null,
            newConfigKeyCount: getObjectKeyCount(newConfig)
          },
          onSuccess: result => ({
            returnedConfig: !!result?.config
          })
        },
        () =>
          runWithContext(context, async () =>
            configChanged({
              previousConfig: params.previousConfig as ConfigType | null,
              newConfig
            })
          )
      );

      return withRequestTraces(context, {
        success: true,
        config: (updatedConfig?.config ?? newConfig) as Record<string, any>
      });
    });

    manager.onRequest('slates/config.get_default', async () => {
      getContextBasic();

      let getDefaultConfig = slate.spec.config.handlers.getDefaultConfig;
      if (!getDefaultConfig) {
        return { config: null };
      }

      let context = getEmptyContext();
      let defaultConfig = await traceProviderCall<ConfigType>(
        {
          component: 'config',
          functionName: 'getDefaultConfig',
          message: 'Getting default config',
          successMessage: 'Default config retrieved',
          onSuccess: result => ({
            configKeyCount: getObjectKeyCount(result)
          })
        },
        () => runWithContext(context, async () => getDefaultConfig())
      );
      return withRequestTraces(context, {
        config: (defaultConfig ?? null) as Record<string, any> | null
      });
    });

    manager.onRequest('slates/config.schema.get', async () => {
      getContextBasic();

      return {
        schema: toJsonSchema(slate.spec.configSchema),
        docs: slate.spec.config.docsReferences ?? []
      };
    });

    manager.onRequest('slates/provider.identify', async () => {
      getContextBasic();

      return {
        protocol: SLATES_PROTOCOL_VERSION,
        provider: {
          type: 'provider',
          id: slate.spec.key,
          name: slate.spec.name,
          description: slate.spec.description,
          metadata: slate.spec.parameters.metadata
        },
        docs: slate.spec.docs ?? []
      };
    });

    manager.onRequest('slates/auth.methods.list', async () => {
      getContextBasic();

      return {
        authenticationMethods: slate.spec.auth.authStack.map(m => mapAuthMethod(slate, m))
      };
    });

    manager.onRequest('slates/auth.method.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      return {
        authenticationMethod: mapAuthMethod(slate, authMethod)
      };
    });

    manager.onRequest('slates/auth.input.get_default', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if (!authMethod.getDefaultInput) {
        return { input: null };
      }

      let context = getEmptyContext();
      let input = await traceProviderCall(
        {
          component: 'auth',
          functionName: 'getDefaultInput',
          message: 'Getting default authentication input',
          successMessage: 'Default authentication input retrieved',
          metadata: {
            authenticationMethodId: params.authenticationMethodId,
            authenticationMethodName: authMethod.name
          },
          onSuccess: result => ({
            inputKeyCount: getObjectKeyCount(result)
          })
        },
        () => runWithContext(context, () => authMethod.getDefaultInput!())
      );

      return withRequestTraces(context, { input });
    });

    manager.onRequest('slates/auth.input.changed', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if (!authMethod.onInputChanged) {
        return { success: true, input: params.newInput };
      }

      let context = getEmptyContext();
      let updatedInput = await traceProviderCall(
        {
          component: 'auth',
          functionName: 'onInputChanged',
          message: 'Running authentication input change handler',
          successMessage: 'Authentication input change handler completed',
          metadata: {
            authenticationMethodId: params.authenticationMethodId,
            authenticationMethodName: authMethod.name,
            hasPreviousInput: params.previousInput !== null,
            newInputKeyCount: getObjectKeyCount(params.newInput)
          },
          onSuccess: result => ({
            returnedInput: !!result?.input
          })
        },
        () =>
          runWithContext(context, () =>
            authMethod.onInputChanged!({
              previousInput: params.previousInput as any | null,
              newInput: params.newInput
            })
          )
      );

      return withRequestTraces(context, {
        success: true,
        input: updatedInput?.input ?? params.newInput
      });
    });

    manager.onRequest('slates/auth.output.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      let input = params.input;

      if (authMethod.inputSchema) {
        input = validate(
          authMethod.inputSchema,
          input,
          'auth',
          `Invalid authentication input for method ID: ${params.authenticationMethodId}`
        );
      }

      if ('getOutput' in authMethod) {
        let context = getAuthContext();
        let outputRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'getOutput',
            message: 'Getting authentication output',
            successMessage: 'Authentication output retrieved',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              inputKeyCount: getObjectKeyCount(input)
            },
            onSuccess: result => ({
              outputKeyCount: getObjectKeyCount(result.output),
              scopeCount: result.scopes?.length ?? 0
            })
          },
          () =>
            runWithContext(context, () =>
              authMethod.getOutput({
                input,
                config: getAuthConfig()
              })
            )
        );
        return withRequestTraces(context, {
          output: outputRes.output,
          scopes: outputRes.scopes
        });
      }

      return { output: input as any };
    });

    manager.onRequest('slates/auth.authorization_callback.handle', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if ('handleCallback' in authMethod) {
        let context = getEmptyContext();
        let callbackRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'handleCallback',
            message: 'Handling authentication callback',
            successMessage: 'Authentication callback handled',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              hasCallbackState: !!params.callbackState
            },
            onSuccess: result => ({
              outputKeyCount: getObjectKeyCount(result.output),
              returnedInput: !!result.input,
              returnedScopeCount: result.scopes?.length
            })
          },
          () =>
            runWithContext(context, () =>
              authMethod.handleCallback({
                code: params.code,
                state: params.state,
                redirectUri: params.redirectUri,
                input: params.input,
                clientId: params.clientId,
                clientSecret: params.clientSecret,
                scopes: params.scopes,
                callbackParams: params.callbackParams || {},
                callbackState: params.callbackState || {},
                config: getAuthConfig()
              })
            )
        );

        return withRequestTraces(context, {
          output: callbackRes.output,
          input: callbackRes.input,
          scopes: callbackRes.scopes
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support authorization callback handling: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/auth.authorization_url.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if ('getAuthorizationUrl' in authMethod) {
        let context = getEmptyContext();
        let urlRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'getAuthorizationUrl',
            message: 'Getting authentication authorization URL',
            successMessage: 'Authentication authorization URL retrieved',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              inputKeyCount: getObjectKeyCount(params.input)
            },
            onSuccess: result => ({
              returnedInput: !!result.input,
              hasCallbackState: !!result.callbackState
            })
          },
          () =>
            runWithContext(context, () =>
              authMethod.getAuthorizationUrl({
                redirectUri: params.redirectUri,
                state: params.state,
                input: params.input,
                clientId: params.clientId,
                clientSecret: params.clientSecret,
                scopes: params.scopes,
                config: getAuthConfig()
              })
            )
        );

        return withRequestTraces(context, {
          authorizationUrl: urlRes.url,
          input: urlRes.input,
          callbackState: urlRes.callbackState
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support authorization URL retrieval: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/auth.profile.get', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if (authMethod.getProfile) {
        let context = getAuthContext();
        let profileRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'getProfile',
            message: 'Getting authentication profile',
            successMessage: 'Authentication profile retrieved',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              inputKeyCount: getObjectKeyCount(params.input),
              outputKeyCount: getObjectKeyCount(params.output)
            },
            onSuccess: result => ({
              profileKeyCount: getObjectKeyCount(result.profile)
            })
          },
          () =>
            runWithContext(context, () => {
              if (authMethod.type === 'auth.oauth') {
                return authMethod.getProfile!({
                  output: params.output as any,
                  input: params.input,
                  scopes: params.scopes,
                  config: getAuthConfig()
                });
              }

              return authMethod.getProfile!({
                output: params.output as any,
                input: params.input,
                scopes: params.scopes,
                config: getAuthConfig()
              })!;
            })
        );

        return withRequestTraces(context, {
          profile: profileRes.profile
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support profile retrieval: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/auth.token_refresh.handle', async ({ params }) => {
      getContextBasic();
      let authMethod = getAuthMethod(slate, params.authenticationMethodId);

      if ('handleTokenRefresh' in authMethod && authMethod.handleTokenRefresh) {
        let context = getAuthContext();
        let refreshRes = await traceProviderCall(
          {
            component: 'auth',
            functionName: 'handleTokenRefresh',
            message: 'Refreshing authentication token',
            successMessage: 'Authentication token refreshed',
            metadata: {
              authenticationMethodId: params.authenticationMethodId,
              authenticationMethodName: authMethod.name,
              scopeCount: params.scopes.length,
              inputKeyCount: getObjectKeyCount(params.input),
              outputKeyCount: getObjectKeyCount(params.output)
            },
            onSuccess: result => ({
              refreshedOutputKeyCount: getObjectKeyCount(result.output),
              returnedInput: !!result.input
            })
          },
          () =>
            runWithContext(context, () => {
              if (authMethod.type === 'auth.oauth') {
                return authMethod.handleTokenRefresh!({
                  output: params.output as any,
                  input: params.input,
                  clientId: params.clientId,
                  clientSecret: params.clientSecret,
                  scopes: params.scopes,
                  config: getAuthConfig()
                });
              }

              return authMethod.handleTokenRefresh!({
                output: params.output as any,
                input: params.input,
                clientId: params.clientId,
                clientSecret: params.clientSecret,
                scopes: params.scopes,
                config: getAuthConfig()
              });
            })
        );

        return withRequestTraces(context, {
          output: refreshRes.output,
          input: refreshRes.input
        });
      }

      throw new ServiceError(
        preconditionFailedError({
          message: `Authentication method does not support token refresh handling: ${params.authenticationMethodId}`
        })
      );
    });

    manager.onRequest('slates/actions.list', async () => {
      getContextBasic();

      return {
        actions: slate.actions.map(a => mapAction(slate, a))
      };
    });

    manager.onRequest('slates/action.get', async ({ params }) => {
      getContextBasic();
      let action = getAction(slate, params.actionId);

      return {
        action: mapAction(slate, action)
      };
    });

    manager.onRequest('slates/action.tool.invoke', async ({ params }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'tool', params.actionId);

      let input = validate(
        action.inputSchema,
        params.input,
        'input',
        `Invalid input for tool ID: ${params.actionId}`
      );

      let context = new SlateContext(ctx.config, input, ctx.auth?.output!, slate.spec, logger);
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'handleInvocation',
          message: `Starting tool ${formatEntityLabel(action.name, action.key)}`,
          successMessage: `Completed tool ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Tool ${formatEntityLabel(action.name, action.key)} failed`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            inputKeyCount: getObjectKeyCount(input)
          },
          onSuccess: result => ({
            hasMessage: !!result.message,
            actionResultMessage: result.message,
            outputKeyCount: getObjectKeyCount(result.output),
            attachmentCount: result.attachments?.length
          })
        },
        () => runWithContext(context, () => action.handleInvocation(context))
      );

      return withRequestTraces(context, {
        output: res.output,
        message: res.message,
        attachments: mergeAttachments(res.attachments, res.output)
      });
    });

    manager.onRequest('slates/action.trigger.map_event', async ({ params }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'trigger', params.actionId);

      let input = validate(
        action.inputSchema,
        params.input,
        'input',
        `Invalid event for trigger ID: ${params.actionId}`
      );

      let context = new SlateContext(ctx.config, input, ctx.auth?.output!, slate.spec, logger);
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'handleEvent',
          message: `Mapping event for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: result =>
            `Mapped trigger event "${result.type}" for ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while mapping an event`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            inputKeyCount: getObjectKeyCount(input)
          },
          onSuccess: result => ({
            eventType: result.type,
            hasEventId: !!result.id,
            outputKeyCount: getObjectKeyCount(result.output)
          })
        },
        () => runWithContext(context, () => action.handleEvent(context))
      );

      return withRequestTraces(context, { id: res.id, type: res.type, output: res.output });
    });

    manager.onRequest('slates/action.trigger.poll_events', async ({ params }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.pollEvents) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support polling: ${params.actionId}`
          })
        );
      }

      let context = new SlateContext(
        ctx.config,
        { state: params.state },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'pollEvents',
          message: `Polling events for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: result =>
            `Polled ${result.inputs.length} event(s) for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while polling events`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            hasPreviousState: params.state !== null
          },
          onSuccess: result => ({
            inputCount: result.inputs.length,
            hasUpdatedState: result.updatedState !== undefined
          })
        },
        () => runWithContext(context, () => action.pollEvents!(context))
      );

      return withRequestTraces(context, {
        inputs: res.inputs,
        updatedState: res.updatedState
      });
    });

    manager.onRequest('slates/action.trigger.webhook_handle', async ({ params }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.handleRequest) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support webhook requests: ${params.actionId}`
          })
        );
      }

      let req = new Request(params.url, {
        method: params.method,
        headers: params.headers,
        body: params.body
          ? Uint8Array.from(atob(params.body.content), c => c.charCodeAt(0))
          : null
      });

      let context = new SlateContext(
        ctx.config,
        { request: req, state: params.state },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'handleRequest',
          message: `Handling webhook request for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: result =>
            `Received ${result.inputs.length} webhook event(s) for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while handling a webhook request`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            requestMethod: params.method,
            hasRequestBody: !!params.body,
            hasPreviousState: params.state !== null
          },
          onSuccess: result => ({
            inputCount: result.inputs.length,
            hasUpdatedState: result.updatedState !== undefined
          })
        },
        () => runWithContext(context, () => action.handleRequest!(context))
      );

      return withRequestTraces(context, {
        inputs: res.inputs,
        updatedState: res.updatedState
      });
    });

    manager.onRequest('slates/action.trigger.webhook_register', async ({ params }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.autoRegisterWebhook) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support webhook auto-registration: ${params.actionId}`
          })
        );
      }

      let context = new SlateContext(
        ctx.config,
        { webhookBaseUrl: params.webhookBaseUrl },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      let res = await traceProviderCall(
        {
          component: 'action',
          functionName: 'autoRegisterWebhook',
          message: `Registering webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: `Registered webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while registering a webhook`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type
          },
          onSuccess: result => ({
            hasRegistrationDetails: result.registrationDetails !== undefined,
            hasState: result.state !== undefined
          })
        },
        () => runWithContext(context, () => action.autoRegisterWebhook!(context))
      );

      return withRequestTraces(context, {
        registrationDetails: res.registrationDetails,
        state: res.state
      });
    });

    manager.onRequest('slates/action.trigger.webhook_unregister', async ({ params }) => {
      let ctx = getContextFull();
      let action = getActionWithType(slate, 'trigger', params.actionId);

      if (!action.autoUnregisterWebhook) {
        throw new ServiceError(
          badRequestError({
            message: `Trigger action does not support webhook auto-unregistration: ${params.actionId}`
          })
        );
      }

      let context = new SlateContext(
        ctx.config,
        {
          webhookBaseUrl: params.webhookBaseUrl,
          registrationDetails: params.registrationDetails,
          state: params.state
        },
        ctx.auth?.output!,
        slate.spec,
        logger
      );
      await traceProviderCall(
        {
          component: 'action',
          functionName: 'autoUnregisterWebhook',
          message: `Unregistering webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          successMessage: `Unregistered webhook for trigger ${formatEntityLabel(action.name, action.key)}`,
          errorMessage: `Trigger ${formatEntityLabel(action.name, action.key)} failed while unregistering a webhook`,
          metadata: {
            actionId: action.key,
            actionName: action.name,
            actionType: action.type,
            hasRegistrationDetails: params.registrationDetails !== null,
            hasPreviousState: params.state !== null
          }
        },
        () => runWithContext(context, () => action.autoUnregisterWebhook!(context))
      );

      return withRequestTraces(context, {});
    });
  });
