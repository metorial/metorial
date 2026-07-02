import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocumentTypes = SlateTool.create(spec, {
  name: 'List Document Types',
  key: 'list_document_types',
  description: `Retrieves all document types available in the account. Document types categorize documents (e.g., Proposal, Contract, Quote). The default type is "Proposal".`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      documentTypes: z.array(z.any()).describe('List of document types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocumentTypes(ctx.input.page);
    let documentTypes = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    return {
      output: {
        status: result.status ?? 'success',
        documentTypes
      },
      message: `Retrieved ${documentTypes.length} document type(s).`
    };
  })
  .build();

export let createDocumentType = SlateTool.create(spec, {
  name: 'Create Document Type',
  key: 'create_document_type',
  description: `Creates a new document type for categorizing proposals and other documents. Specify a custom name and optional color.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      typeName: z
        .string()
        .describe('Name for the document type (e.g., "Contract", "Quote", "Client Sign-Off")'),
      typeColour: z
        .string()
        .optional()
        .describe('Hex color code for the document type (e.g., "#FF5733")')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      documentType: z.any().optional().describe('Created document type data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createDocumentType({
      typeName: ctx.input.typeName,
      typeColour: ctx.input.typeColour
    });

    return {
      output: {
        status: result.status ?? 'success',
        documentType: result.data
      },
      message: `Created document type **${ctx.input.typeName}**.`
    };
  })
  .build();
