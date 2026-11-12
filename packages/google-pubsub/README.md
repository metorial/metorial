# Google Pub/Sub transport

Shared Google Pub/Sub delivery for trigger groups that declare
`googlePubSub: { product }` (Gmail, Forms, Meet, Cloud Storage). A person
creates the Pub/Sub resources once per Google OAuth app and saves them as a
delivery config; integrations own their producer watches, renewal, event
schemas and per-registration identity checks. This package never calls the
Pub/Sub API and needs no credentials.

## Delivery config

Each group declares the shared setup next to its capability:

```ts
import { googlePubSubDeliveryConfig } from '@slates/google-pubsub';

triggerGroup(spec, { key: 'mailbox_events', name: 'Incoming email' }).webhook({
  googlePubSub: { product: 'gmail' },
  deliveryConfig: googlePubSubDeliveryConfig('gmail'),
  autoRegistration,
  process
});
```

`googlePubSubDeliveryConfig(product)` returns the `deliveryConfig` block:

- **Setup document.** Numbered steps for the Google Cloud console: create a
  topic in the Cloud project that owns the OAuth app, let the product publish
  to it, create a service account for push authentication, and create a push
  subscription whose endpoint and audience are the delivery URL. The publisher
  is `gmail-api-push@system.gserviceaccount.com`,
  `forms-notifications@system.gserviceaccount.com`, or
  `meet-api-event-push@system.gserviceaccount.com`; for Cloud Storage it is
  the Cloud Storage service agent of each project that owns a watched bucket.
- **What the person enters** (`userConfigSchema`): `oauthClientId`,
  `topicName` (`projects/<project>/topics/<name>`), `subscriptionName`
  (`projects/<project>/subscriptions/<name>`), and `pushServiceAccountEmail`.
- **What is saved** (`googlePubSubDeliveryConfigSchema`):
  `{ oauthClientId, googlePubSub }`, where `googlePubSub` is the descriptor
  below. `finish` takes the project from the topic name, uses the delivery URL
  as the audience, requires the topic and subscription to share a project, and
  rejects invalid input with an error that names the field.

The operator saves a config for the platform's managed OAuth app; a customer
saves one for their own OAuth app. The delivery URL rejects pushes until the
config is saved.

## Shared delivery model

One topic and one push subscription serve every registration of a product for
an OAuth app. Nothing is created or deleted per registration.

1. **Configure (person).** The saved delivery config names the topic,
   subscription, push service account and audience. Connections of that OAuth
   app receive it as the nonsecret descriptor `infrastructure.googlePubSub`.
2. **Register (integration).** Validate the descriptor with
   `parseGooglePubSubInfrastructure`, start or adopt the producer watch on its
   topic, save the descriptor in the registration payload (typed with
   `googlePubSubInfrastructureSchema`), and return `routingKeys` built with
   `googlePubSubRoutingKey`. On renewal, refuse a descriptor that differs from
   the saved one (`isSameGooglePubSubInfrastructure`).
3. **Receive (runtime).** Each push is verified once with
   `verifyGooglePubSubPush`, its keys are read with
   `extractGooglePubSubRoutingKeys`, and the request is handed to every active
   registration holding one of those keys.
4. **Process (integration).** Verify the push again against the saved
   descriptor, then check the producer identity (mailbox, form, subscription,
   bucket notification) against the registration.
5. **Unregister (integration).** Remove only the producer watch, and only when
   no other registration still uses it. The shared topic and subscription stay.

```ts
import {
  googlePubSubRoutingKey,
  parseGooglePubSubInfrastructure,
  verifyGooglePubSubPushForProcessing
} from '@slates/google-pubsub';

// Register
const infrastructure = parseGooglePubSubInfrastructure(
  ctx.input.infrastructure,
  'Notification delivery is not set up for this OAuth application.'
);
await client.watchMailbox(infrastructure.topicName);
return {
  webhookRegistrationPayload: { mailbox, delivery: infrastructure },
  routingKeys: [googlePubSubRoutingKey.gmail(mailbox)]
};

// Process
const push = await verifyGooglePubSubPushForProcessing(ctx.input.request, saved.delivery);
if (!push.ok) return push.skipped;
// Map push.message.data and attributes through the product event schema.
```

## Push verification

`verifyGooglePubSubPush` uses `jose` with Google's JWKS endpoint, RS256, a
Google issuer, the exact audience, expiry, future-issuance rejection, a
verified service account email, and the saved subscription. It does not impose
a five minute age limit: Google may reuse a token for an hour. Signing-key
outages return a retryable 503; invalid credentials return permanent 401/403.
Bodies and JSON message data use fatal UTF-8 and canonical standard base64
decoding. Attribute-only messages are supported. Attributes, message ID and
publication time remain available; use the message ID in the event's
idempotency key.

The runtime verifies a push when it arrives, but an integration may process it
later, after retries or a backlog, when the token has expired.
`expiredTokenGraceSeconds` accepts that lateness only: the signature, issuer,
audience, email and subscription checks stay strict.
`verifyGooglePubSubPushForProcessing` passes
`GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS` (one day, beyond the runtime's retry
horizon) and turns a failure into the skipped result `process` returns; the
runtime's own verification uses no grace. Tests can inject keys with
`createGooglePubSubPushVerifier(keyResolver)`.

The verifier expects wrapped v1 messages, so the push subscription must keep
payload unwrapping off; the setup document says so. It also asks for a
subscription that never expires, a 60-second acknowledgement deadline and
exponential retry backoff. None of these are checked: a subscription that
differs keeps working as far as Google delivers wrapped, authenticated pushes
to the saved audience.

Run offline checks from `integrations/` with
`bunx turbo run test build --filter="./packages/google-pubsub" --only`. These
checks do not touch Google resources or prove live delivery.

References: [push authentication](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions), [wrapped messages](https://cloud.google.com/pubsub/docs/push), [subscription fields](https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions), [Cloud Storage service agent](https://cloud.google.com/storage/docs/getting-service-agent).
