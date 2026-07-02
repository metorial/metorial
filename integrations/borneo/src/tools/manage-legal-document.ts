import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLegalDocument = SlateTool.create(spec, {
  name: 'Manage Legal Document',
  key: 'manage_legal_document',
  description: `Create or delete legal documents such as privacy policies and data processing agreements. Legal documents are tracked with associated metadata for compliance purposes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      documentId: z.string().optional().describe('Legal document ID (required for delete)'),
      name: z.string().optional().describe('Document name'),
      documentLink: z.string().optional().describe('URL link to the document'),
      region: z.string().optional().describe('Applicable region/jurisdiction'),
      isDiscoverInfotype: z
        .boolean()
        .optional()
        .describe('Whether this document is related to discovered infotype')
    })
  )
  .output(
    z
      .object({
        document: z.any().optional().describe('Legal document record'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, documentId } = ctx.input;

    switch (action) {
      case 'create': {
        if (
          !ctx.input.name ||
          !ctx.input.documentLink ||
          !ctx.input.region ||
          ctx.input.isDiscoverInfotype === undefined
        ) {
          throw new Error(
            'name, documentLink, region, and isDiscoverInfotype are required for creating a legal document'
          );
        }
        let result = await client.createLegalDocument({
          name: ctx.input.name,
          documentLink: ctx.input.documentLink,
          region: ctx.input.region,
          isDiscoverInfotype: ctx.input.isDiscoverInfotype
        });
        let data = result?.data ?? result;
        return {
          output: { document: data, success: true },
          message: `Legal document **${ctx.input.name}** created for region **${ctx.input.region}**.`
        };
      }
      case 'delete': {
        if (!documentId) throw new Error('documentId is required for delete action');
        await client.deleteLegalDocument(documentId);
        return {
          output: { success: true },
          message: `Legal document **${documentId}** deleted.`
        };
      }
    }
  })
  .build();
