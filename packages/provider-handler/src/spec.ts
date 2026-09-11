import { badRequestError, notFoundError, ServiceError } from '@lowerdeck/error';
import type {
  SlateAuthenticationMethod,
  SlatesAction,
  SlateAdapter as SlatesAdapter,
  SlatesTriggerGroup
} from '@slates/proto';
import {
  type Slate,
  type SlateAdapter,
  type SlateTrigger,
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
          description: s.description
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
    triggerGroupId: a.triggerGroup.key
  };
};

export let isMappableTrigger = <ConfigType extends {}, AuthType extends {}>(
  action: Slate<ConfigType, AuthType>['actions'][number]
): boolean => action.type !== 'trigger' || !!action.triggerGroup;

export let getMappableAction = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  actionId: string
) => {
  let action = getAction(slate, actionId);
  if (!isMappableTrigger(action)) {
    throw new ServiceError(notFoundError(`action`, actionId));
  }

  return action;
};

export let getTriggerGroup = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  triggerGroupId: string
) => {
  let group = slate.triggerGroups.find(g => g.key === triggerGroupId);
  if (!group) {
    throw new ServiceError(notFoundError(`trigger_group`, triggerGroupId));
  }

  return group;
};

export let getTriggersForGroup = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  triggerGroupId: string
): SlateTrigger<ConfigType, AuthType, any, any>[] =>
  slate.actions.filter(
    (action): action is SlateTrigger<ConfigType, AuthType, any, any> =>
      action.type === 'trigger' && action.triggerGroup?.key === triggerGroupId
  );

export let evaluateTriggerMatches = <ConfigType extends {}, AuthType extends {}>(
  slate: Slate<ConfigType, AuthType>,
  triggerGroupId: string,
  payload: unknown
): string[] =>
  getTriggersForGroup(slate, triggerGroupId)
    .filter(trigger => trigger.matches(payload))
    .map(trigger => trigger.key);

export let getWebhookAutoRegistration = <ConfigType extends {}, AuthType extends {}>(
  group: ReturnType<typeof getTriggerGroup<ConfigType, AuthType>>
) => {
  if (group.source !== 'webhook' || !group.webhook?.autoRegistration) {
    throw new ServiceError(
      badRequestError({
        message: `Trigger group does not support webhook auto-registration: ${group.key}`
      })
    );
  }

  return group.webhook.autoRegistration;
};

export let getWebhookManualRegistration = <ConfigType extends {}, AuthType extends {}>(
  group: ReturnType<typeof getTriggerGroup<ConfigType, AuthType>>
) => {
  if (group.source !== 'webhook' || !group.webhook?.manualRegistration) {
    throw new ServiceError(
      badRequestError({
        message: `Trigger group does not support manual webhook registration: ${group.key}`
      })
    );
  }

  return group.webhook.manualRegistration;
};

export let mapTriggerGroup = <ConfigType extends {}, AuthType extends {}>(
  group: ReturnType<typeof getTriggerGroup<ConfigType, AuthType>>
): SlatesTriggerGroup => ({
  id: group.key,
  name: group.name,
  description: group.description,
  metadata: group.metadata,
  invocation:
    group.source === 'polling'
      ? {
          type: 'polling',
          intervalSeconds: group.polling?.intervalSeconds ?? SlateDefaultPollingIntervalSeconds
        }
      : {
          type: 'webhook',
          registration: group.webhook?.manualRegistration
            ? {
                mode: 'manual',
                userConfigSchema: toJsonSchema(
                  group.webhook.manualRegistration.userConfigSchema
                ),
                fullConfigSchema: toJsonSchema(
                  group.webhook.manualRegistration.fullConfigSchema
                )
              }
            : { mode: 'auto' }
        }
});
