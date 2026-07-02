import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let getMessageInsights = SlateTool.create(spec, {
  name: 'Get Message Insights',
  key: 'get_message_insights',
  description: `Retrieve detailed delivery insights for a specific sent email by its message ID. Shows delivery events per recipient, including delivery status, bounces, complaints, opens, and clicks. Useful for troubleshooting delivery issues and tracking individual message outcomes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('The SES message ID returned when the email was sent')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      fromEmailAddress: z.string().optional(),
      subject: z.string().optional(),
      emailTags: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Tags applied to the message'),
      insights: z
        .array(
          z.object({
            destination: z.string().optional().describe('Recipient email address'),
            isp: z.string().optional().describe('Internet Service Provider for the recipient'),
            events: z
              .array(
                z.object({
                  timestamp: z.string().optional(),
                  type: z
                    .string()
                    .optional()
                    .describe(
                      'Event type (SEND, DELIVERY, BOUNCE, COMPLAINT, OPEN, CLICK, etc.)'
                    )
                })
              )
              .optional()
              .describe('Delivery events for this recipient')
          })
        )
        .optional()
        .describe('Per-recipient delivery insights')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.getMessageInsights(ctx.input.messageId);

    let eventSummary = '';
    if (result.insights && result.insights.length > 0) {
      let totalEvents = result.insights.reduce((sum, i) => sum + (i.events?.length || 0), 0);
      eventSummary = ` with ${totalEvents} event(s) across ${result.insights.length} recipient(s)`;
    }

    return {
      output: result,
      message: `Message insights for \`${result.messageId}\`${result.subject ? ` (subject: "${result.subject}")` : ''}${eventSummary}.`
    };
  })
  .build();
