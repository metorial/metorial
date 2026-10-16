import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description:
    'List channels the authenticated user subscribes to, including personal mute, notification, and display settings.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      subscriptions: z.array(
        z.object({
          channelId: z.number(),
          name: z.string(),
          description: z.string(),
          isPrivate: z.boolean(),
          isMuted: z.boolean().optional(),
          pinToTop: z.boolean().optional(),
          color: z.string().optional(),
          desktopNotifications: z.boolean().nullable().optional(),
          emailNotifications: z.boolean().nullable().optional(),
          pushNotifications: z.boolean().nullable().optional(),
          audibleNotifications: z.boolean().nullable().optional(),
          raw: z.any().describe('Complete provider subscription metadata')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getSubscriptions();
    let subscriptions = result.subscriptions.map((item: any) => ({
      channelId: item.stream_id,
      name: item.name,
      description: item.description,
      isPrivate: item.invite_only,
      isMuted: item.is_muted,
      pinToTop: item.pin_to_top,
      color: item.color,
      desktopNotifications: item.desktop_notifications,
      emailNotifications: item.email_notifications,
      pushNotifications: item.push_notifications,
      audibleNotifications: item.audible_notifications,
      raw: item
    }));
    return {
      output: { subscriptions },
      message: `Found ${subscriptions.length} channel subscription(s)`
    };
  })
  .build();
