import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInBulk = SlateTool.create(spec, {
  name: 'Send in Bulk',
  key: 'send_in_bulk',
  description: `Send the same agreement to a large number of recipients simultaneously (MegaSign). Each recipient receives a personalized signing experience. Useful for mass onboarding, policy acknowledgments, or form collection.`,
  instructions: [
    'Upload the document first using the Upload Document tool, or use a library template ID.',
    'Each recipient set gets their own copy of the agreement.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the bulk send operation'),
      fileInfos: z
        .array(
          z.object({
            transientDocumentId: z
              .string()
              .optional()
              .describe('ID of a previously uploaded transient document'),
            libraryDocumentId: z
              .string()
              .optional()
              .describe('ID of a library document template')
          })
        )
        .describe('Documents to include'),
      recipientEmails: z.array(z.string()).describe('List of recipient email addresses'),
      signatureType: z
        .enum(['ESIGN', 'WRITTEN'])
        .optional()
        .describe('Type of signature. Defaults to "ESIGN".'),
      message: z.string().optional().describe('Message to include in the signing email'),
      ccs: z
        .array(
          z.object({
            email: z.string().describe('Email address to CC')
          })
        )
        .optional()
        .describe('Email addresses to CC on all agreements')
    })
  )
  .output(
    z.object({
      megaSignId: z.string().describe('ID of the bulk send operation'),
      totalRecipients: z.number().describe('Number of recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let recipientSetInfos = ctx.input.recipientEmails.map(email => ({
      recipientSetMemberInfos: [{ email }]
    }));

    let result = await client.createMegaSign({
      name: ctx.input.name,
      fileInfos: ctx.input.fileInfos,
      recipientSetInfos,
      signatureType: ctx.input.signatureType,
      message: ctx.input.message,
      ccs: ctx.input.ccs
    });

    return {
      output: {
        megaSignId: result.id,
        totalRecipients: ctx.input.recipientEmails.length
      },
      message: `Sent **${ctx.input.name}** in bulk to **${ctx.input.recipientEmails.length}** recipients. MegaSign ID: \`${result.id}\`.`
    };
  });
