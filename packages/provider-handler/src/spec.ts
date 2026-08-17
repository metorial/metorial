import { badRequestError, notFoundError, ServiceError } from '@lowerdeck/error';
import type {
  SlateAuthenticationMethod,
  SlatesAction,
  SlateAdapter as SlatesAdapter
} from '@slates/proto';
import {
  type Slate,
  type SlateAdapter,
  SlateDefaultPollingIntervalSeconds
} from '@slates/provider';
import z from 'zod';
import { toJsonSchema } from './validation';

export let getAuthMethod = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  authenticationMethodId: string
) => {
  let authMethod = slate.spec.auth.authStack.find(m => m.key === authenticationMethodId);
  if (!authMethod) {
    throw new ServiceError(
      badRequestError({
        message: `Invalid authentication method ID: ${authenticationMethodId}`
      })
    );
  }

  return authMethod;
};

export let mapAuthMethod = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  m: ReturnType<typeof getAuthMethod<ConfigType, AuthType>>
): SlateAuthenticationMethod => ({
  id: m.key,
  name: m.name,
  type: m.type,

  scopes:
    'scopes' in m
      ? m.scopes.map(s => ({
          id: s.scope,
          title: s.title,
          description: s.description,
          defaultChecked: s.defaultChecked
        }))
      : undefined,

  inputSchema: toJsonSchema(m.inputSchema ?? z.object({})),
  outputSchema: toJsonSchema(slate.spec.auth.outputSchema),

  capabilities: {
    getDefaultInput: { enabled: !!('getDefaultInput' in m && m.getDefaultInput) },
    handleTokenRefresh: {
      enabled: !!('handleTokenRefresh' in m && m.handleTokenRefresh)
    },
    handleChangedInput: {
      enabled: !!m.onInputChanged
    },
    getProfile: { enabled: !!m.getProfile }
  },

  docs: m.docs ?? []
});

export let getAction = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  actionId: string
) => {
  let action = slate.actions.find(m => m.key === actionId);
  if (!action) {
    throw new ServiceError(notFoundError(`action`, actionId));
  }

  return action;
};

export let getAdapter = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  adapterId: string
) => {
  let adapter = slate.adapters.find(m => m.id === adapterId);
  if (!adapter) {
    throw new ServiceError(notFoundError(`adapter`, adapterId));
  }

  return adapter;
};

export let mapAdapter = <ConfigType extends {}, AuthType extends {}>(
  adapter: SlateAdapter<ConfigType, AuthType>
): SlatesAdapter => ({
  id: adapter.id,
  name: adapter.name,
  capabilities: adapter.capabilities
});

export let getActionWithType = <
  Type extends 'tool' | 'trigger',
  ConfigType extends {},
  AuthType extends {}
>(
  slate: Slate<ConfigType, AuthType>,
  type: Type,
  actionId: string
): ReturnType<typeof getAction<ConfigType, AuthType>> & { type: Type } => {
  let action = getAction(slate, actionId);
  if (action.type !== type) {
    throw new ServiceError(
      badRequestError({
        message: `Action with ID ${actionId} is not of type ${type}`
      })
    );
  }

  return action as any;
};

export let mapAction = <ConfigType extends {}, AuthType extends {}>(
  _slate: Slate<ConfigType, AuthType>,
  a: ReturnType<typeof getAction<ConfigType, AuthType>>
): SlatesAction => {
  let base = {
    id: a.key,
    name: a.name,
    description: a.description,
    instructions: a.instructions,
    constraints: a.constraints,
    tags: a.tags,
    metadata: a.metadata,
    scopes: a.scopes,
    authMethods: a.authMethods,
    docs: a.docs ?? [],
    ...(a.adapter ? { adapter: a.adapter } : {}),

    inputSchema: toJsonSchema(a.inputSchema),
    outputSchema: toJsonSchema(a.outputSchema)
  };

  if (a.type === 'tool') {
    return {
      ...base,
      type: 'action.tool',
      capabilities: {},
      isPublic: a.isPublic
    };
  }

  return {
    ...base,
    type: 'action.trigger',
    capabilities: {},

    invocation:
      a.source === 'polling'
        ? {
            type: 'polling',
            intervalSeconds: a.polling.intervalInSeconds ?? SlateDefaultPollingIntervalSeconds
          }
        : {
            type: 'webhook',
            autoRegistration: !!a.autoRegisterWebhook,
            autoUnregistration: !!a.autoUnregisterWebhook,
            http: a.http
          }
  };
};
