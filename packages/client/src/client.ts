import {
  SLATES_PROTOCOL_VERSION,
  type SlateAuthenticationMethod,
  type SlatesAction,
  type SlatesActionTool,
  type SlatesMessageActionGetResponse,
  type SlatesMessageActionInvokeResponse,
  type SlatesMessageActionsListResponse,
  type SlatesMessageActionTriggerEventMapResponse,
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
  type SlatesMessageTriggerGroupGetResponse,
  type SlatesMessageTriggerGroupPollingPollResponse,
  type SlatesMessageTriggerGroupRoutingMatchersGetResponse,
  type SlatesMessageTriggerGroupsListResponse,
  type SlatesMessageTriggerGroupWebhookManualFinishResponse,
  type SlatesMessageTriggerGroupWebhookManualSetupResponse,
  type SlatesMessageTriggerGroupWebhookProcessResponse,
  type SlatesMessageTriggerGroupWebhookRegisterResponse,
  type SlatesMessageTriggerGroupWebhookTargetsListResponse,
  type SlatesMessageTriggerGroupWebhookUnregisterResponse,
  type SlatesParticipant,
  type SlatesRequests,
  type SlatesResponsesByMethod
} from '@slates/proto';
import { randomUUID } from 'crypto';
import { SlateProtocolError } from './error';
import type { SlatesClientState, SlatesProtocolClientOptions } from './types';

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
      auth: opts.state?.auth ?? null,
      session: opts.state?.session ?? null,
      capabilities:
        opts.state && 'capabilities' in opts.state
          ? (opts.state.capabilities ?? null)
          : { triggers: true }
    };
  }

  setParticipants(participants: SlatesParticipant[]) {
    this.state.participants = participants;
    return this;
  }

  setConfig(config: Record<string, any> | null) {
    this.state.config = config;
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

  setCapabilities(capabilities: SlatesClientState['capabilities']) {
    this.state.capabilities = capabilities;
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
      ...(this.state.capabilities
        ? [
            {
              jsonrpc: '2.0' as const,
              method: 'slates/hub.capabilities.set' as const,
              params: { capabilities: this.state.capabilities }
            }
          ]
        : []),
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

  async identify(): Promise<SlatesMessageProviderIdentifyResponse['result']> {
    return this.request('slates/provider.identify', {});
  }

  async listActions(): Promise<SlatesMessageActionsListResponse['result']> {
    return this.request('slates/actions.list', {});
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
    return this.request('slates/action.get', { actionId });
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

  async getConfigSchema(): Promise<SlatesMessageConfigSchemaGetResponse['result']> {
    return this.request('slates/config.schema.get', {});
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

  async listTriggerGroups(): Promise<SlatesMessageTriggerGroupsListResponse['result']> {
    return this.request('slates/trigger_groups.list', {});
  }

  async getTriggerGroup(
    triggerGroupId: string
  ): Promise<SlatesMessageTriggerGroupGetResponse['result']> {
    return this.request('slates/trigger_group.get', { triggerGroupId });
  }

  async listTriggerGroupWebhookTargets(d: {
    triggerGroupId: string;
    pageToken?: any;
  }): Promise<SlatesMessageTriggerGroupWebhookTargetsListResponse['result']> {
    this.ensureSession();
    return this.request('slates/trigger_group.webhook.targets_list', {
      triggerGroupId: d.triggerGroupId,
      pageToken: d.pageToken ?? null
    });
  }

  async registerTriggerGroupWebhook(d: {
    triggerGroupId: string;
    webhookTargetIdentifier: string;
    webhookTargetPayload: any;
    webhookUrl: string;
  }): Promise<SlatesMessageTriggerGroupWebhookRegisterResponse['result']> {
    this.ensureSession();
    return this.request('slates/trigger_group.webhook.register', d);
  }

  async unregisterTriggerGroupWebhook(d: {
    triggerGroupId: string;
    webhookRegistrationIdentifier: string;
    webhookRegistrationPayload: any;
  }): Promise<SlatesMessageTriggerGroupWebhookUnregisterResponse['result']> {
    this.ensureSession();
    return this.request('slates/trigger_group.webhook.unregister', d);
  }

  async setupTriggerGroupWebhookManually(d: {
    triggerGroupId: string;
    webhookUrl: string;
  }): Promise<SlatesMessageTriggerGroupWebhookManualSetupResponse['result']> {
    return this.request('slates/trigger_group.webhook.manual_setup', d);
  }

  async finishTriggerGroupWebhookManualSetup(d: {
    triggerGroupId: string;
    webhookUrl: string;
    partialWebhookRegistrationPayload: any;
    userWebhookRegistrationPayload: any;
  }): Promise<SlatesMessageTriggerGroupWebhookManualFinishResponse['result']> {
    return this.request('slates/trigger_group.webhook.manual_finish', d);
  }

  async processTriggerGroupWebhook(d: {
    triggerGroupId: string;
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array | null;
    webhookRegistrationPayload: any;
  }): Promise<SlatesMessageTriggerGroupWebhookProcessResponse['result']> {
    let encodedBody =
      typeof d.body === 'string'
        ? Buffer.from(d.body, 'utf-8').toString('base64')
        : d.body
          ? Buffer.from(d.body).toString('base64')
          : null;

    return this.request('slates/trigger_group.webhook.process', {
      triggerGroupId: d.triggerGroupId,
      url: d.url,
      method: d.method,
      headers: d.headers ?? {},
      body: encodedBody
        ? {
            encoding: 'base64',
            content: encodedBody
          }
        : null,
      webhookRegistrationPayload: d.webhookRegistrationPayload
    });
  }

  async getTriggerGroupRoutingMatchers(
    triggerGroupId: string
  ): Promise<SlatesMessageTriggerGroupRoutingMatchersGetResponse['result']> {
    this.ensureSession();
    return this.request('slates/trigger_group.routing_matchers.get', { triggerGroupId });
  }

  async pollTriggerGroup(d: {
    triggerGroupId: string;
    state?: any;
  }): Promise<SlatesMessageTriggerGroupPollingPollResponse['result']> {
    this.ensureSession();
    return this.request('slates/trigger_group.polling.poll', {
      triggerGroupId: d.triggerGroupId,
      state: d.state ?? null
    });
  }

  async close() {
    await this.transport.close?.();
  }
}
