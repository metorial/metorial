import {
  createApiServiceError,
  type SlateTriggerGroupWebhookDeliveryConfigParameters
} from 'slates';
import { z } from 'zod';
import { googlePubSubDeliveryConfigSchema } from './deliveryConfigSchema';
import { extractGooglePubSubRoutingKeys, type GooglePubSubProduct } from './routing';
import { type PubSubPushFailure, verifyGooglePubSubPush } from './verify';

let field = (pattern: RegExp, error: string, meta: { title: string; description: string }) =>
  z.string(error).trim().regex(pattern, error).meta(meta);

let userConfigSchema = z.object(
  {
    topicName: field(
      /^projects\/[^/\s]+\/topics\/[^/\s]+$/,
      'Topic name must look like projects/<project>/topics/<name>.',
      {
        title: 'Topic name',
        description:
          'Full name of the Pub/Sub topic you created, for example projects/my-project/topics/my-topic.'
      }
    ),
    subscriptionName: field(
      /^projects\/[^/\s]+\/subscriptions\/[^/\s]+$/,
      'Subscription name must look like projects/<project>/subscriptions/<name>.',
      {
        title: 'Subscription name',
        description:
          'Full name of the push subscription on that topic, for example projects/my-project/subscriptions/my-subscription.'
      }
    ),
    pushServiceAccountEmail: field(
      /^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/,
      'Push service account must be a service account email ending with .gserviceaccount.com.',
      {
        title: 'Push service account',
        description:
          'Email of the service account selected for authentication on the push subscription.'
      }
    )
  },
  'Enter the topic name, subscription name, and push service account.'
);

// Authenticated but unroutable: rejecting them only makes Pub/Sub redeliver until expiry.
let unroutableFailures: PubSubPushFailure[] = [
  'body_invalid',
  'data_invalid',
  'subscription_mismatch'
];

let productNames: Record<GooglePubSubProduct, string> = {
  gmail: 'Gmail',
  forms: 'Google Forms',
  meet: 'Google Meet',
  storage: 'Cloud Storage'
};

let publishers: Record<Exclude<GooglePubSubProduct, 'storage'>, string> = {
  gmail: 'gmail-api-push@system.gserviceaccount.com',
  forms: 'forms-notifications@system.gserviceaccount.com',
  meet: 'meet-api-event-push@system.gserviceaccount.com'
};

// Everything that belongs to a numbered step is indented to the step's text, or the list ends there.
let fence = (text: string) => ['', '   ```', `   ${text}`, '   ```', ''];

let publisherStep = (product: GooglePubSubProduct) =>
  product === 'storage'
    ? [
        '2. Allow Cloud Storage to publish to the topic. On the topic’s **Permissions** tab, select **Add principal** and give the **Pub/Sub Publisher** role to the Cloud Storage service agent of every project whose buckets should send events. A service agent has this form:',
        ...fence('service-<project number>@gs-project-accounts.iam.gserviceaccount.com'),
        '   To find a project’s service agent, open **Cloud Storage > Settings** in that project and look on the **Project Access** tab under **Cloud Storage Service Account**, or run `gcloud storage service-agent --project=<project>`.'
      ]
    : [
        `2. Allow ${productNames[product]} to publish to the topic. On the topic’s **Permissions** tab, select **Add principal** and give the **Pub/Sub Publisher** role to this principal:`,
        ...fence(publishers[product])
      ];

let setupDocument = (product: GooglePubSubProduct, webhookUrl: string) =>
  [
    `Set up Google Cloud Pub/Sub delivery so ${productNames[product]} events reach your connections. You do this once for each Google OAuth app.`,
    '',
    '1. In the [Google Cloud console](https://console.cloud.google.com/), open the project that owns your OAuth app and enable the **Cloud Pub/Sub API**. Under **Pub/Sub > Topics**, create a topic with **Add a default subscription** cleared.',
    ...publisherStep(product),
    '3. In the same project, create a service account under **IAM & Admin > Service Accounts**. It only signs the deliveries, so it needs no project roles and no keys. On its **Permissions** tab, select **Grant access** and give two principals a role on it, which step 4 needs:',
    '   - your own Google account: the **Service Account User** role',
    '   - the project’s Pub/Sub service agent, `service-<project number>@gcp-sa-pubsub.iam.gserviceaccount.com`: the **Service Account Token Creator** role (the project number is under **IAM & Admin > Settings**)',
    '4. Under **Pub/Sub > Subscriptions**, create a subscription on the topic. Set **Delivery type** to **Push** and enter exactly this URL as the **Endpoint URL**:',
    ...fence(webhookUrl),
    '   Then set:',
    '   - **Enable authentication**: checked, with the service account from step 3 and the same URL as the **Audience**',
    '   - **Enable payload unwrapping**: cleared',
    '   - **Expiration period**: Never expire',
    '   - **Acknowledgement deadline**: 60 seconds',
    '   - **Retry policy**: Retry after exponential backoff delay',
    '5. Return here and enter these three values:',
    '   - **Topic name**: the full name shown on the topic’s page, in the form `projects/<project>/topics/<name>`',
    '   - **Subscription name**: the full name shown on the subscription’s page, in the form `projects/<project>/subscriptions/<name>`',
    '   - **Push service account**: the email of the service account from step 3',
    '',
    '> NOTE: The endpoint rejects deliveries until you save this setup here.'
  ].join('\n');

/** Delivery setup for a Google Pub/Sub group: topic and push subscription, once per OAuth app. */
export let googlePubSubDeliveryConfig = (
  product: GooglePubSubProduct
): SlateTriggerGroupWebhookDeliveryConfigParameters<
  typeof userConfigSchema,
  typeof googlePubSubDeliveryConfigSchema
> => ({
  userConfigSchema,
  fullConfigSchema: googlePubSubDeliveryConfigSchema,
  setup: async ctx => ({
    webhookSetupDocument: setupDocument(product, ctx.input.webhookUrl),
    partialWebhookRegistrationPayload: {}
  }),
  finish: async ctx => {
    let user = userConfigSchema.safeParse(ctx.input.userWebhookRegistrationPayload);
    if (!user.success) throw createApiServiceError(user.error.issues[0]!.message);
    // Google signs pushes with the lower-case address, and verification compares exactly.
    let resources = {
      ...user.data,
      pushServiceAccountEmail: user.data.pushServiceAccountEmail.toLowerCase()
    };
    let projectId = resources.topicName.split('/')[1]!;
    if (resources.subscriptionName.split('/')[1] !== projectId)
      throw createApiServiceError(
        'Topic and subscription must be in the same Google Cloud project.'
      );
    let config = googlePubSubDeliveryConfigSchema.safeParse({
      projectId,
      ...resources,
      audience: ctx.input.webhookUrl
    });
    if (!config.success)
      throw createApiServiceError(
        config.error.issues[0]?.path.includes('pushServiceAccountEmail')
          ? 'Push service account must be a valid service account email.'
          : 'The delivery endpoint must be an HTTPS URL.'
      );
    return { webhookRegistrationPayload: config.data };
  },
  authenticate: async ctx => {
    let config = googlePubSubDeliveryConfigSchema.safeParse(ctx.input.deliveryConfig);
    if (!config.success) return { rejected: { status: 404 } };
    let verified = await verifyGooglePubSubPush({
      request: ctx.input.request,
      deliveryConfig: config.data
    });
    if (!verified.ok)
      return unroutableFailures.includes(verified.failure)
        ? { routingKeys: [] }
        : { rejected: { status: verified.status } };
    return { routingKeys: extractGooglePubSubRoutingKeys(product, verified.message) };
  }
});
