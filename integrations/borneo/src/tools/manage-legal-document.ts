import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageLegalDocument = SlateTool.create(spec, {
  name: 'Manage Legal Document',
  key: 'manage_legal_document',
  description: `Create, retrieve, list, or delete legal documents such as privacy policies and data processing agreements. Legal documents are tracked with associated metadata for compliance purposes.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      nextToken: z
        .string()
        .optional()
        .describe('Continuation token from the previous list response.'),
      size: z.number().optional().describe('Maximum records to return.'),
      sortBy: z.string().optional().describe('Provider field to sort by.'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      documentId: z
        .string()
        .optional()
        .describe('Legal document ID (required for get or delete)'),
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
        documents: z.array(z.any()).optional(),
        document: z.any().optional().describe('Legal document record'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
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
          throw createApiServiceError(
            'name, documentLink, region, and isDiscoverInfotype are required for creating a legal document'
          );
        }
        let result = await client.createLegalDocument({
          name: ctx.input.name,
          documentLink: ctx.input.documentLink,
          region: ctx.input.region,
          isDiscoverInfotype: ctx.input.isDiscoverInfotype
        });
        let data = result;
        return {
          output: { document: data, success: true },
          message: `Legal document **${ctx.input.name}** created for region **${ctx.input.region}**.`
        };
      }
      case 'get': {
        if (!documentId) throw createApiServiceError('documentId is required for get action');
        let data = await client.getLegalDocument(documentId);
        return {
          output: { document: data, success: true },
          message: `Retrieved document **${documentId}**.`
        };
      }
      case 'list': {
        let data = await client.listLegalDocuments(ctx.input);
        let documents = readList(data, 'legalDocuments');
        return {
          output: { documents, success: true, ...listMetadata(data) },
          message: `Retrieved ${documents.length} documents.`
        };
      }
      case 'delete': {
        if (!documentId)
          throw createApiServiceError('documentId is required for get or delete action');
        await client.deleteLegalDocument(documentId);
        return {
          output: { success: true },
          message: `Legal document **${documentId}** deleted.`
        };
      }
    }
  })
  .build();
