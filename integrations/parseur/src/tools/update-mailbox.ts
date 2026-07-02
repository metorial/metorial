import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMailbox = SlateTool.create(spec, {
  name: 'Update Mailbox',
  key: 'update_mailbox',
  description: `Update the configuration of an existing mailbox (parser). You can change its name, AI engine, OCR settings, retention policy, and more. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      mailboxId: z.number().describe('ID of the mailbox to update'),
      name: z.string().optional().describe('New name for the mailbox'),
      aiEngine: z
        .enum(['DISABLED', 'GCP_AI_1', 'GCP_AI_2', 'GCP_AI_2_5'])
        .optional()
        .describe('AI engine to use'),
      processAttachments: z.boolean().optional().describe('Process email attachments'),
      retentionPolicy: z
        .number()
        .nullable()
        .optional()
        .describe('Document retention in days (null to remove)'),
      forceOcr: z.boolean().optional().describe('Force OCR on all uploads'),
      allowedExtensions: z.array(z.string()).optional().describe('Accepted file extensions'),
      splitPage: z
        .number()
        .nullable()
        .optional()
        .describe('Split documents at this page count (null to disable)'),
      disableDeskew: z.boolean().optional().describe('Disable image deskew/straightening')
    })
  )
  .output(
    z.object({
      mailboxId: z.number().describe('ID of the updated mailbox'),
      name: z.string().describe('Updated name'),
      aiEngine: z.string().describe('AI engine'),
      processAttachments: z.boolean().describe('Process attachments setting'),
      forceOcr: z.boolean().describe('Force OCR setting'),
      retentionPolicy: z.number().nullable().describe('Retention policy in days')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mailbox = await client.updateMailbox(ctx.input.mailboxId, {
      name: ctx.input.name,
      aiEngine: ctx.input.aiEngine,
      processAttachments: ctx.input.processAttachments,
      retentionPolicy: ctx.input.retentionPolicy,
      forceOcr: ctx.input.forceOcr,
      allowedExtensions: ctx.input.allowedExtensions,
      splitPage: ctx.input.splitPage,
      disableDeskew: ctx.input.disableDeskew
    });

    return {
      output: {
        mailboxId: mailbox.id,
        name: mailbox.name,
        aiEngine: mailbox.ai_engine,
        processAttachments: mailbox.process_attachments,
        forceOcr: mailbox.force_ocr,
        retentionPolicy: mailbox.retention_policy
      },
      message: `Updated mailbox **${mailbox.name}** (ID: ${mailbox.id}).`
    };
  })
  .build();
