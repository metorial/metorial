import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInBulk = SlateTool.create(spec, {
  name: 'Send in Bulk',
  key: 'send_in_bulk',
  description: `Send the same agreement to many recipients using Adobe Acrobat Sign Send in Bulk (MegaSign). Current v6 bulk sends require a CSV transient document that contains the child agreement recipient information.`,
  instructions: [
    'Upload the agreement document first using Upload Document, or use a library template ID.',
    'Upload the Adobe Acrobat Sign Send in Bulk recipient CSV using Upload Document with mimeType "text/csv", then pass its transientDocumentId as childAgreementsTransientDocumentId.',
    'Each CSV row creates a child agreement for the corresponding recipient data.'
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
      childAgreementsTransientDocumentId: z
        .string()
        .describe(
          'Transient document ID of the Send in Bulk CSV containing child agreement recipient information'
        ),
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
      bulkSendId: z.string().describe('ID of the Send in Bulk operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.createMegaSign({
      name: ctx.input.name,
      fileInfos: ctx.input.fileInfos,
      childAgreementsTransientDocumentId: ctx.input.childAgreementsTransientDocumentId,
      signatureType: ctx.input.signatureType,
      message: ctx.input.message,
      ccs: ctx.input.ccs
    });

    return {
      output: {
        bulkSendId: result.id
      },
      message: `Created Send in Bulk **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  });
