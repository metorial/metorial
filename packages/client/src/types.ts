import type {
  SlateConfigSchemaWire,
  SlatesNotifications,
  SlatesParticipant,
  SlatesProtocolVersion,
  SlatesRequests,
  SlatesResponses
} from '@slates/proto';
import type { ProviderHandlerSecurityOptions } from '@slates/provider-handler';

export type SlatesJsonObject = Record<string, any>;
export type SlatesProtocolMessage = SlatesNotifications | SlatesRequests;
export type SlatesProtocolResponse = SlatesNotifications | SlatesResponses;

export interface SlatesClientState {
  protocol: SlatesProtocolVersion;
  participants: SlatesParticipant[];
  config: SlatesJsonObject | null;
  configSchema: SlateConfigSchemaWire | null;
  auth: {
    authenticationMethodId: string;
    output: SlatesJsonObject;
  } | null;
  session: {
    id: string;
    state: SlatesJsonObject;
  } | null;
}

export interface SlatesMessageTransport {
  send(messages: SlatesProtocolMessage[]): Promise<SlatesProtocolResponse[]>;
  sendScoped?(d: {
    requestId: string;
    messages: SlatesProtocolMessage[];
  }): Promise<SlatesProtocolResponse[]>;
  terminateScoped?(d: {
    requestId: string;
    reason: 'timeout' | 'cancelled';
  }): Promise<{ status: 'terminated'; requestId: string }>;
  scopedTimeoutMs?: number;
  close?(): Promise<void> | void;
}

export interface SlatesProtocolClientOptions {
  transport: SlatesMessageTransport;
  participants?: SlatesParticipant[];
  state?: Partial<SlatesClientState>;
}

export type SlatesWebhookCapability =
  | 'configSchemaV2'
  | 'scopedInvocationGrantV1'
  | 'receiverBoundToolContextV1'
  | 'webhookSecretNegotiationV1'
  | 'webhookInboundVerificationV1'
  | 'webhookInboundBootstrapCaptureV1';

export type SlatesWebhookCapabilityDecision =
  | { status: 'v1' }
  | { status: 'legacy'; code: 'capability_absent' }
  | {
      status: 'fail_closed';
      code:
        | 'webhook_registration_capabilities_inconsistent'
        | 'webhook_verification_capabilities_inconsistent'
        | 'webhook_bootstrap_capabilities_inconsistent';
    };

export type SlatesWebhookBootstrapCapabilityDecision =
  | { status: 'v1' }
  | { status: 'unavailable'; code: 'capability_absent' }
  | Extract<SlatesWebhookCapabilityDecision, { status: 'fail_closed' }>;

export interface SlatesWebhookCapabilityNegotiation {
  registration: SlatesWebhookCapabilityDecision;
  verification: SlatesWebhookCapabilityDecision;
  bootstrapCapture: SlatesWebhookBootstrapCapabilityDecision;
}

export type SlatesConfigCapabilityDecision =
  | { status: 'v2' }
  | {
      status: 'v1_compatibility';
      integrationId: 'looker' | 'tableau';
      cutoffAt: string;
      expiresAt: string;
    }
  | {
      status: 'fail_closed';
      code:
        | 'config_schema_capability_mismatch'
        | 'config_v1_not_allowlisted'
        | 'config_v1_cutoff_expired'
        | 'config_secret_scope_unavailable';
    };

export interface SlatesLocalTransportSecurityOptions extends ProviderHandlerSecurityOptions {}
