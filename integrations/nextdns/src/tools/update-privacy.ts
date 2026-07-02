import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let updatePrivacy = SlateTool.create(spec, {
  name: 'Update Privacy Settings',
  key: 'update_privacy',
  description: `Update the privacy and ad-blocking configuration for a NextDNS profile. Manage blocklists (e.g., "nextdns-recommended", "oisd"), native tracker blocking for platforms (e.g., "apple", "samsung", "huawei", "windows", "xiaomi", "alexa", "roku", "sonos"), and toggle disguised tracker blocking and affiliate link handling.`,
  instructions: [
    'Use blocklistsToAdd/blocklistsToRemove to manage blocklists without replacing the entire list.',
    'Use nativeTrackersToAdd/nativeTrackersToRemove to manage native platform tracker blocking.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile to update'),
      disguisedTrackers: z
        .boolean()
        .optional()
        .describe('Enable/disable disguised third-party tracker blocking'),
      allowAffiliate: z
        .boolean()
        .optional()
        .describe('Enable/disable affiliate link handling'),
      blocklistsToAdd: z
        .array(z.string())
        .optional()
        .describe('Blocklist IDs to add (e.g., ["nextdns-recommended", "oisd"])'),
      blocklistsToRemove: z.array(z.string()).optional().describe('Blocklist IDs to remove'),
      nativeTrackersToAdd: z
        .array(z.string())
        .optional()
        .describe(
          'Native tracker platform IDs to add (e.g., ["apple", "windows", "samsung"])'
        ),
      nativeTrackersToRemove: z
        .array(z.string())
        .optional()
        .describe('Native tracker platform IDs to remove')
    })
  )
  .output(
    z.object({
      privacy: z.record(z.string(), z.unknown()).describe('Updated privacy configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let {
      profileId,
      blocklistsToAdd,
      blocklistsToRemove,
      nativeTrackersToAdd,
      nativeTrackersToRemove,
      ...privacyToggles
    } = ctx.input;

    let filteredToggles: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(privacyToggles)) {
      if (value !== undefined) {
        filteredToggles[key] = value;
      }
    }

    if (Object.keys(filteredToggles).length > 0) {
      await client.updatePrivacy(profileId, filteredToggles);
    }

    if (blocklistsToAdd && blocklistsToAdd.length > 0) {
      for (let id of blocklistsToAdd) {
        await client.addBlocklist(profileId, id);
      }
    }

    if (blocklistsToRemove && blocklistsToRemove.length > 0) {
      for (let id of blocklistsToRemove) {
        await client.removeBlocklist(profileId, id);
      }
    }

    if (nativeTrackersToAdd && nativeTrackersToAdd.length > 0) {
      for (let id of nativeTrackersToAdd) {
        await client.addNativeTracker(profileId, id);
      }
    }

    if (nativeTrackersToRemove && nativeTrackersToRemove.length > 0) {
      for (let id of nativeTrackersToRemove) {
        await client.removeNativeTracker(profileId, id);
      }
    }

    let privacy = await client.getPrivacy(profileId);

    return {
      output: { privacy: privacy.data || privacy },
      message: `Updated privacy settings for profile \`${profileId}\`.`
    };
  })
  .build();
