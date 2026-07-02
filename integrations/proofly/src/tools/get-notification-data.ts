import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNotificationData = SlateTool.create(spec, {
  name: 'Get Notification Data',
  key: 'get_notification_data',
  description: `Retrieve leads, conversions, and collected data from an individual notification. Returns data type, submitted input (e.g., email), visitor IP, page URL, and geolocation. Use **Get Campaign Notifications** first to obtain the notification ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      notificationId: z.string().describe('The ID of the notification to retrieve data for')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            dataType: z
              .string()
              .optional()
              .describe('Type of data entry (e.g., lead, conversion)'),
            submittedInput: z
              .string()
              .optional()
              .describe('User-submitted input such as email address'),
            visitorIp: z.string().optional().describe('IP address of the visitor'),
            pageUrl: z
              .string()
              .optional()
              .describe('URL of the page where the notification was shown'),
            city: z.string().optional().describe('Visitor city from geolocation'),
            country: z.string().optional().describe('Visitor country from geolocation')
          })
        )
        .describe('Collected data entries for the notification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getNotificationData(ctx.input.notificationId);

    let entries = Array.isArray(data) ? data : (data.data ?? data.entries ?? []);

    return {
      output: {
        entries: entries.map((e: any) => ({
          dataType: e.type ?? e.dataType ?? e.data_type,
          submittedInput:
            e.input ?? e.email ?? e.submittedInput ?? e.submitted_input ?? e.value,
          visitorIp: e.ip ?? e.visitorIp ?? e.visitor_ip,
          pageUrl: e.pageUrl ?? e.page_url ?? e.url,
          city: e.city ?? e.geolocation?.city ?? e.geo?.city,
          country: e.country ?? e.geolocation?.country ?? e.geo?.country
        }))
      },
      message: `Retrieved **${entries.length}** data entries for notification \`${ctx.input.notificationId}\`.`
    };
  })
  .build();
