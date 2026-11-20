import { googlePubSubDeliveryConfigSchema } from '@slates/google-pubsub';
import { z } from 'zod';

export const generationSchema = z.string().regex(/^[1-9]\d*$/);
export const bucketTargetSchema = z.object({
  bucketName: z.string().min(3),
  projectNumber: generationSchema,
  createdAt: z.iso.datetime({ offset: true })
});
export type BucketTarget = z.infer<typeof bucketTargetSchema>;
export const storageRegistrationSchema = z.object({
  version: z.literal(1),
  bucket: bucketTargetSchema,
  notificationId: z.string().min(1),
  ownershipId: z.string().regex(/^[a-f0-9]{64}$/),
  delivery: googlePubSubDeliveryConfigSchema
});
export const notificationSchema = z.object({
  id: z.string().min(1),
  topic: z.string(),
  payload_format: z.string(),
  event_types: z.array(z.string()).optional(),
  object_name_prefix: z.string().optional(),
  custom_attributes: z.record(z.string(), z.string()).optional()
});
export type StorageNotification = z.infer<typeof notificationSchema>;
export const objectFinalizedSchema = z.object({
  eventType: z.literal('OBJECT_FINALIZE'),
  eventId: z.string(),
  eventTime: z.iso.datetime({ offset: true }),
  bucketName: z.string(),
  objectName: z.string(),
  generation: generationSchema,
  metageneration: generationSchema,
  sizeBytes: z.string().regex(/^\d+$/),
  contentType: z.string().optional(),
  storageClass: z.string().optional(),
  md5Hash: z.string().optional(),
  crc32c: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  customMetadata: z.record(z.string(), z.string()).optional(),
  overwroteGeneration: generationSchema.optional()
});
export const objectMetadataSchema = z.object({
  bucket: z.string().min(1),
  name: z.string().min(1),
  generation: generationSchema,
  metageneration: generationSchema,
  size: z.string().regex(/^\d+$/),
  contentType: z.string().optional(),
  storageClass: z.string().optional(),
  md5Hash: z.string().optional(),
  crc32c: z.string().optional(),
  timeCreated: z.string().optional(),
  updated: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional()
});
export const bucketTargetId = (bucket: BucketTarget) =>
  JSON.stringify([bucket.bucketName, bucket.projectNumber, bucket.createdAt]);
