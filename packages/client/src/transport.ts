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
    authenticationMethodId?: string | null;
    auth?: Record<string, unknown>;
    secrets?: Record<string, unknown>;
  };
}): SlatesMessageTransport => {
  let localScopedState = new Map<
    string,
    {
      config: Record<string, unknown>;
      authenticationMethodId: string | null;
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
        expected.secretNames.map(name => {
          let matchingSecretRefs = secretRefs.filter(
            (candidate: any) => candidate.name === name
          );
          let eligibleSecretRefs = matchingSecretRefs.filter((candidate: any) => {
            if (!('authMethods' in candidate) || candidate.authMethods === undefined) {
              return true;
            }
            return (
              state.authenticationMethodId !== null &&
              candidate.authMethods.includes(state.authenticationMethodId)
            );
          });
          if (matchingSecretRefs.length > 0 && eligibleSecretRefs.length !== 1) {
            throw new Error(
              `Local scoped secret ${name} is unavailable for authentication method ${state.authenticationMethodId ?? 'none'}`
            );
          }
          let secretRef = eligibleSecretRefs[0];
          let raw = name.startsWith('receiver_callback:')
            ? state.secrets[name.slice('receiver_callback:'.length)]
            : name === 'auth:$output'
              ? state.auth
              : secretRef?.source === 'auth_config' ||
                  secretRef?.source === 'oauth_credentials'
                ? state.auth[secretRef.credentialKey]
                : secretRef?.source === 'callback_secret'
                  ? state.secrets[secretRef.callbackSecretKey]
                  : secretRef?.source === 'registration'
                    ? (state.secrets[secretRef.registrationKey] ?? state.secrets[name])
                    : state.secrets[name];
          if (raw === undefined) {
            throw new Error(`Local scoped secret ${name} is unavailable`);
          }
          return [
            name,
            {
              value:
                expected.operation === 'tool_invoke' || typeof raw !== 'string'
                  ? JSON.stringify(raw)
                  : raw
            }
          ];
        })
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
        let callbackSecretIds = Object.fromEntries(
          expected.callbackSecretNames.map(name => [name, `local-secret:${name}`])
        );
        return {
          bindings: {
            grantId: envelope.grantId,
            tenantId: 'local-tenant',
            slateInstanceId: 'local-instance',
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
            authConfigId: state.authenticationMethodId !== null ? 'local-auth' : null,
            callbackSecretIds,
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
          hubInvocationId: 'local-invocation',
          requestId: expected.requestId,
          actionId: expected.actionId,
          operation: expected.operation,
          issuedAtMs: now - 1,
          expiresAtMs: now + 60_000,
          authConfigId: state.authenticationMethodId !== null ? 'local-auth' : null,
          ...(expected.callbackSecretNames.length > 0
            ? {
                receiverCallback: {
                  receiverId: 'local-receiver',
                  receiverTriggerId: 'local-receiver-trigger',
                  triggerActionId: expected.actionId,
                  specHash: 'local-spec',
                  registrationGeneration: 1,
                  registrationVersion: 1,
                  callbackSecretIds: Object.fromEntries(
                    expected.callbackSecretNames.map(name => [name, `local-secret:${name}`])
                  )
                }
              }
            : {})
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
      let manager = await managerPromise;
      let responses: ProviderResponse[] = [];

      for (let message of messages) {
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
        let config = (
          messages.find(message => message.method === 'slates/config.set') as
            | Extract<SlatesNotifications, { method: 'slates/config.set' }>
            | undefined
        )?.params.config as Record<string, unknown> | undefined;
        localScopedState.set(requestId, {
          config: config ?? d.scopedState?.config ?? {},
          authenticationMethodId: d.scopedState?.authenticationMethodId ?? null,
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
