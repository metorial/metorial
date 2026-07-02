import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let runCampaign = SlateTool.create(spec, {
  name: 'Run Campaign',
  key: 'run_campaign',
  description: `Launch a multi-channel campaign that sends messages across SMS, WhatsApp, Email, and other configured channels. Supports variable mapping, scheduling, and attachments.`,
  instructions: [
    'The campaign must be created in the MSG91 dashboard first. Use the campaign slug to trigger it.',
    'Schedule format is "YYYY-MM-DD H:i" (e.g., "2024-01-15 14:30").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignSlug: z.string().describe('Campaign identifier/slug from the MSG91 dashboard'),
      recipients: z
        .array(
          z.object({
            to: z
              .array(
                z.object({
                  name: z.string().optional().describe('Recipient name'),
                  email: z.string().optional().describe('Recipient email'),
                  mobiles: z
                    .string()
                    .optional()
                    .describe('Recipient mobile with country code'),
                  variables: z
                    .record(
                      z.string(),
                      z.object({
                        type: z.string().describe('Variable type'),
                        value: z.string().describe('Variable value')
                      })
                    )
                    .optional()
                    .describe('Per-recipient template variables')
                })
              )
              .describe('Array of recipient details'),
            cc: z
              .array(
                z.object({
                  name: z.string().optional(),
                  email: z.string().optional()
                })
              )
              .optional()
              .describe('CC recipients'),
            bcc: z
              .array(
                z.object({
                  name: z.string().optional(),
                  email: z.string().optional()
                })
              )
              .optional()
              .describe('BCC recipients'),
            variables: z
              .record(
                z.string(),
                z.object({
                  type: z.string().describe('Variable type'),
                  value: z.string().describe('Variable value')
                })
              )
              .optional()
              .describe('Group-level template variables')
          })
        )
        .describe('Recipient groups with their contact details and variables'),
      attachments: z
        .array(
          z.object({
            fileType: z.enum(['url', 'base64']).describe('Attachment file type'),
            fileName: z.string().describe('Attachment file name'),
            file: z.string().describe('File URL or base64 content')
          })
        )
        .optional()
        .describe('Campaign attachments'),
      replyTo: z
        .array(
          z.object({
            name: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Reply-to addresses'),
      scheduleFor: z.string().optional().describe('Schedule time in "YYYY-MM-DD H:i" format'),
      timezone: z.string().optional().describe('Timezone (default: Asia/Kolkata)'),
      timezoneBy: z
        .enum(['company', 'contact', 'manual'])
        .optional()
        .describe('Timezone source')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().optional().describe('Response message'),
      requestId: z.string().optional().describe('Campaign request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.runCampaign({
      campaignSlug: ctx.input.campaignSlug,
      recipients: ctx.input.recipients,
      attachments: ctx.input.attachments,
      replyTo: ctx.input.replyTo,
      scheduleFor: ctx.input.scheduleFor,
      timezone: ctx.input.timezone,
      timezoneBy: ctx.input.timezoneBy
    });

    let data = result.data || {};

    return {
      output: {
        status: result.status || 'success',
        message: data.message,
        requestId: data.request_id
      },
      message: `Campaign \`${ctx.input.campaignSlug}\` launched. ${data.message || ''}${data.request_id ? ` Request ID: \`${data.request_id}\`` : ''}`
    };
  })
  .build();
