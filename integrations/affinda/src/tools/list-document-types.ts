import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocumentTypes = SlateTool.create(spec, {
  name: 'List Document Types',
  key: 'list_document_types',
  description: `List available document types (extractors) configured in your Affinda account. Document types define the AI model configuration for specific document kinds such as resumes, invoices, bank statements, passports, etc. Use this to discover available document type identifiers for uploading documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationIdentifier: z
        .string()
        .optional()
        .describe('Filter document types by organization.'),
      workspaceIdentifier: z
        .string()
        .optional()
        .describe('Filter document types by workspace.')
    })
  )
  .output(
    z.object({
      documentTypes: z
        .array(
          z.object({
            documentTypeIdentifier: z
              .string()
              .describe('Unique identifier of the document type.'),
            name: z.string().optional().describe('Display name of the document type.'),
            baseType: z
              .string()
              .optional()
              .describe('Base type category (e.g., "resume", "invoice").')
          })
        )
        .describe('List of available document types.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listDocumentTypes({
      organization: ctx.input.organizationIdentifier,
      workspace: ctx.input.workspaceIdentifier
    });

    let documentTypes = (Array.isArray(result) ? result : (result.results ?? [])).map(
      (dt: any) => ({
        documentTypeIdentifier: dt.identifier ?? '',
        name: dt.name,
        baseType: dt.baseType
      })
    );

    return {
      output: { documentTypes },
      message: `Found **${documentTypes.length}** document type(s).`
    };
  })
  .build();
