import {
  computeWebhookActionSpecHashV1,
  parseWebhookWireRequest,
  parseWebhookWireResponse,
  SLATES_PROTOCOL_VERSION,
  type SlateAuthenticationMethod,
  type SlatesAction,
  type SlatesActionTool,
  type SlatesMessageActionGetResponse,
  type SlatesMessageActionInvokeResponse,
  type SlatesMessageActionsListResponse,
  type SlatesMessageActionTriggerEventMapResponse,
  type SlatesMessageActionTriggerWebhookBootstrapCaptureResponse,
  type SlatesMessageActionTriggerWebhookHandleResponse,
  type SlatesMessageActionTriggerWebhookHandleScopedRequest,
  type SlatesMessageActionTriggerWebhookRegisterResponse,
  type SlatesMessageActionTriggerWebhookUnregisterResponse,
  type SlatesMessageActionTriggerWebhookVerifyResponse,
  type SlatesMessageAuthAuthorizationUrlGetResponse,
  type SlatesMessageAuthDefaultInputGetResponse,
  type SlatesMessageAuthInputChangedResponse,
  type SlatesMessageAuthMethodGetResponse,
  type SlatesMessageAuthOutputGetResponse,
  type SlatesMessageAuthProfileGetResponse,
  type SlatesMessageAuthTokenRefreshHandleResponse,
  type SlatesMessageConfigChangedResponse,
  type SlatesMessageConfigDefaultGetResponse,
  type SlatesMessageConfigSchemaGetResponse,
  type SlatesMessageProviderIdentifyResponse,
  type SlatesParticipant,
  type SlatesRequests,
  type SlatesResponsesByMethod,
  type SlatesScopedInvocationGrantEnvelope,
  type WebhookBootstrapCaptureInput,
  type WebhookVerifyInput,
  type WebhookWireRequest,
  type WebhookWireResponse
} from '@slates/proto';
import { randomUUID } from 'crypto';
import { SlateProtocolError } from './error';
import { sendScopedWithTermination } from './transport';
import type {
  SlatesClientState,
  SlatesProtocolClientOptions,
  SlatesWebhookCapability,
  SlatesWebhookCapabilityNegotiation
} from './types';

let createDefaultParticipants = (): SlatesParticipant[] => [
  {
    type: 'consumer',
    id: 'slates-client',
    name: 'Slates Client'
  }
];

export class SlatesProtocolClient {
  readonly transport: SlatesProtocolClientOptions['transport'];
  state: SlatesClientState;

  constructor(opts: SlatesProtocolClientOptions) {
    this.transport = opts.transport;
    this.state = {
      protocol: SLATES_PROTOCOL_VERSION,
      participants: opts.participants ?? createDefaultParticipants(),
      config: opts.state?.config ?? null,
      configSchema: opts.state?.configSchema ?? null,
      auth: opts.state?.auth ?? null,
      session: opts.state?.session ?? null
    };
  }

  setParticipants(participants: SlatesParticipant[]) {
    this.state.participants = participants;
    return this;
  }

  normalizeWebhookWireRequest(request: unknown): WebhookWireRequest {
    return parseWebhookWireRequest(request);
  }

  normalizeWebhookWireResponse(response: unknown): WebhookWireResponse {
    return parseWebhookWireResponse(response);
  }

  verifyWebhookActionSpecHash(action: SlatesAction) {
    if (action.type !== 'action.trigger' || action.invocation.type !== 'webhook')
      return action;

    if (!action.specHash) {
      throw new Error(`Webhook action ${action.id} is missing its v1 spec hash.`);
    }
    let expectedSpecHash = computeWebhookActionSpecHashV1({
      id: action.id,
      type: action.type,
      capabilities: action.capabilities,
      invocation: action.invocation
    });
    if (action.specHash !== expectedSpecHash) {
      throw new Error(`Webhook action ${action.id} has an invalid v1 spec hash.`);
    }

    return action;
  }

  setConfig(config: Record<string, any> | null) {
    this.state.config = config;
    return this;
  }

  setConfigSchema(schema: SlatesClientState['configSchema']) {
    this.state.configSchema = schema;
    if (this.state.config) this.setConfig(this.state.config);
    return this;
  }

  setAuth(auth: SlatesClientState['auth']) {
    this.state.auth = auth;
    return this;
  }

  clearAuth() {
    this.state.auth = null;
    return this;
  }

  setSession(session: SlatesClientState['session']) {
    this.state.session = session;
    return this;
  }

  ensureSession() {
    if (!this.state.session) {
      this.state.session = {
        id: randomUUID(),
        state: {}
      };
    }

    return this.state.session;
  }

  private buildStateMessages() {
    return [
      {
        jsonrpc: '2.0' as const,
        method: 'slates/hello' as const,
        params: { protocol: this.state.protocol }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/participant.set' as const,
        params: { participants: this.state.participants }
      },
      ...(this.state.config
        ? [
            {
              jsonrpc: '2.0' as const,
              method: 'slates/config.set' as const,
              params: { config: this.state.config }
            }
          ]
        : []),
      ...(this.state.auth
        ? [
            {
              jsonrpc: '2.0' as const,
              method: 'slates/auth.set' as const,
              params: {
                authenticationMethodId: this.state.auth.authenticationMethodId,
                output: this.state.auth.output
              }
            }
          ]
        : []),
      ...(this.state.session
        ? [
            {
              jsonrpc: '2.0' as const,
              method: 'slates/session.start' as const,
              params: {
                sessionId: this.state.session.id,
                state: this.state.session.state
              }
            }
          ]
        : [])
    ];
  }

  async request<Key extends keyof SlatesResponsesByMethod & SlatesRequests['method']>(
    method: Key,
    params: Extract<SlatesRequests, { method: Key }>['params']
  ): Promise<SlatesResponsesByMethod[Key]['result']> {
    let id = randomUUID();
    let responses = await this.transport.send([
      ...this.buildStateMessages(),
      {
        jsonrpc: '2.0',
        id,
        method,
        params
      } as Extract<SlatesRequests, { method: Key }>
    ]);

    let response = responses.find(message => 'id' in message && message.id === id) as
      | { result?: any; error?: any }
      | undefined;

    if (!response) {
      throw new Error(`No response was returned for method ${String(method)}.`);
    }

    if (response.error) {
      throw SlateProtocolError.fromResponse(response.error);
    }

    return response.result;
  }

  private async requestWithScopedInvocationGrant<
    Key extends
      | 'slates/action.tool.invoke'
      | 'slates/action.trigger.webhook_verify'
      | 'slates/action.trigger.webhook_bootstrap_capture'
      | 'slates/action.trigger.webhook_handle'
  >(
    method: Key,
    params: Extract<SlatesRequests, { method: Key }>['params'],
    invocation: SlatesScopedInvocationGrantEnvelope
  ): Promise<SlatesResponsesByMethod[Key]['result']> {
    if (invocation.version !== 'scoped_invocation_grant_v1') {
      throw new Error('The scoped invocation grant version is invalid.');
    }
    if (
      method !== 'slates/action.tool.invoke' &&
      method !== 'slates/action.trigger.webhook_handle' &&
      invocation.requestId !== (params as { requestId: string }).requestId
    ) {
      throw new Error('The scoped invocation grant must bind the webhook request ID.');
    }

    let responses = await sendScopedWithTermination({
      transport: this.transport,
      requestId: invocation.requestId,
      messages: [
        ...this.buildStateMessages().filter(
          message =>
            message.method === 'slates/hello' ||
            message.method === 'slates/participant.set' ||
            message.method === 'slates/config.set'
        ),
        {
          jsonrpc: '2.0',
          id: invocation.requestId,
          method,
          invocation,
          params
        } as Extract<SlatesRequests, { method: Key }>
      ]
    });
    let response = responses.find(
      message => 'id' in message && message.id === invocation.requestId
    ) as { result?: any; error?: any } | undefined;
    if (!response) throw new Error(`No response was returned for method ${method}.`);
    if (response.error) throw SlateProtocolError.fromResponse(response.error);
    return response.result;
  }

  async identify(): Promise<SlatesMessageProviderIdentifyResponse['result']> {
    return this.request('slates/provider.identify', {});
  }

  async supportsWebhookCapability(capability: SlatesWebhookCapability) {
    let provider = await this.identify();
    return provider.capabilities?.[capability] === true;
  }

  async negotiateWebhookCapabilities(
    actionId: string
  ): Promise<SlatesWebhookCapabilityNegotiation> {
    let [provider, { action }] = await Promise.all([
      this.identify(),
      this.getAction(actionId)
    ]);
    let providerCapabilities = provider.capabilities;
    let actionCapabilities = action.type === 'action.trigger' ? action.capabilities : {};
    let scoped = providerCapabilities?.scopedInvocationGrantV1 === true;
    let providerRegistration = providerCapabilities?.webhookSecretNegotiationV1 === true;
    let actionRegistration = actionCapabilities.webhookSecretNegotiationV1 === true;
    let providerVerification = providerCapabilities?.webhookInboundVerificationV1 === true;
    let actionVerification = actionCapabilities.webhookInboundVerificationV1 === true;
    let providerBootstrap = providerCapabilities?.webhookInboundBootstrapCaptureV1 === true;
    let actionBootstrap = actionCapabilities.webhookInboundBootstrapCaptureV1 === true;
    return {
      registration:
        !providerRegistration && !actionRegistration
          ? ({ status: 'legacy', code: 'capability_absent' } as const)
          : providerRegistration && actionRegistration && scoped
            ? ({ status: 'v1' } as const)
            : ({
                status: 'fail_closed',
                code: 'webhook_registration_capabilities_inconsistent'
              } as const),
      verification:
        !providerVerification && !actionVerification
          ? ({ status: 'legacy', code: 'capability_absent' } as const)
          : providerVerification && actionVerification && scoped
            ? ({ status: 'v1' } as const)
            : ({
                status: 'fail_closed',
                code: 'webhook_verification_capabilities_inconsistent'
              } as const),
      bootstrapCapture:
        !providerBootstrap && !actionBootstrap
          ? ({ status: 'unavailable', code: 'capability_absent' } as const)
          : providerBootstrap &&
              actionBootstrap &&
              scoped &&
              providerVerification &&
              actionVerification
            ? ({ status: 'v1' } as const)
            : ({
                status: 'fail_closed',
                code: 'webhook_bootstrap_capabilities_inconsistent'
              } as const)
    };
  }

  async listActions(): Promise<SlatesMessageActionsListResponse['result']> {
    let result = await this.request('slates/actions.list', {});
    result.actions.forEach(action => this.verifyWebhookActionSpecHash(action));
    return result;
  }

  async listTools(): Promise<SlatesActionTool[]> {
    let result = await this.listActions();
    return result.actions.filter(
      (action): action is SlatesActionTool => action.type === 'action.tool'
    );
  }

  async listTriggers(): Promise<SlatesAction[]> {
    let result = await this.listActions();
    return result.actions.filter(action => action.type === 'action.trigger');
  }

  async getAction(actionId: string): Promise<SlatesMessageActionGetResponse['result']> {
    let result = await this.request('slates/action.get', { actionId });
    this.verifyWebhookActionSpecHash(result.action);
    return result;
  }

  async getTool(actionId: string) {
    let result = await this.getAction(actionId);
    if (result.action.type !== 'action.tool') {
      throw new Error(`Action ${actionId} is not a tool.`);
    }

    return result.action;
  }

  async getTrigger(actionId: string) {
    let result = await this.getAction(actionId);
    if (result.action.type !== 'action.trigger') {
      throw new Error(`Action ${actionId} is not a trigger.`);
    }

    return result.action;
  }

  async getTriggerWebhookIngress(actionId: string) {
    let trigger = await this.getTrigger(actionId);
    if (trigger.invocation.type !== 'webhook') return null;
    return trigger.invocation.http?.ingress ?? null;
  }

  async getConfigSchema(): Promise<SlatesMessageConfigSchemaGetResponse['result']> {
    let result = await this.request('slates/config.schema.get', {});
    this.setConfigSchema(result.schema);
    return result;
  }

  async getDefaultConfig(): Promise<SlatesMessageConfigDefaultGetResponse['result']> {
    return this.request('slates/config.get_default', {});
  }

  async updateConfig(
    previousConfig: Record<string, any> | null,
    newConfig: Record<string, any>
  ): Promise<SlatesMessageConfigChangedResponse['result']> {
    return this.request('slates/config.changed', {
      previousConfig,
      newConfig
    });
  }

  async listAuthMethods(): Promise<{ authenticationMethods: SlateAuthenticationMethod[] }> {
    return this.request('slates/auth.methods.list', {});
  }

  async getAuthMethod(
    authenticationMethodId: string
  ): Promise<SlatesMessageAuthMethodGetResponse['result']> {
    return this.request('slates/auth.method.get', {
      authenticationMethodId
    });
  }

  async getDefaultAuthInput(
    authenticationMethodId: string
  ): Promise<SlatesMessageAuthDefaultInputGetResponse['result']> {
    return this.request('slates/auth.input.get_default', {
      authenticationMethodId
    });
  }

  async updateAuthInput(d: {
    authenticationMethodId: string;
    previousInput: Record<string, any> | null;
    newInput: Record<string, any>;
  }): Promise<SlatesMessageAuthInputChangedResponse['result']> {
    return this.request('slates/auth.input.changed', {
      authenticationMethodId: d.authenticationMethodId,
      previousInput: d.previousInput,
      newInput: d.newInput
    });
  }

  async getAuthOutput(d: {
    authenticationMethodId: string;
    input: Record<string, any>;
  }): Promise<SlatesMessageAuthOutputGetResponse['result']> {
    return this.request('slates/auth.output.get', {
      authenticationMethodId: d.authenticationMethodId,
      input: d.input
    });
  }

  async getAuthorizationUrl(d: {
    authenticationMethodId: string;
    redirectUri: string;
    state: string;
    input: Record<string, any>;
    clientId: string;
    clientSecret: string;
    scopes: string[];
  }): Promise<SlatesMessageAuthAuthorizationUrlGetResponse['result']> {
    return this.request('slates/auth.authorization_url.get', d);
  }

  async handleAuthorizationCallback(d: {
    authenticationMethodId: string;
    code: string;
    state: string;
    redirectUri: string;
    input: Record<string, any>;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    callbackParams?: Record<string, string>;
    callbackState?: Record<string, any>;
  }): Promise<{
    output: Record<string, any>;
    input?: Record<string, any>;
    scopes?: string[];
  }> {
    return this.request('slates/auth.authorization_callback.handle', d);
  }

  async refreshToken(d: {
    authenticationMethodId: string;
    output: Record<string, any>;
    input: Record<string, any>;
    clientId: string;
    clientSecret: string;
    scopes: string[];
  }): Promise<SlatesMessageAuthTokenRefreshHandleResponse['result']> {
    return this.request('slates/auth.token_refresh.handle', d);
  }

  async getAuthProfile(d: {
    authenticationMethodId: string;
    output: Record<string, any>;
    input: Record<string, any>;
    scopes: string[];
  }): Promise<SlatesMessageAuthProfileGetResponse['result']> {
    return this.request('slates/auth.profile.get', d);
  }

  async invokeTool(
    actionId: string,
    input: Record<string, any>
  ): Promise<SlatesMessageActionInvokeResponse['result']> {
    this.ensureSession();
    return this.request('slates/action.tool.invoke', {
      actionId,
      input
    });
  }

  async invokeReceiverBoundTool(
    actionId: string,
    input: Record<string, any>,
    invocation: SlatesScopedInvocationGrantEnvelope
  ): Promise<SlatesMessageActionInvokeResponse['result']> {
    this.ensureSession();
    let provider = await this.identify();
    let { action } = await this.getAction(actionId);
    if (
      provider.capabilities?.scopedInvocationGrantV1 !== true ||
      provider.capabilities?.receiverBoundToolContextV1 !== true ||
      action.type !== 'action.tool' ||
      !action.capabilities.receiverBoundToolContextV1
    ) {
      throw new Error('Receiver-bound tool context is not supported by this action.');
    }
    return this.requestWithScopedInvocationGrant(
      'slates/action.tool.invoke',
      { actionId, input },
      invocation
    );
  }

  async mapTriggerEvent(
    actionId: string,
    input: Record<string, any>
  ): Promise<SlatesMessageActionTriggerEventMapResponse['result']> {
    this.ensureSession();
    return this.request('slates/action.trigger.map_event', {
      actionId,
      input
    });
  }

  async registerTriggerWebhook(
    actionId: string,
    webhookBaseUrl: string,
    registrationDetails?: unknown
  ): Promise<SlatesMessageActionTriggerWebhookRegisterResponse['result']> {
    this.ensureSession();
    // Registration deliberately retains the reviewed legacy RPC when v1 is not advertised.
    // Both paths carry the same public input; only the v1 response may negotiate captures.
    let capabilities = await this.negotiateWebhookCapabilities(actionId);
    if (capabilities.registration.status === 'fail_closed') {
      throw new Error(capabilities.registration.code);
    }
    return this.request('slates/action.trigger.webhook_register', {
      actionId,
      webhookBaseUrl,
      registrationDetails
    });
  }

  async verifyTriggerWebhook(
    input: WebhookVerifyInput,
    invocation: SlatesScopedInvocationGrantEnvelope
  ): Promise<SlatesMessageActionTriggerWebhookVerifyResponse['result']> {
    let capabilities = await this.negotiateWebhookCapabilities(input.actionId);
    if (capabilities.verification.status === 'fail_closed') {
      throw new Error(capabilities.verification.code);
    }
    if (capabilities.verification.status !== 'v1') {
      throw new Error(
        'Provider does not advertise scoped inbound webhook verification; use the explicit legacy Hub fallback.'
      );
    }
    return this.requestWithScopedInvocationGrant(
      'slates/action.trigger.webhook_verify',
      input,
      invocation
    );
  }

  async captureTriggerWebhookBootstrap(
    input: WebhookBootstrapCaptureInput,
    invocation: SlatesScopedInvocationGrantEnvelope
  ): Promise<SlatesMessageActionTriggerWebhookBootstrapCaptureResponse['result']> {
    let capabilities = await this.negotiateWebhookCapabilities(input.actionId);
    if (capabilities.bootstrapCapture.status === 'fail_closed') {
      throw new Error(capabilities.bootstrapCapture.code);
    }
    if (capabilities.bootstrapCapture.status !== 'v1') {
      throw new Error('Provider does not advertise scoped inbound webhook bootstrap capture.');
    }
    return this.requestWithScopedInvocationGrant(
      'slates/action.trigger.webhook_bootstrap_capture',
      input,
      invocation
    );
  }

  async handleTriggerWebhook(d: {
    actionId: string;
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array | null;
    state?: any;
    registrationDetails?: any;
  }): Promise<SlatesMessageActionTriggerWebhookHandleResponse['result']> {
    this.ensureSession();
    let encodedBody =
      typeof d.body === 'string'
        ? Buffer.from(d.body, 'utf-8').toString('base64')
        : d.body
          ? Buffer.from(d.body).toString('base64')
          : null;

    return this.request('slates/action.trigger.webhook_handle', {
      actionId: d.actionId,
      url: d.url,
      method: d.method,
      headers: d.headers ?? {},
      body: encodedBody
        ? {
            encoding: 'base64',
            content: encodedBody
          }
        : null,
      state: d.state ?? null,
      registrationDetails: d.registrationDetails ?? null
    });
  }

  async handleVerifiedTriggerWebhook(
    params: SlatesMessageActionTriggerWebhookHandleScopedRequest['params'],
    invocation: SlatesScopedInvocationGrantEnvelope
  ): Promise<SlatesMessageActionTriggerWebhookHandleResponse['result']> {
    return this.requestWithScopedInvocationGrant(
      'slates/action.trigger.webhook_handle',
      params,
      invocation
    );
  }

  async unregisterTriggerWebhook(d: {
    actionId: string;
    webhookBaseUrl: string;
    registrationDetails: any;
    state?: any;
  }): Promise<SlatesMessageActionTriggerWebhookUnregisterResponse['result']> {
    this.ensureSession();
    return this.request('slates/action.trigger.webhook_unregister', {
      actionId: d.actionId,
      webhookBaseUrl: d.webhookBaseUrl,
      registrationDetails: d.registrationDetails,
      state: d.state ?? null
    });
  }

  async close() {
    await this.transport.close?.();
  }
}
