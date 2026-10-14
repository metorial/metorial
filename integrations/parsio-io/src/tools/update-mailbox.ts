import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMailbox = SlateTool.create(spec, {
  name: 'Update Mailbox',
  key: 'update_mailbox',
  description: `Update settings of an existing mailbox. Allows changing the name, email prefix, attachment processing, email collection, and alert frequency.`
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to update'),
      name: z.string().optional().describe('New name for the mailbox'),
      emailPrefix: z.string().optional().describe('New email prefix for the mailbox'),
      processAttachments: z.boolean().optional().describe('Whether to process attachments'),
      collectEmails: z
        .boolean()
        .optional()
        .describe('Whether to auto-collect email addresses'),
      alertEmailH: z.number().optional().describe('Alert frequency in hours (0 to disable)'),
      receiveEmail: z
        .boolean()
        .optional()
        .describe('Whether to receive emails in this mailbox'),
      preset: z.string().optional().describe('Parser type or preset configured in Parsio'),
      mlModel: z
        .string()
        .optional()
        .describe('OCR or AI model supported by the selected parser')
    })
  )
  .output(
    z.object({
      mailboxId: z.string().describe('ID of the updated mailbox'),
      name: z.string().optional().describe('Updated name'),
      email: z.string().optional().describe('Email address of the mailbox')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.alertEmailH !== undefined && ctx.input.alertEmailH < 0) {
      throw createApiServiceError('alertEmailH must be zero or greater.', {
        reason: 'invalid_alert_frequency'
      });
    }
    if (
      !Object.entries(ctx.input).some(
        ([key, value]) => key !== 'mailboxId' && value !== undefined
      )
    ) {
      throw createApiServiceError('Provide at least one mailbox setting to update.', {
        reason: 'empty_mailbox_update'
      });
    }
    let client = new Client({ token: ctx.auth.token });
    let mb = await client.updateMailbox(ctx.input.mailboxId, {
      name: ctx.input.name,
      emailPrefix: ctx.input.emailPrefix,
      processAttachments: ctx.input.processAttachments,
      collectEmails: ctx.input.collectEmails,
      alertEmailH: ctx.input.alertEmailH,
      receiveEmail: ctx.input.receiveEmail,
      preset: ctx.input.preset,
      mlModel: ctx.input.mlModel
    });

    return {
      output: {
        mailboxId: mb._id || mb.id || ctx.input.mailboxId,
        name: mb.name ?? undefined,
        email: mb.email ?? undefined
      },
      message: `Updated mailbox **${mb.name || ctx.input.mailboxId}**.`
    };
  })
  .build();
