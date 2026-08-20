import {
  type SlatesNotifications,
  SlatesProviderProtoHandlerManager,
  type SlatesRequests,
  type SlatesResponses
} from '@slates/proto';
import type { Slate, SlateLogListener } from '@slates/provider';
import {
  createProviderHandler,
  type ProviderHandlerSecurityOptions
} from '@slates/provider-handler';
import { SlateProtocolError } from './error';
import type { SlatesMessageTransport } from './types';

export let sendScopedWithTermination = async (d: {
  transport: SlatesMessageTransport;
  requestId: string;
  messages: ProviderMessage[];
}) => {
  if (!d.transport.sendScoped || !d.transport.terminateScoped) {
    throw new Error('Trusted scoped transport termination is unavailable');
  }
  let operation = d.transport.sendScoped({
    requestId: d.requestId,
    messages: d.messages
  });
  operation.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  let outcome: { type: 'responses'; responses: ProviderResponse[] } | { type: 'timeout' };
  try {
    outcome = await Promise.race([
      operation.then(responses => ({ type: 'responses' as const, responses })),
      new Promise<{ type: 'timeout' }>(resolve => {
        timer = setTimeout(
          () => resolve({ type: 'timeout' }),
          d.transport.scopedTimeoutMs ?? 15_000
        );
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (outcome.type === 'responses') return outcome.responses;
  let acknowledgement = await d.transport.terminateScoped({
    requestId: d.requestId,
    reason: 'timeout'
  });
  if (acknowledgement.status !== 'terminated' || acknowledgement.requestId !== d.requestId) {
    throw new Error('Scoped transport termination was not acknowledged');
  }
  throw new Error('Scoped transport timed out after confirmed termination');
};

type ProviderMessage = SlatesNotifications | SlatesRequests;
type ProviderResponse = SlatesNotifications | SlatesResponses;

let toTransportError = (value: unknown, defaultMessage: string) =>
  SlateProtocolError.fromUnknown(
    value,
    {
      code: 'transport.invoke_failed',
      kind: 'transport',
      message: defaultMessage,
      retryable: true,
      baggage: {
        response: value as any
      }
    },
    'transport'
  );

export let createLocalSlateTransport = <ConfigType extends {}, AuthType extends {}>(d: {
  slate: Slate<ConfigType, AuthType>;
  listeners?: SlateLogListener[];
  security?: ProviderHandlerSecurityOptions;
  scopedState?: {
    config?: Record<string, unknown>;
    auth?: Record<string, unknown>;
    secrets?: Record<string, unknown>;
  };
}): SlatesMessageTransport => {
  let localScopedState = new Map<
    string,
    {
      config: Record<string, unknown>;
      auth: Record<string, unknown>;
      secrets: Record<string, unknown>;
      request?: Extract<SlatesRequests, { id: string }>;
    }
  >();
  let localSecurity: ProviderHandlerSecurityOptions = d.security ?? {
    redeemScopedInvocationGrant: async ({ envelope, expected }) => {
      let state = localScopedState.get(expected.requestId);
      if (!state) throw new Error('Local scoped invocation state is unavailable');
      let action = (d.slate.actions as readonly any[]).find(
        candidate => candidate.key === expected.actionId
      );
      let secretRefs = action?.http?.ingress?.verification?.allowedSecretRefs ?? [];
      let secrets = Object.fromEntries(
        expected.secretNames.map((name, index) => {
          let secretRef = secretRefs.find((candidate: any) => candidate.name === name);
          let raw =
            state.secrets[name] ??
            (name.startsWith('config:')
              ? state.config[name.slice('config:'.length)]
              : name === 'auth:$output'
                ? state.auth
                : name.startsWith('auth:')
                  ? state.auth[name.slice('auth:'.length)]
                  : secretRef?.source === 'config'
                    ? state.config[secretRef.configKey]
                    : secretRef?.source === 'platform'
                      ? state.auth[String(secretRef.credentialKey).replace(/^auth\./, '')]
                      : undefined);
          if (raw === undefined || name.startsWith('receiver_callback:')) {
            throw new Error(`Local scoped secret ${name} is unavailable`);
          }
          return [
            name,
            {
              value:
                expected.operation === 'tool_invoke' || typeof raw !== 'string'
                  ? JSON.stringify(raw)
                  : raw,
              version: index + 1
            }
          ];
        })
      );
      let configSecretVersions = Object.fromEntries(
        Object.entries(secrets)
          .filter(([name]) => name.startsWith('config:'))
          .map(([name, secret]) => [name, secret.version])
      );
      let authSecretVersions = Object.fromEntries(
        Object.entries(secrets)
          .filter(([name]) => name.startsWith('auth:'))
          .map(([name, secret]) => [name, secret.version])
      );
      let now = Date.now();
      if (expected.operation !== 'tool_invoke') {
        let params = (state.request as any)?.params;
        if (!params) throw new Error('Local scoped webhook request is unavailable');
        let candidateBindings =
          expected.operation === 'webhook_handle'
            ? (params.selectedItems ?? [])
            : expected.operation === 'webhook_bootstrap_capture'
              ? (params.itemAdapter?.candidates ?? []).filter((candidate: any) =>
                  params.acceptedCandidateIds.includes(candidate.candidateId)
                )
              : (params.itemAdapter?.candidates ?? []);
        let projectedSecretVersions = Object.fromEntries(
          Object.entries(secrets).map(([name, secret]) => [name, secret.version])
        );
        return {
          bindings: {
            grantId: envelope.grantId,
            tenantId: 'local-tenant',
            slateInstanceId: 'local-instance',
            configSchemaVersion: 2,
            configSchemaHash: 'local-schema',
            hubInvocationId: 'local-invocation',
            requestId: expected.requestId,
            actionId: expected.actionId,
            operation: expected.operation,
            specHash: params.specHash,
            ruleId: params.ruleId,
            originalRequestHash: params.originalRequestHash,
            dispatchRequestHash: params.dispatchRequestHash ?? params.originalRequestHash,
            issuedAtMs: now - 1,
            expiresAtMs: now + 60_000,
            receiverId: 'local-receiver',
            receiverTriggerId:
              params.receiverTriggerId ?? params.triggerId ?? 'local-receiver-trigger',
            registrationStatus:
              expected.operation === 'webhook_bootstrap_capture'
                ? 'registering'
                : 'registered',
            registrationGeneration: 1,
            registrationVersion: params.registrationVersion ?? 1,
            projectedSecretVersions,
            candidateBindings
          } as any,
          secrets,
          clear: () => localScopedState.delete(expected.requestId)
        };
      }
      return {
        bindings: {
          grantId: envelope.grantId,
          deploymentId: 'local-deployment',
          runtimeIdentityId: 'local-runtime',
          runtimeIdentityGeneration: 1,
          tenantId: 'local-tenant',
          slateInstanceId: 'local-instance',
          configSchemaVersion: 2,
          configSchemaHash: 'local-schema',
          hubInvocationId: 'local-invocation',
          requestId: expected.requestId,
          actionId: expected.actionId,
          operation: expected.operation,
          issuedAtMs: now - 1,
          expiresAtMs: now + 60_000,
          configSecretVersions,
          authConfigId: 'local-auth',
          authSecretVersions
        },
        secrets,
        clear: () => localScopedState.delete(expected.requestId)
      };
    }
  };
  let createManager = () =>
    createProviderHandler(d.slate, d.listeners ?? [], localSecurity).run();
  let managerPromise = createManager();

  return {
    async send(messages) {
      let config = (
        messages.find(message => message.method === 'slates/config.set') as
          | Extract<SlatesNotifications, { method: 'slates/config.set' }>
          | undefined
      )?.params.config as Record<string, unknown> | undefined;
      let auth = (
        messages.find(message => message.method === 'slates/auth.set') as
          | Extract<SlatesNotifications, { method: 'slates/auth.set' }>
          | undefined
      )?.params.output as Record<string, unknown> | undefined;
      let preparedMessages = messages.map(message => {
        if (
          d.security ||
          message.method !== 'slates/action.tool.invoke' ||
          !('id' in message) ||
          message.invocation
        ) {
          return message;
        }
        localScopedState.set(message.id, {
          config: config ?? d.scopedState?.config ?? {},
          auth: auth ?? d.scopedState?.auth ?? {},
          secrets: d.scopedState?.secrets ?? {},
          request: message
        });
        return {
          ...message,
          invocation: {
            version: 'scoped_invocation_grant_v1' as const,
            grantId: `local-${message.id}`,
            token: 'local-only',
            requestId: message.id
          }
        };
      }) as ProviderMessage[];
      let usesScopedInvocation = preparedMessages.some(
        message => 'invocation' in message && message.invocation !== undefined
      );
      // Scoped calls get a fresh handler instance so previously supplied config/auth/session
      // state can never become an accidental authority or secret projection.
      let manager = usesScopedInvocation ? await createManager() : await managerPromise;
      let responses: ProviderResponse[] = [];

      for (let message of preparedMessages) {
        let response: any;
        try {
          response = await SlatesProviderProtoHandlerManager.handleInput(manager, message);
        } catch (error) {
          throw toTransportError(error, 'Local slate invocation failed');
        }

        if (response) {
          responses.push(response as ProviderResponse);
        }
      }

      return responses;
    },
    async sendScoped({ requestId, messages }) {
      let request = messages.find(
        (message): message is Extract<SlatesRequests, { id: string }> =>
          'id' in message && message.id === requestId
      );
      if (!request) throw new Error('Local scoped request is missing');
      if (!d.security) {
        localScopedState.set(requestId, {
          config: d.scopedState?.config ?? {},
          auth: d.scopedState?.auth ?? {},
          secrets: d.scopedState?.secrets ?? {},
          request
        });
      }
      let manager = await createManager();
      let responses: ProviderResponse[] = [];
      for (let message of messages) {
        let response: any;
        try {
          response = await SlatesProviderProtoHandlerManager.handleInput(manager, message);
        } catch (error) {
          throw toTransportError(error, 'Local scoped slate invocation failed');
        }
        if (response) responses.push(response as ProviderResponse);
      }
      return responses;
    },
    async terminateScoped({ requestId }) {
      localScopedState.delete(requestId);
      return { status: 'terminated', requestId };
    }
  };
};
