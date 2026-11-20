export interface PubSubPushIdentity {
  subscriptionName: string;
  audience: string;
  serviceAccountEmail: string;
}

export interface PubSubMessage {
  subscription: string;
  messageId: string;
  publishTime: string;
  attributes: Record<string, string>;
  /** JSON-decoded data, absent for attribute-only notifications. */
  data?: unknown;
}
