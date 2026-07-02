import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let sendBulkEmail = SlateTool.create(spec, {
  name: 'Send Bulk Email',
  key: 'send_bulk_email',
  description: `Send a templated email to multiple recipients in bulk. Each recipient can have personalized replacement data. Uses SES email templates for consistent formatting with per-recipient customization.`,
  instructions: [
    'A template must be created in SES before sending bulk emails.',
    'templateData fields should be JSON strings mapping template variable names to values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromEmailAddress: z.string().describe('Verified sender email address'),
      templateName: z.string().describe('Name of the SES email template to use'),
      defaultTemplateData: z
        .string()
        .optional()
        .describe('Default JSON string of template replacement data'),
      configurationSetName: z.string().optional().describe('Configuration set to apply'),
      replyToAddresses: z.array(z.string()).optional().describe('Reply-to email addresses'),
      defaultTags: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Default message tags applied to all entries'),
      entries: z
        .array(
          z.object({
            toAddresses: z
              .array(z.string())
              .describe('To recipient email addresses for this entry'),
            ccAddresses: z.array(z.string()).optional().describe('Cc recipients'),
            bccAddresses: z.array(z.string()).optional().describe('Bcc recipients'),
            replacementTemplateData: z
              .string()
              .optional()
              .describe('Per-recipient JSON template data overriding defaults'),
            replacementTags: z
              .array(
                z.object({
                  name: z.string(),
                  value: z.string()
                })
              )
              .optional()
              .describe('Per-recipient message tags')
          })
        )
        .describe('List of bulk email entries, one per recipient group')
    })
  )
  .output(
    z.object({
      bulkEmailEntryResults: z
        .array(
          z.object({
            status: z.string().describe('Delivery status (e.g., SUCCESS, FAILED)'),
            error: z.string().optional().describe('Error message if sending failed'),
            messageId: z.string().optional().describe('Message ID if successfully accepted')
          })
        )
        .describe('Results for each bulk email entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.sendBulkEmail({
      fromEmailAddress: ctx.input.fromEmailAddress,
      replyToAddresses: ctx.input.replyToAddresses,
      defaultEmailTags: ctx.input.defaultTags,
      configurationSetName: ctx.input.configurationSetName,
      defaultContent: {
        template: {
          templateName: ctx.input.templateName,
          templateData: ctx.input.defaultTemplateData
        }
      },
      bulkEmailEntries: ctx.input.entries.map(e => ({
        destination: {
          toAddresses: e.toAddresses,
          ccAddresses: e.ccAddresses,
          bccAddresses: e.bccAddresses
        },
        replacementEmailContent: e.replacementTemplateData
          ? { replacementTemplate: { replacementTemplateData: e.replacementTemplateData } }
          : undefined,
        replacementTags: e.replacementTags
      }))
    });

    let successCount = result.bulkEmailEntryResults.filter(r => r.status === 'SUCCESS').length;
    let failCount = result.bulkEmailEntryResults.length - successCount;

    return {
      output: result,
      message: `Bulk email sent: **${successCount}** succeeded, **${failCount}** failed out of ${result.bulkEmailEntryResults.length} entries.`
    };
  })
  .build();
