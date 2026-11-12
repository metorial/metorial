import { parseWithServiceError, type SlateGooglePubSubInfrastructure } from 'slates';
import { z } from 'zod';

/** Nonsecret descriptor from `infrastructure.googlePubSub`; saved per registration, checked per push. */
export let googlePubSubInfrastructureSchema = z
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
  ) satisfies z.ZodType<SlateGooglePubSubInfrastructure>;

export type GooglePubSubInfrastructure = z.infer<typeof googlePubSubInfrastructureSchema>;

/** The descriptor given to register or renew; `message` is the error when it is absent or invalid. */
export let parseGooglePubSubInfrastructure = (
  infrastructure: { googlePubSub?: unknown } | null | undefined,
  message: string
): GooglePubSubInfrastructure =>
  parseWithServiceError(
    googlePubSubInfrastructureSchema,
    infrastructure?.googlePubSub,
    message
  );

/** Whether a renewal received the descriptor its registration was created with. */
export let isSameGooglePubSubInfrastructure = (
  saved: GooglePubSubInfrastructure,
  supplied: GooglePubSubInfrastructure
) =>
  (
    Object.keys(googlePubSubInfrastructureSchema.shape) as (keyof GooglePubSubInfrastructure)[]
  ).every(key => saved[key] === supplied[key]);
