import { createHash } from 'node:crypto';
import {
  googlePubSubDeliveryConfig,
  verifyGooglePubSubPushForProcessing
} from '@slates/google-pubsub';
import { SlateTrigger, skipWebhook, triggerGroup } from 'slates';
import { z } from 'zod';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  bucketTargetId,
  generationSchema,
  objectFinalizedSchema,
  objectMetadataSchema,
  storageRegistrationSchema
} from './event-schemas';
import { storageAutoRegistration } from './registration';

const attributesSchema = z.object({
  eventType: z.string(),
  notificationConfig: z.string(),
  bucketId: z.string(),
  objectId: z.string(),
  objectGeneration: generationSchema,
  eventTime: z.iso.datetime({ offset: true }),
  payloadFormat: z.literal('JSON_API_V1'),
  callback_owner: z.string(),
  overwroteGeneration: generationSchema.optional()
});
export const objectEvents = triggerGroup(spec, {
  key: 'object_events',
  name: 'Object finalizations',
  description:
    'Objects that became available in buckets whose notifications you can manage and whose objects you can read.',
  eventSchema: objectFinalizedSchema
})
  .webhook({
    deliveryConfig: googlePubSubDeliveryConfig('storage'),
    autoRegistration: storageAutoRegistration,
    process: async ctx => {
      const saved = storageRegistrationSchema.safeParse(ctx.input.webhookRegistrationPayload);
      if (!saved.success) return skipWebhook('invalid_registration', { status: 500 });
      const verified = await verifyGooglePubSubPushForProcessing(
        ctx.input.request,
        saved.data.delivery
      );
      if (!verified.ok) return verified.skipped;
      const attributes = attributesSchema.safeParse(verified.message.attributes);
      if (!attributes.success)
        return skipWebhook('invalid_storage_attributes', { status: 400 });
      const attrs = attributes.data;
      if (
        attrs.bucketId !== saved.data.bucket.bucketName ||
        attrs.notificationConfig !==
          `projects/_/buckets/${saved.data.bucket.bucketName}/notificationConfigs/${saved.data.notificationId}` ||
        attrs.callback_owner !== saved.data.ownershipId
      )
        return skipWebhook('notification_identity_mismatch', { status: 403 });
      if (attrs.eventType !== 'OBJECT_FINALIZE')
        return skipWebhook('unsupported_event_type', { status: 200 });
      const parsed = objectMetadataSchema.safeParse(verified.message.data);
      if (!parsed.success) return skipWebhook('invalid_object_metadata', { status: 400 });
      const data = parsed.data;
      if (
        data.bucket !== attrs.bucketId ||
        data.name !== attrs.objectId ||
        data.generation !== attrs.objectGeneration
      )
        return skipWebhook('object_identity_mismatch', { status: 403 });
      const eventId = createHash('sha256')
        .update(
          JSON.stringify([bucketTargetId(saved.data.bucket), data.name, data.generation])
        )
        .digest('hex');
      return {
        events: [
          {
            matchers: [],
            idempotencyKey: eventId,
            payload: {
              eventType: 'OBJECT_FINALIZE',
              eventId,
              eventTime: attrs.eventTime,
              bucketName: data.bucket,
              objectName: data.name,
              generation: data.generation,
              metageneration: data.metageneration,
              sizeBytes: data.size,
              contentType: data.contentType,
              storageClass: data.storageClass,
              md5Hash: data.md5Hash,
              crc32c: data.crc32c,
              createdAt: data.timeCreated,
              updatedAt: data.updated,
              customMetadata: data.metadata,
              overwroteGeneration: attrs.overwroteGeneration
            }
          }
        ]
      };
    }
  })
  .routingMatchers(async () => [])
  .build();

export const objectFinalized = SlateTrigger.create(spec, {
  key: 'object_finalized',
  name: 'Object finalized',
  description:
    'An object generation became available, including uploads, copies, rewrites, and restores. Use its generation when reading or modifying the object.'
})
  .triggerGroup(objectEvents)
  .input(objectFinalizedSchema)
  .output(objectFinalizedSchema)
  .scopes(googleCloudStorageActionScopes.objectChanges)
  .matches(payload => objectFinalizedSchema.safeParse(payload).success)
  .map(async ctx => ({
    type: 'storage.object.finalized',
    id: ctx.input.eventId,
    output: ctx.input
  }))
  .build();
