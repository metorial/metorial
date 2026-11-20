import { parseWithServiceError } from 'slates';
import { z } from 'zod';

/** The saved delivery setup: nonsecret, saved per registration and checked per push. */
export let googlePubSubDeliveryConfigSchema = z
  .object({
    projectId: z.string().min(1),
    topicName: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+$/),
    subscriptionName: z.string().regex(/^projects\/[^/]+\/subscriptions\/[^/]+$/),
    pushServiceAccountEmail: z.email(),
    audience: z.url({ protocol: /^https$/ })
  })
  .refine(
    value =>
      value.topicName.startsWith(`projects/${value.projectId}/`) &&
      value.subscriptionName.startsWith(`projects/${value.projectId}/`),
    'The Pub/Sub topic and subscription must belong to the descriptor project.'
  );

export type GooglePubSubDeliveryConfig = z.infer<typeof googlePubSubDeliveryConfigSchema>;

/** The delivery config given to register or renew; `message` is the error when it is absent or invalid. */
export let parseGooglePubSubDeliveryConfig = (
  deliveryConfig: unknown,
  message: string
): GooglePubSubDeliveryConfig =>
  parseWithServiceError(googlePubSubDeliveryConfigSchema, deliveryConfig, message);

/** Whether a renewal received the delivery config its registration was created with. */
export let isSameGooglePubSubDeliveryConfig = (
  saved: GooglePubSubDeliveryConfig,
  supplied: GooglePubSubDeliveryConfig
) =>
  (
    Object.keys(googlePubSubDeliveryConfigSchema.shape) as (keyof GooglePubSubDeliveryConfig)[]
  ).every(key => saved[key] === supplied[key]);
