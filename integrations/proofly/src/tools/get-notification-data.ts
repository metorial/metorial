import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prooflyString } from '../lib/response';
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
      notificationId: z
        .string()
        .describe(
          'Notification ID. Call get_campaign_notifications to discover notification IDs.'
        )
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
            country: z.string().optional().describe('Visitor country from geolocation'),
            countryCode: z.string().optional().describe('Visitor country code'),
            timestamp: z.string().optional().describe('When the data entry was collected'),
            data: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Original collected form or conversion data')
          })
        )
        .describe('Collected data entries for the notification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let entries = await client.getNotificationData(ctx.input.notificationId);

    return {
      output: {
        entries: entries.map(e => {
          let data = isApiErrorRecord(e.data) ? e.data : undefined;
          let location = isApiErrorRecord(e.location) ? e.location : {};
          let geolocation = isApiErrorRecord(e.geolocation) ? e.geolocation : {};
          let geo = isApiErrorRecord(e.geo) ? e.geo : {};
          return {
            dataType: prooflyString(e.type, e.dataType, e.data_type),
            submittedInput: prooflyString(
              data?.input,
              e.input,
              e.email,
              e.submittedInput,
              e.submitted_input,
              e.value
            ),
            visitorIp: prooflyString(e.ip, e.visitorIp, e.visitor_ip),
            pageUrl: prooflyString(e.url, e.pageUrl, e.page_url),
            city: prooflyString(location.city, e.city, geolocation.city, geo.city),
            country: prooflyString(
              location.country,
              e.country,
              geolocation.country,
              geo.country
            ),
            countryCode: prooflyString(location.country_code),
            timestamp: prooflyString(e.date),
            data
          };
        })
      },
      message: `Retrieved **${entries.length}** data entries for notification \`${ctx.input.notificationId}\`.`
    };
  })
  .build();
