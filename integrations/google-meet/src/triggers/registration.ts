import {
  type GooglePubSubDeliveryConfig,
  googlePubSubRoutingKey,
  isSameGooglePubSubDeliveryConfig,
  parseGooglePubSubDeliveryConfig
} from '@slates/google-pubsub';
import {
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError,
  type SlateTriggerGroupWebhookAutoRegistrationParameters
} from 'slates';
import { isMeetAlreadyExists } from '../lib/errors';
import {
  artifactEventTypes,
  MeetEventsClient,
  type MeetSubscription,
  userTarget
} from '../lib/events-client';
import {
  MAX_PREVIOUS_SUBSCRIPTIONS,
  type MeetRegistration,
  savedRegistrationSchema,
  targetIdentifier,
  targetSchema
} from './event-schemas';

export const assertMeetOwner = async (client: MeetEventsClient, ownerId: string) => {
  if ((await client.currentUser()).id !== ownerId)
    throw createApiServiceError(
      'The meeting event subscription belongs to a different Google account.'
    );
};

const assertDeliveryIdentity = (
  subscription: MeetSubscription,
  ownerId: string,
  topicName: string
) => {
  if (
    subscription.targetResource !== userTarget(ownerId) ||
    subscription.notificationEndpoint.pubsubTopic !== topicName ||
    (subscription.userAuthority ?? subscription.authority) !== `users/${ownerId}` ||
    (subscription.authority && subscription.authority !== `users/${ownerId}`)
  )
    throw createApiServiceError(
      'The meeting event subscription identity or delivery destination has changed; it was not modified.'
    );
};

const assertOwnedSubscription = (
  subscription: MeetSubscription,
  ownerId: string,
  topicName: string
) => {
  assertDeliveryIdentity(subscription, ownerId, topicName);
  if (
    subscription.eventTypes.length !== artifactEventTypes.length ||
    !artifactEventTypes.every(type => subscription.eventTypes.includes(type))
  )
    throw createApiServiceError(
      'The meeting event subscription has unexpected event types; it was not modified.'
    );
};

const assertActive = (subscription: MeetSubscription) => {
  if (
    subscription.state !== 'ACTIVE' ||
    subscription.reconciling ||
    Date.parse(subscription.expireTime) <= Date.now() + 60_000
  )
    throw createApiServiceError(
      'The meeting event subscription is not active with a usable expiration time. Retry after resolving its Google Workspace status.'
    );
};

const registrationResult = (
  subscription: MeetSubscription,
  ownerId: string,
  delivery: GooglePubSubDeliveryConfig,
  startedAt: string,
  previous?: MeetRegistration
) => {
  assertOwnedSubscription(subscription, ownerId, delivery.topicName);
  assertActive(subscription);
  const expiresAt = subscription.expireTime;
  const remaining = Date.parse(expiresAt) - Date.now();
  const previousSubscriptions = (previous?.previousSubscriptions ?? []).filter(
    item => item.name !== subscription.name && Date.parse(item.acceptUntil) > Date.now()
  );
  if (previous && previous.subscriptionName !== subscription.name)
    previousSubscriptions.push({
      name: previous.subscriptionName,
      acceptUntil: new Date(Date.now() + 7 * 86400_000).toISOString()
    });
  if (previousSubscriptions.length > MAX_PREVIOUS_SUBSCRIPTIONS)
    throw createApiServiceError(
      'Too many recent meeting subscription replacements; resolve the renewal failures before retrying.'
    );
  const saved: MeetRegistration = {
    ownerId,
    delivery,
    subscriptionName: subscription.name,
    startedAt,
    expiresAt,
    previousSubscriptions
  };
  return {
    webhookRegistrationIdentifier: subscription.name,
    webhookRegistrationPayload: saved,
    expiresAt,
    renewAfter: new Date(Date.now() + Math.min(86400_000, remaining / 2)).toISOString(),
    routingKeys: [subscription.name, ...previousSubscriptions.map(item => item.name)].map(
      name => googlePubSubRoutingKey.meet(name)
    )
  };
};

const findOwned = async (client: MeetEventsClient, ownerId: string, topicName: string) => {
  const subscriptions = await client.listSubscriptions(ownerId);
  const owned = subscriptions.filter(
    item =>
      item.notificationEndpoint.pubsubTopic === topicName &&
      item.targetResource === userTarget(ownerId)
  );
  if (owned.length > 1)
    throw createApiServiceError(
      'Multiple matching meeting subscriptions exist; resolve them before retrying.'
    );
  const existing = owned[0];
  if (existing) assertOwnedSubscription(existing, ownerId, topicName);
  return existing;
};

// One subscription per user and target per OAuth project, on a topic the app shares: adopt one
// on this topic, never touch others.
const createOrRecover = async (
  client: MeetEventsClient,
  ownerId: string,
  delivery: GooglePubSubDeliveryConfig
): Promise<{ subscription: MeetSubscription; created: boolean }> => {
  const existing = await findOwned(client, ownerId, delivery.topicName);
  if (existing) return { subscription: existing, created: false };
  let created: MeetSubscription;
  try {
    created = await client.createSubscription(ownerId, delivery.topicName);
  } catch (error) {
    // A request may time out after success, or another registration may create it first.
    const recovered = await findOwned(client, ownerId, delivery.topicName);
    if (recovered) return { subscription: recovered, created: false };
    if (isMeetAlreadyExists(error))
      throw createApiServiceError(
        'Meeting events for this Google account are already being delivered to another destination: the same Google OAuth app sends them to a different Pub/Sub topic, for example because it is also used elsewhere or its delivery setup changed. Disconnect the account there, or remove its meeting event subscription, and try again. The existing subscription was not changed.',
        { reason: 'google_meet_events_delivered_elsewhere', parent: error }
      );
    throw error;
  }
  // Only a subscription this call created may be rolled back; ambiguous failed reads keep it.
  assertDeliveryIdentity(created, ownerId, delivery.topicName);
  const readback = await client.getSubscription(created.name);
  assertDeliveryIdentity(readback, ownerId, delivery.topicName);
  try {
    assertOwnedSubscription(readback, ownerId, delivery.topicName);
    return { subscription: readback, created: true };
  } catch (error) {
    // The etag prevents removing a resource changed since this readback.
    await client.deleteSubscription(readback);
    if (await findOwned(client, ownerId, delivery.topicName))
      throw createApiServiceError(
        'Google has not confirmed rollback of the invalid meeting subscription. Retry cleanup.'
      );
    throw error;
  }
};

export const meetAutoRegistration: SlateTriggerGroupWebhookAutoRegistrationParameters<
  {},
  { token: string }
> = {
  webhookTargetList: async ctx => {
    if (ctx.input.pageToken !== null)
      throw createApiServiceError('Meeting event discovery does not accept a page token.');
    const user = await new MeetEventsClient(ctx.auth.token).currentUser();
    return {
      targets: [
        {
          webhookTargetIdentifier: targetIdentifier(user.id),
          name: user.email ? `Meet artifacts for ${user.email}` : 'Meet artifacts',
          description:
            'Transcripts and recordings generated for meetings you own, and transcripts of meetings you were invited to when you can access them.',
          metadata: { ownerId: user.id },
          webhookTargetPayload: { ownerId: user.id },
          targetOwnership: 'single_user'
        }
      ],
      nextPageToken: null
    };
  },
  webhookRegister: async ctx => {
    const target = parseWithServiceError(
      targetSchema,
      ctx.input.webhookTargetPayload,
      'The meeting event target is invalid.'
    );
    if (ctx.input.webhookTargetIdentifier !== targetIdentifier(target.ownerId))
      throw createApiServiceError('The meeting event target identity does not match.');
    const delivery = parseGooglePubSubDeliveryConfig(
      ctx.input.deliveryConfig,
      'Google event delivery is not configured for this OAuth client. Complete its Google Pub/Sub delivery setup and try again.'
    );
    const client = new MeetEventsClient(ctx.auth.token);
    await assertMeetOwner(client, target.ownerId);
    const found = await createOrRecover(client, target.ownerId, delivery);
    let subscription = found.subscription;
    if (subscription.state === 'SUSPENDED')
      subscription = await client.reactivateSubscription(subscription);
    // An adopted subscription may be much older than this registration.
    const startedAt = found.created
      ? subscription.createTime
      : new Date(Date.now()).toISOString();
    return registrationResult(subscription, target.ownerId, delivery, startedAt);
  },
  webhookRenew: async ctx => {
    const saved = parseWithServiceError(
      savedRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved meeting subscription is invalid.'
    );
    const target = parseWithServiceError(
      targetSchema,
      ctx.input.webhookTargetPayload,
      'The meeting event target is invalid.'
    );
    const delivery = parseGooglePubSubDeliveryConfig(
      ctx.input.deliveryConfig,
      'Google event delivery is not configured for this OAuth client.'
    );
    if (
      target.ownerId !== saved.ownerId ||
      ctx.input.webhookTargetIdentifier !== targetIdentifier(saved.ownerId) ||
      ctx.input.webhookRegistrationIdentifier !== saved.subscriptionName ||
      !isSameGooglePubSubDeliveryConfig(saved.delivery, delivery)
    )
      throw createApiServiceError(
        'The saved meeting subscription or delivery identity does not match renewal.'
      );
    const client = new MeetEventsClient(ctx.auth.token);
    await assertMeetOwner(client, saved.ownerId);
    let subscription = (await createOrRecover(client, saved.ownerId, delivery)).subscription;
    assertOwnedSubscription(subscription, saved.ownerId, delivery.topicName);
    if (subscription.state === 'SUSPENDED')
      subscription = await client.reactivateSubscription(subscription);
    if (subscription.state === 'DELETED')
      throw createApiServiceError(
        'Google still lists the deleted meeting subscription. Retry after deletion completes.'
      );
    // A retry after an uncertain update reads the current expiry instead of renewing again.
    if (Date.parse(subscription.expireTime) < Date.now() + 5 * 86400_000)
      subscription = await client.renewSubscription(subscription);
    return registrationResult(subscription, saved.ownerId, delivery, saved.startedAt, saved);
  },
  webhookUnregister: async ctx => {
    const saved = parseWithServiceError(
      savedRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved meeting subscription is invalid.'
    );
    if (
      ctx.input.webhookRegistrationIdentifier &&
      ctx.input.webhookRegistrationIdentifier !== saved.subscriptionName
    )
      throw createApiServiceError('The meeting subscription cleanup identity does not match.');
    const client = new MeetEventsClient(ctx.auth.token);
    await assertMeetOwner(client, saved.ownerId);
    // Only a fully authorized list proves absence, not a bare 404. A differently named subscription
    // on the topic replaced the saved one and belongs to whoever returned its routing key.
    const subscription = await findOwned(client, saved.ownerId, saved.delivery.topicName);
    if (subscription?.name !== saved.subscriptionName) return;
    assertOwnedSubscription(subscription, saved.ownerId, saved.delivery.topicName);
    try {
      await client.deleteSubscription(subscription);
    } catch (error) {
      if (getUpstreamErrorStatus(error) !== 404) throw error;
    }
    const remaining = await findOwned(client, saved.ownerId, saved.delivery.topicName);
    if (remaining?.name === saved.subscriptionName)
      throw createApiServiceError(
        'Google has not confirmed removal of the meeting event subscription. Cleanup will need to retry.'
      );
  }
};

// False when the saved subscription is gone; a recreated one is adopted at the next renewal.
export const reconcileMeetSubscription = async (
  client: MeetEventsClient,
  saved: MeetRegistration
) => {
  let subscription: MeetSubscription;
  try {
    subscription = await client.getSubscription(saved.subscriptionName);
  } catch (error) {
    if (getUpstreamErrorStatus(error) !== 404) throw error;
    return false;
  }
  if (subscription.state === 'DELETED') return false;
  assertOwnedSubscription(subscription, saved.ownerId, saved.delivery.topicName);
  if (subscription.state === 'SUSPENDED')
    subscription = await client.reactivateSubscription(subscription);
  assertOwnedSubscription(subscription, saved.ownerId, saved.delivery.topicName);
  assertActive(subscription);
  return true;
};
