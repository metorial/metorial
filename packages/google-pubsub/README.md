# Google Pub/Sub transport

Shared Google Pub/Sub delivery for automatic trigger groups whose events
arrive on one topic per Google OAuth app (Gmail, Forms, Meet, Cloud Storage).
A person creates the Pub/Sub resources once per OAuth app and saves them as a
delivery config; integrations own their producer watches, renewal, event
schemas and per-registration identity checks. This package never calls the
Pub/Sub API and needs no credentials.

## Delivery config

Each group declares the shared setup for its product:

```ts
import { googlePubSubDeliveryConfig } from '@slates/google-pubsub';

triggerGroup(spec, { key: 'mailbox_events', name: 'Incoming email' }).webhook({
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
- **What the person enters** (`userConfigSchema`): `topicName`
  (`projects/<project>/topics/<name>`), `subscriptionName`
  (`projects/<project>/subscriptions/<name>`), and `pushServiceAccountEmail`.
- **What is saved** (`googlePubSubDeliveryConfigSchema`): the flat descriptor
  `{ projectId, topicName, subscriptionName, pushServiceAccountEmail, audience }`.
  `finish` takes the project from the topic name, uses the delivery URL as the
  audience, requires the topic and subscription to share a project, and
  rejects invalid input with an error that names the field.
- **Authenticate** (`authenticate`): verifies a push received on the delivery
  URL against the saved config and returns the routing keys it addresses (see
  below).

The package never asks for an OAuth client ID. A customer selects their OAuth
app in the dashboard before saving its config; the platform operator supplies
the client ID of the managed OAuth app. The delivery URL rejects pushes until
the config is saved.

## Shared delivery model

One topic and one push subscription serve every registration of a product for
an OAuth app. Nothing is created or deleted per registration.

1. **Configure (person).** The saved delivery config names the topic,
   subscription, push service account and audience. Register and renew of
   every connection of that OAuth app receive it as `ctx.input.deliveryConfig`.
2. **Register (integration).** Validate it with
   `parseGooglePubSubDeliveryConfig`, start or adopt the producer watch on its
   topic, save it in the registration payload (typed with
   `googlePubSubDeliveryConfigSchema`), and return `routingKeys` built with
   `googlePubSubRoutingKey`. On renewal, refuse a delivery config that differs
   from the saved one (`isSameGooglePubSubDeliveryConfig`).
3. **Receive (`authenticate`).** The platform calls the delivery config's
   `authenticate` once per push. It verifies the push with
   `verifyGooglePubSubPush` (no expiry grace) and returns the keys
   `extractGooglePubSubRoutingKeys` reads from it; the platform hands the
   request to every active registration holding one of them. A push that is
   authenticated but malformed, has invalid data or names another subscription
   is acknowledged with no keys, since rejecting it would only make Pub/Sub
   redeliver it. Every other failure is rejected with the verifier's status,
   including 503 when Google's signing keys are unavailable, so Pub/Sub
   retries. A saved config that is not a valid descriptor is rejected with
   404.
4. **Process (integration).** Verify the push again against the saved
   delivery config, then check the producer identity (mailbox, form,
   subscription, bucket notification) against the registration.
5. **Unregister (integration).** Remove only the producer watch, and only when
   no other registration still uses it. The shared topic and subscription stay.

```ts
import {
  googlePubSubRoutingKey,
  parseGooglePubSubDeliveryConfig,
  verifyGooglePubSubPushForProcessing
} from '@slates/google-pubsub';

// Register
const delivery = parseGooglePubSubDeliveryConfig(
  ctx.input.deliveryConfig,
  'Notification delivery is not set up for this OAuth application.'
);
await client.watchMailbox(delivery.topicName);
return {
  webhookRegistrationPayload: { mailbox, delivery },
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

`authenticate` verifies a push when it arrives, but an integration may
process it later, after retries or a backlog, when the token has expired.
`expiredTokenGraceSeconds` accepts that lateness only: the signature, issuer,
audience, email and subscription checks stay strict.
`verifyGooglePubSubPushForProcessing` passes
`GOOGLE_PUBSUB_PROCESSING_GRACE_SECONDS` (one day, beyond the runtime's retry
horizon) and turns a failure into the skipped result `process` returns;
`authenticate` uses no grace. Tests can inject keys with
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
