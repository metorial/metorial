import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

let headerSchema = z.object({
  name: z.string().describe('Header name'),
  value: z.string().describe('Header value')
});

let attachmentSchema = z.object({
  fileName: z.string().describe('Attachment file name shown to recipients'),
  rawContentBase64: z
    .string()
    .describe('Base64-encoded attachment content for the SES HTTPS API'),
  contentType: z.string().optional().describe('Attachment MIME type, such as application/pdf'),
  contentDisposition: z
    .enum(['ATTACHMENT', 'INLINE'])
    .optional()
    .describe('How the attachment should be rendered'),
  contentDescription: z.string().optional().describe('Human-readable attachment description'),
  contentId: z.string().optional().describe('Content ID for inline attachment references'),
  contentTransferEncoding: z
    .enum(['BASE64', 'QUOTED_PRINTABLE', 'SEVEN_BIT'])
    .optional()
    .describe('Transfer encoding for the attachment')
});

let recipientCount = (entry: {
  toAddresses?: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
}) =>
  (entry.toAddresses?.length ?? 0) +
  (entry.ccAddresses?.length ?? 0) +
  (entry.bccAddresses?.length ?? 0);

let validateBulkEmailInput = (input: {
  templateName?: string;
  templateArn?: string;
  entries: {
    toAddresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
  }[];
}) => {
  if (!input.templateName && !input.templateArn) {
    throw createApiServiceError('templateName or templateArn is required for bulk emails.');
  }
  if (input.templateName && input.templateArn) {
    throw createApiServiceError('Provide only one of templateName or templateArn.');
  }
  if (input.entries.length === 0) {
    throw createApiServiceError('entries must contain at least one recipient group.');
  }

  input.entries.forEach((entry, index) => {
    if (recipientCount(entry) === 0) {
      throw createApiServiceError(
        `entries[${index}] must include at least one To, Cc, or Bcc recipient.`
      );
    }
  });
};

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
      templateName: z.string().optional().describe('Name of the SES email template to use'),
      templateArn: z.string().optional().describe('ARN of the SES email template to use'),
      defaultTemplateData: z
        .string()
        .optional()
        .describe('Default JSON string of template replacement data'),
      headers: z
        .array(headerSchema)
        .optional()
        .describe('Default message headers applied to all entries'),
      attachments: z
        .array(attachmentSchema)
        .optional()
        .describe('Default attachments sent to every recipient'),
      configurationSetName: z.string().optional().describe('Configuration set to apply'),
      fromEmailAddressIdentityArn: z
        .string()
        .optional()
        .describe('Identity ARN authorizing the From email address'),
      feedbackForwardingEmailAddress: z
        .string()
        .optional()
        .describe('Address that should receive bounce and complaint notifications'),
      feedbackForwardingEmailAddressIdentityArn: z
        .string()
        .optional()
        .describe('Identity ARN authorizing the feedback forwarding address'),
      endpointId: z
        .string()
        .optional()
        .describe('SES multi-region endpoint ID to route this send through'),
      tenantName: z
        .string()
        .optional()
        .describe('SES tenant name to associate with this send'),
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
            replacementHeaders: z
              .array(headerSchema)
              .optional()
              .describe('Per-recipient headers overriding or adding to defaults'),
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
    validateBulkEmailInput(ctx.input);
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
          templateArn: ctx.input.templateArn,
          templateData: ctx.input.defaultTemplateData,
          headers: ctx.input.headers,
          attachments: ctx.input.attachments
        }
      },
      feedbackForwardingEmailAddress: ctx.input.feedbackForwardingEmailAddress,
      feedbackForwardingEmailAddressIdentityArn:
        ctx.input.feedbackForwardingEmailAddressIdentityArn,
      fromEmailAddressIdentityArn: ctx.input.fromEmailAddressIdentityArn,
      endpointId: ctx.input.endpointId,
      tenantName: ctx.input.tenantName,
      bulkEmailEntries: ctx.input.entries.map(e => ({
        destination: {
          toAddresses: e.toAddresses,
          ccAddresses: e.ccAddresses,
          bccAddresses: e.bccAddresses
        },
        replacementEmailContent: e.replacementTemplateData
          ? { replacementTemplate: { replacementTemplateData: e.replacementTemplateData } }
          : undefined,
        replacementHeaders: e.replacementHeaders,
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
