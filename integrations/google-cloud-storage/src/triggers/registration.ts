import { createHash } from 'node:crypto';
import {
  googlePubSubRoutingKey,
  parseGooglePubSubInfrastructure
} from '@slates/google-pubsub';
import {
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError,
  type SlateTriggerGroupWebhookAutoRegistrationParameters,
  type SlateWebhookTarget
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  type BucketTarget,
  bucketTargetId,
  bucketTargetSchema,
  notificationSchema,
  type StorageNotification,
  storageRegistrationSchema
} from './event-schemas';

const OWNER_ATTRIBUTE = 'callback_owner';
// Events carry object metadata, so targets need object read access besides notification access.
const REQUIRED_PERMISSIONS = [
  'storage.buckets.get',
  'storage.buckets.update',
  'storage.objects.list',
  'storage.objects.get'
];
const MAX_DISCOVERY_PAGES = 10;
const PAGE_SIZE = 50;
const pageSchema = z.object({
  token: z.string().min(1),
  page: z
    .number()
    .int()
    .min(1)
    .max(MAX_DISCOVERY_PAGES - 1),
  seen: z.array(z.string()).max(MAX_DISCOVERY_PAGES)
});
const bucketSchema = z.object({
  name: z.string().min(3),
  projectNumber: z.string().regex(/^[1-9]\d*$/),
  timeCreated: z.iso.datetime({ offset: true })
});
const listedSchema = z.object({
  items: z.array(bucketSchema).optional(),
  nextPageToken: z.string().optional()
});
const notificationsSchema = z.object({ items: z.array(notificationSchema).optional() });

// Bucket names are reused; a newer bucket with the same name never held the saved notifications.
const bucketIncarnation = async (
  client: Client,
  saved: BucketTarget
): Promise<'current' | 'replaced'> => {
  const bucket = parseWithServiceError(
    bucketSchema,
    await client.getBucket(saved.bucketName),
    'Cloud Storage returned invalid bucket identity.'
  );
  const current = {
    bucketName: bucket.name,
    projectNumber: bucket.projectNumber,
    createdAt: bucket.timeCreated
  };
  if (bucketTargetId(current) === bucketTargetId(saved)) return 'current';
  if (
    current.bucketName === saved.bucketName &&
    Date.parse(current.createdAt) > Date.parse(saved.createdAt)
  )
    return 'replaced';
  throw createApiServiceError('The bucket identity does not match the saved bucket.');
};
const currentBucket = async (client: Client, saved: BucketTarget) => {
  if ((await bucketIncarnation(client, saved)) === 'replaced')
    throw createApiServiceError('The bucket has been deleted and created again.');
};
// Bucket lists are complete or fail, so absence from the listing proves deletion; a 404 does not.
const isBucketListed = async (client: Client, saved: BucketTarget) => {
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_DISCOVERY_PAGES; page++) {
    const result = parseWithServiceError(
      listedSchema,
      await client.listBuckets({
        project: saved.projectNumber,
        prefix: saved.bucketName,
        pageToken
      }),
      'Cloud Storage returned an invalid bucket list.'
    );
    if (result.items?.some(item => item.name === saved.bucketName)) return true;
    if (!result.nextPageToken) return false;
    pageToken = result.nextPageToken;
  }
  throw createApiServiceError('The bucket could not be confirmed as deleted.');
};
// True when the saved bucket, and with it the saved notification, no longer exists.
const isBucketGone = async (client: Client, saved: BucketTarget) => {
  try {
    return (await bucketIncarnation(client, saved)) === 'replaced';
  } catch (error) {
    if (getUpstreamErrorStatus(error) !== 404 || (await isBucketListed(client, saved)))
      throw error;
    return true;
  }
};
const listNotifications = async (client: Client, bucketName: string) =>
  parseWithServiceError(
    notificationsSchema,
    await client.listNotifications(bucketName),
    'Cloud Storage returned invalid notification configurations.'
  ).items ?? [];
const topicUrl = (topic: string) => `//pubsub.googleapis.com/${topic}`;
const matches = (notification: StorageNotification, topic: string, ownershipId: string) =>
  notification.topic === topicUrl(topic) &&
  notification.custom_attributes?.[OWNER_ATTRIBUTE] === ownershipId &&
  notification.payload_format === 'JSON_API_V1' &&
  notification.event_types?.length === 1 &&
  notification.event_types[0] === 'OBJECT_FINALIZE' &&
  !notification.object_name_prefix;

// Notification IDs are server-made; a stable custom attribute recovers a create whose response was lost.
const ensureNotification = async (
  client: Client,
  bucketName: string,
  topic: string,
  ownershipId: string
) => {
  const existing = await listNotifications(client, bucketName);
  let owned = existing.filter(
    item => item.custom_attributes?.[OWNER_ATTRIBUTE] === ownershipId
  );
  if (owned.some(item => !matches(item, topic, ownershipId)))
    throw createApiServiceError(
      'The existing owned notification has an unexpected configuration.'
    );
  if (!owned.length) {
    try {
      await client.createNotification(bucketName, {
        topic: topicUrl(topic),
        eventTypes: ['OBJECT_FINALIZE'],
        payloadFormat: 'JSON_API_V1',
        customAttributes: { [OWNER_ATTRIBUTE]: ownershipId }
      });
    } catch (error) {
      // Readback also recovers ambiguous transport failures; unverifiable ones stay retryable.
      owned = (await listNotifications(client, bucketName)).filter(item =>
        matches(item, topic, ownershipId)
      );
      if (!owned.length) throw error;
    }
    owned = (await listNotifications(client, bucketName)).filter(
      item => item.custom_attributes?.[OWNER_ATTRIBUTE] === ownershipId
    );
    if (owned.some(item => !matches(item, topic, ownershipId))) {
      // Only delete resources whose topic and ownership marker are ours.
      for (const item of owned)
        if (item.topic === topicUrl(topic))
          await client.deleteNotification(bucketName, item.id);
      throw createApiServiceError(
        'Cloud Storage did not persist the requested finalization notification.'
      );
    }
  }
  if (!owned.length)
    throw createApiServiceError(
      'The new notification could not be confirmed; retry registration.'
    );
  owned.sort((a, b) => a.id.localeCompare(b.id));
  const selected = owned[0]!;
  // Ambiguous creates can leave duplicate owned notifications; only verified duplicates are removed.
  for (const duplicate of owned.slice(1))
    await client.deleteNotification(bucketName, duplicate.id);
  const readback = parseWithServiceError(
    notificationSchema,
    await client.getNotification(bucketName, selected.id),
    'Cloud Storage returned invalid notification readback.'
  );
  if (!matches(readback, topic, ownershipId) || readback.id !== selected.id) {
    if (
      readback.id === selected.id &&
      readback.topic === topicUrl(topic) &&
      readback.custom_attributes?.[OWNER_ATTRIBUTE] === ownershipId
    ) {
      await client.deleteNotification(bucketName, selected.id);
    }
    throw createApiServiceError('The notification readback did not match its registration.');
  }
  return selected.id;
};

export const storageAutoRegistration = {
  webhookTargetList: async ctx => {
    const page =
      ctx.input.pageToken === null
        ? null
        : parseWithServiceError(
            pageSchema,
            ctx.input.pageToken,
            'The bucket discovery page token is invalid.'
          );
    const client = new Client({ token: ctx.auth.token, projectId: ctx.config.projectId });
    const result = parseWithServiceError(
      listedSchema,
      await client.listBuckets({ maxResults: PAGE_SIZE, pageToken: page?.token }),
      'Cloud Storage returned an invalid bucket list.'
    );
    const targets: SlateWebhookTarget[] = [];
    const seenBuckets = new Set<string>();
    for (const bucket of result.items ?? []) {
      if (seenBuckets.has(bucket.name)) continue;
      seenBuckets.add(bucket.name);
      try {
        const permissions = await client.testBucketPermissions(
          bucket.name,
          REQUIRED_PERMISSIONS
        );
        if (!REQUIRED_PERMISSIONS.every(permission => permissions.includes(permission)))
          continue;
      } catch (error) {
        if ([403, 404].includes(getUpstreamErrorStatus(error) ?? 0)) continue;
        throw error;
      }
      const target = {
        bucketName: bucket.name,
        projectNumber: bucket.projectNumber,
        createdAt: bucket.timeCreated
      };
      targets.push({
        webhookTargetIdentifier: bucketTargetId(target),
        name: bucket.name,
        metadata: { bucketName: bucket.name, projectNumber: bucket.projectNumber },
        webhookTargetPayload: target,
        targetOwnership: 'multi_user'
      });
    }
    const next = result.nextPageToken;
    if (!next) return { targets, nextPageToken: null };
    const seen = [...(page?.seen ?? []), ...(page ? [page.token] : [])];
    if (seen.includes(next))
      throw createApiServiceError('Cloud Storage repeated a bucket page token.');
    const nextPage = (page?.page ?? 0) + 1;
    if (nextPage >= MAX_DISCOVERY_PAGES) {
      ctx.warn({
        message: 'Bucket discovery reached its 500-bucket limit.',
        data: { reason: 'storage_bucket_discovery_limit' }
      });
      return { targets, nextPageToken: null, isPartial: true };
    }
    return { targets, nextPageToken: { token: next, page: nextPage, seen } };
  },
  webhookRegister: async ctx => {
    const bucket = parseWithServiceError(
      bucketTargetSchema,
      ctx.input.webhookTargetPayload,
      'The bucket notification target is invalid.'
    );
    if (ctx.input.webhookTargetIdentifier !== bucketTargetId(bucket))
      throw createApiServiceError('The bucket notification target identity does not match.');
    const infrastructure = parseGooglePubSubInfrastructure(
      ctx.input.infrastructure,
      'Authenticated Pub/Sub delivery has not been configured for this connection.'
    );
    const receiver = z.url().safeParse(ctx.input.webhookUrl);
    if (!receiver.success || new URL(receiver.data).protocol !== 'https:')
      throw createApiServiceError('Cloud Storage notifications require an HTTPS receive URL.');
    const client = new Client({ token: ctx.auth.token, projectId: ctx.config.projectId });
    await currentBucket(client, bucket);
    const ownershipId = createHash('sha256')
      .update(JSON.stringify([ctx.input.webhookUrl, bucketTargetId(bucket)]))
      .digest('hex');
    const notificationId = await ensureNotification(
      client,
      bucket.bucketName,
      infrastructure.topicName,
      ownershipId
    );
    return {
      webhookRegistrationIdentifier: notificationId,
      webhookRegistrationPayload: {
        version: 1,
        bucket,
        notificationId,
        ownershipId,
        infrastructure
      },
      routingKeys: [googlePubSubRoutingKey.storage(bucket.bucketName, notificationId)]
    };
  },
  webhookUnregister: async ctx => {
    const saved = parseWithServiceError(
      storageRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved bucket notification is invalid.'
    );
    if (
      ctx.input.webhookRegistrationIdentifier &&
      ctx.input.webhookRegistrationIdentifier !== saved.notificationId
    )
      throw createApiServiceError('The saved bucket notification identifier does not match.');
    const client = new Client({ token: ctx.auth.token, projectId: ctx.config.projectId });
    // An inaccessible bucket, or unconfirmed absence, stays a retryable failure.
    if (await isBucketGone(client, saved.bucket)) return;
    const existing = (await listNotifications(client, saved.bucket.bucketName)).find(
      item => item.id === saved.notificationId
    );
    if (!existing) return;
    if (!matches(existing, saved.infrastructure.topicName, saved.ownershipId))
      throw createApiServiceError(
        'The notification no longer matches this connection; it was not deleted.'
      );
    try {
      await client.deleteNotification(saved.bucket.bucketName, saved.notificationId);
    } catch (error) {
      if (getUpstreamErrorStatus(error) !== 404) throw error;
    }
    if (
      (await listNotifications(client, saved.bucket.bucketName)).some(
        item => item.id === saved.notificationId
      )
    )
      throw createApiServiceError('The notification could not be confirmed as removed.');
  }
} satisfies SlateTriggerGroupWebhookAutoRegistrationParameters<
  { projectId: string },
  { token: string }
>;
