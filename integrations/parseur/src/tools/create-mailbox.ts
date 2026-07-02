import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMailbox = SlateTool.create(spec, {
  name: 'Create Mailbox',
  key: 'create_mailbox',
  description: `Create a new mailbox (parser) in Parseur. A mailbox is configured to process a specific type of document. You can optionally start from a ready-made template (e.g. invoices, leads, travel, resume-cv) and choose an AI engine.`,
  instructions: [
    'Use templateSlug to start from a ready-made template. Common slugs: invoices, leads, travel, resume-cv, food-delivery, real-estate.',
    'AI engines: DISABLED (no AI), GCP_AI_1 (standard), GCP_AI_2 (advanced), GCP_AI_2_5 (latest).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe('Name for the new mailbox. If omitted, a random name is generated.'),
      aiEngine: z
        .enum(['DISABLED', 'GCP_AI_1', 'GCP_AI_2', 'GCP_AI_2_5'])
        .optional()
        .describe('AI engine to use. Defaults to GCP_AI_2.'),
      templateSlug: z
        .string()
        .optional()
        .describe(
          'Ready-made template slug (e.g. invoices, leads, travel, resume-cv, food-delivery, real-estate)'
        ),
      processAttachments: z.boolean().optional().describe('Process email attachments'),
      retentionPolicy: z.number().optional().describe('Document retention policy in days'),
      forceOcr: z.boolean().optional().describe('Force OCR on all uploaded documents'),
      allowedExtensions: z
        .array(z.string())
        .optional()
        .describe('Restrict accepted file types (e.g. ["pdf", "docx"])')
    })
  )
  .output(
    z.object({
      mailboxId: z.number().describe('ID of the newly created mailbox'),
      name: z.string().describe('Name of the mailbox'),
      emailPrefix: z.string().describe('Email prefix for sending documents'),
      emailAddress: z.string().describe('Full email address for document submission'),
      aiEngine: z.string().describe('AI engine selected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mailbox = await client.createMailbox({
      name: ctx.input.name,
      aiEngine: ctx.input.aiEngine,
      templateSlug: ctx.input.templateSlug,
      processAttachments: ctx.input.processAttachments,
      retentionPolicy: ctx.input.retentionPolicy,
      forceOcr: ctx.input.forceOcr,
      allowedExtensions: ctx.input.allowedExtensions
    });

    return {
      output: {
        mailboxId: mailbox.id,
        name: mailbox.name,
        emailPrefix: mailbox.email_prefix,
        emailAddress: `${mailbox.email_prefix}@parseur.com`,
        aiEngine: mailbox.ai_engine
      },
      message: `Created mailbox **${mailbox.name}** (ID: ${mailbox.id}). Send documents to \`${mailbox.email_prefix}@parseur.com\` or upload via API.`
    };
  })
  .build();
