import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `Subscribe or unsubscribe profiles to/from email and SMS marketing for a specific list. Can also suppress or unsuppress profiles globally.
Use this tool to manage consent and marketing opt-in/opt-out.`,
  instructions: [
    'Subscribing requires a list ID and at least an email or phone number for each profile.',
    'Suppression is global (not list-specific) — suppressed profiles cannot receive any marketing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['subscribe', 'unsubscribe', 'suppress', 'unsuppress'])
        .describe('Action to perform'),
      listId: z.string().optional().describe('List ID (required for subscribe/unsubscribe)'),
      profiles: z
        .array(
          z.object({
            profileId: z.string().optional().describe('Profile ID'),
            email: z.string().optional().describe('Email address'),
            phoneNumber: z.string().optional().describe('Phone number in E.164 format')
          })
        )
        .describe('Profiles to subscribe/unsubscribe/suppress'),
      channels: z
        .object({
          email: z.boolean().optional().describe('Subscribe to email marketing'),
          sms: z.boolean().optional().describe('Subscribe to SMS marketing')
        })
        .optional()
        .describe('Channels to subscribe to (defaults to email if omitted)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      profileCount: z.number().describe('Number of profiles affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, listId, profiles, channels } = ctx.input;

    if ((action === 'subscribe' || action === 'unsubscribe') && !listId) {
      throw klaviyoServiceError('listId is required for subscribe/unsubscribe actions');
    }

    if (action === 'subscribe') {
      let channelConfig: Record<string, any> = {};
      if (channels?.email !== false) {
        channelConfig.email = { marketing: { consent: 'SUBSCRIBED' } };
      }
      if (channels?.sms) {
        channelConfig.sms = { marketing: { consent: 'SUBSCRIBED' } };
      }

      await client.subscribeProfiles(
        listId!,
        profiles.map(p => ({
          profileId: p.profileId,
          email: p.email,
          phoneNumber: p.phoneNumber,
          channels: Object.keys(channelConfig).length > 0 ? channelConfig : undefined
        }))
      );
    } else if (action === 'unsubscribe') {
      await client.unsubscribeProfiles(
        listId!,
        profiles.map(p => ({
          email: p.email,
          phoneNumber: p.phoneNumber
        }))
      );
    } else if (action === 'suppress') {
      let ids = profiles.map(p => p.profileId).filter((id): id is string => !!id);
      if (ids.length === 0)
        throw klaviyoServiceError('Profile IDs are required for suppression');
      await client.suppressProfiles(ids);
    } else if (action === 'unsuppress') {
      let ids = profiles.map(p => p.profileId).filter((id): id is string => !!id);
      if (ids.length === 0)
        throw klaviyoServiceError('Profile IDs are required for unsuppression');
      await client.unsuppressProfiles(ids);
    }

    return {
      output: {
        success: true,
        profileCount: profiles.length
      },
      message: `Successfully ${action}d **${profiles.length}** profile(s)${listId ? ` on list ${listId}` : ''}`
    };
  })
  .build();
