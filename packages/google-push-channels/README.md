# Google push channels

Shared lifecycle for Google API push notification channels (`watch` on Calendar
events, Drive changes, Admin SDK Reports activities and similar APIs). Each
integration keeps its own `watch`/`stop` client calls, its watched-resource and
account identity checks, and its renewal window.

```ts
import {
  channelRenewAfter,
  createVerifiedChannel,
  newGoogleWatchChannelToken,
  registrationChannelId,
  renewalChannelIdentity,
  rotateChannels,
  stopLiveChannels,
  verifyChannelNotification
} from '@slates/google-push-channels';

const labels = { integration: 'google_calendar', label: 'Google Calendar' };

// Register: a channel ID derived from the operation, a random token, and a
// random seed saved with the registration for later renewals.
const channel = await createVerifiedChannel({
  ...labels,
  webhookUrl,
  id: registrationChannelId(targetIdentifier, webhookUrl, operationId),
  token: newGoogleWatchChannelToken(),
  resourceUriMatches: uri => uri.pathname === `/calendar/v3/calendars/${calendarId}/events`,
  watch: () => client.watchEvents(calendarId, { id, token, type: 'web_hook', address: webhookUrl }),
  stop: (id, resourceId) => client.stopChannel(id, resourceId)
});
const renewAfter = channelRenewAfter(channel.expiresAt, { beforeExpiryMs: 24 * 60 * 60 * 1000 });
const tokenSeed = newGoogleWatchChannelToken();

// Renew: the same operation always derives the same replacement channel.
const { id, token } = renewalChannelIdentity(saved.channel, operationId, saved.tokenSeed);
const previousChannels = rotateChannels(saved.previousChannels, saved.channel);

// Unregister: stop every unexpired channel; the first failure is rethrown.
await stopLiveChannels([saved.channel, ...saved.previousChannels], channel =>
  client.stopChannel(channel.id, channel.resourceId)
);

// Process: authenticate the notification against every accepted channel.
const verified = await verifyChannelNotification({
  integration: labels.integration,
  request,
  channels: [saved.channel, ...saved.previousChannels],
  emptyBody: true
});
if (!verified.ok) return verified.skip;
```

`createVerifiedChannel` rejects receive URLs that are not HTTPS or carry
credentials, then checks that Google created exactly the requested channel: the
same ID and token, a resource ID, an expiry in the future (and within
`maxLifetimeMs`), and, with `resourceUriMatches`, the watched resource. A
mismatched channel is stopped by the requested ID before the error is thrown.

`renewalChannelIdentity` derives the replacement token from the saved
`tokenSeed`, which is never sent to Google, so a leaked channel token does not
reveal later ones. A registration saved without a seed derives the token from
the previous one; save a new seed with the renewed registration.

`verifyChannelNotification` checks, in order: `POST`, a saved channel ID, its
token (constant-time), its resource ID, an unexpired channel, and a positive
`X-Goog-Message-Number`; with `emptyBody` it also rejects a body. Failures are
skipped deliveries with `<integration>_webhook_<what>` reasons:
`method_not_allowed` (405), `channel_mismatch` (403), `token_invalid` (401),
`resource_mismatch` (403), `channel_expired` (403), `message_invalid` (400) and
`body_invalid` (400). Google signs nothing, so an authenticated notification is
only a wakeup; read the changes through the authenticated API.

Google has no channel read or list API. A failed stop, including a 404, cannot
prove removal, so `stopLiveChannels` keeps cleanup retryable until each channel
is stopped or has expired.

This package is private: integrations declare it as an optional peer dependency
and the build bundles it.

References: [Calendar push](https://developers.google.com/workspace/calendar/api/guides/push),
[Drive push](https://developers.google.com/workspace/drive/api/guides/push),
[Reports push](https://developers.google.com/workspace/admin/reports/v1/guides/push).
