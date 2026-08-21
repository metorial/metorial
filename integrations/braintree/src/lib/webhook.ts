import * as braintree from 'braintree';

export type BraintreeWebhookCredentials = Readonly<{
  environment: string;
  merchantId: string;
  publicKey: string;
  privateKey: string;
}>;

let createGateway = (credentials: BraintreeWebhookCredentials) =>
  new braintree.BraintreeGateway({
    environment:
      credentials.environment === 'sandbox'
        ? braintree.Environment.Sandbox
        : braintree.Environment.Production,
    merchantId: credentials.merchantId,
    publicKey: credentials.publicKey,
    privateKey: credentials.privateKey
  });

/** Uses the supported Braintree SDK for the exact challenge response. */
export let generateChallengeResponse = (
  credentials: BraintreeWebhookCredentials,
  challenge: string
) =>
  (
    createGateway(credentials).webhookNotification as unknown as {
      verify(challengeValue: string): string;
    }
  ).verify(challenge);

/** Uses the supported Braintree SDK for signature verification and XML decoding. */
export let verifyAndParseWebhook = async (
  credentials: BraintreeWebhookCredentials,
  btSignature: string,
  btPayload: string
) => {
  let notification = await createGateway(credentials).webhookNotification.parse(
    btSignature,
    btPayload
  );
  let timestamp: unknown = notification.timestamp;
  let {
    kind: _kind,
    timestamp: _timestamp,
    ...subject
  } = notification as unknown as Record<string, any>;
  return {
    kind: String(notification.kind ?? ''),
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp ?? ''),
    subject
  };
};
