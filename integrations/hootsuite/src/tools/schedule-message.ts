import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let scheduleMessageTool = SlateTool.create(spec, {
  name: 'Schedule Message',
  key: 'schedule_message',
  description: `Schedule a social media post to one or more social profiles at a specific date and time.
Supports text content, media attachments, location tagging, tags, and email notifications.
The scheduled time must be in **UTC ISO-8601 format** (e.g. \`2025-03-01T14:00:00Z\`).`,
  instructions: [
    'Use the "List Social Profiles" tool first to obtain valid social profile IDs.',
    'If attaching media, use the "Upload Media" tool first and wait for READY status.'
  ],
  constraints: [
    'Scheduled time must be in UTC ISO-8601 format; other timezones are rejected.',
    'Tags require the social profile to belong to an organization.',
    'Hootsuite can accept some profiles and reject others in one request. Inspect returned message IDs and failures before retrying to avoid duplicate posts.',
    'Scheduling can publish publicly or send notifications; use only profiles and notification destinations you are authorized to affect.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Message text to post'),
      socialProfileIds: z.array(z.string()).describe('Social profile IDs to post to'),
      scheduledSendTime: z
        .string()
        .describe('UTC ISO-8601 datetime to publish (e.g. 2025-03-01T14:00:00Z)'),
      mediaUrls: z
        .array(
          z.object({
            url: z.string().describe('Existing ow.ly media URL supported by Hootsuite')
          })
        )
        .optional()
        .describe('Media URLs to attach'),
      mediaIds: z
        .array(z.string())
        .optional()
        .describe('Media IDs from previous uploads to attach'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the message'),
      location: z
        .object({
          latitude: z.number().describe('Latitude coordinate'),
          longitude: z.number().describe('Longitude coordinate')
        })
        .optional()
        .describe('Location to tag in the post'),
      emailNotification: z
        .boolean()
        .optional()
        .describe('Send email notification when published'),
      webhookUrls: z
        .array(z.string())
        .optional()
        .describe('Webhook URLs for status change notifications')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Hootsuite message ID'),
            state: z.string().describe('Message state (e.g. SCHEDULED)'),
            socialProfileId: z
              .string()
              .optional()
              .describe('Target social profile ID when reported'),
            scheduledSendTime: z
              .string()
              .describe(
                'Provider-reported scheduled send time, or the requested time if omitted'
              ),
            text: z.string().optional().describe('Message text')
          })
        )
        .describe('Accepted message receipts; failed profiles do not have a created message'),
      failures: z
        .array(
          z.object({
            code: z.number().optional().describe('Provider error code'),
            socialProfileId: z
              .string()
              .optional()
              .describe('Rejected social profile ID when reported')
          })
        )
        .optional()
        .describe('Provider-reported failures; messages may still have been created'),
      complete: z
        .boolean()
        .optional()
        .describe(
          'Whether there are no reported failures and a receipt for each requested profile'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    let media = ctx.input.mediaIds?.map(id => ({ id }));

    let results = await client.scheduleMessage({
      text: ctx.input.text,
      socialProfileIds: ctx.input.socialProfileIds,
      scheduledSendTime: ctx.input.scheduledSendTime,
      mediaUrls: ctx.input.mediaUrls,
      media,
      tags: ctx.input.tags,
      location: ctx.input.location,
      emailNotification: ctx.input.emailNotification,
      webhookUrls: ctx.input.webhookUrls
    });

    let messages = results.messages.map(msg => ({
      messageId: msg.id,
      state: msg.state,
      socialProfileId: msg.socialProfile?.id,
      scheduledSendTime: msg.scheduledSendTime || ctx.input.scheduledSendTime,
      text: msg.text
    }));

    return {
      output: {
        messages,
        failures: results.errors,
        complete:
          !results.errors.length &&
          messages.length === ctx.input.socialProfileIds.length &&
          new Set(messages.map(message => message.messageId)).size === messages.length &&
          new Set(messages.map(message => message.socialProfileId)).size === messages.length &&
          messages.every(
            message =>
              message.socialProfileId !== undefined &&
              ctx.input.socialProfileIds.includes(message.socialProfileId)
          )
      },
      message: `Hootsuite returned **${messages.length}** accepted message receipt(s) and **${results.errors.length}** failure(s). Inspect these receipts before retrying or changing scheduled posts.`
    };
  })
  .build();
