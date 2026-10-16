import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseProviderData, providerDate } from '../lib/response';
import { spec } from '../spec';

let notificationSchema = z.object({
  notification_type: z.string(),
  body: z.string(),
  is_unread: z.boolean(),
  creation_date: z.number(),
  post_id: z.number().optional(),
  site: z.object({ name: z.string(), api_site_parameter: z.string(), site_url: z.string() })
});

export let getNotifications = SlateTool.create(spec, {
  key: 'get_notifications',
  name: 'Get Notifications',
  description:
    'Read your Stack Exchange notifications, optionally restricted to unread notifications. Requires OAuth with read_inbox.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      unreadOnly: z.boolean().optional().default(false),
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Results per page, from 0 to 100')
    })
  )
  .output(
    z.object({
      notifications: z.array(
        z.object({
          notificationType: z.string(),
          body: z.string(),
          isUnread: z.boolean(),
          creationDate: z.string(),
          postId: z.number().optional(),
          site: z.object({
            name: z.string(),
            apiSiteParameter: z.string(),
            siteUrl: z.string()
          })
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, site: ctx.config.site });
    let result = ctx.input.unreadOnly
      ? await client.getNotificationsUnread(ctx.input)
      : await client.getNotifications(ctx.input);
    let notifications = result.items.map(value => {
      let item = parseProviderData(notificationSchema, value, 'notification');
      return {
        notificationType: item.notification_type,
        body: item.body,
        isUnread: item.is_unread,
        creationDate: providerDate(item.creation_date),
        postId: item.post_id,
        site: {
          name: item.site.name,
          apiSiteParameter: item.site.api_site_parameter,
          siteUrl: item.site.site_url
        }
      };
    });
    return {
      output: { notifications, hasMore: result.hasMore },
      message: `Retrieved ${notifications.length} notifications.`
    };
  })
  .build();
