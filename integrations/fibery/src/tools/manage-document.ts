import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDocumentTool = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description: `Read or write rich text document content for an entity's document field. Documents are Fibery's rich text fields (e.g., Description). Supports Markdown, HTML, JSON, and plain-text formats. To read, provide the entity and field info. To write, also provide the content.`,
  instructions: [
    'To get the document secret, first query the entity selecting the document field with its nested secret: {"TypeName/Description": ["Collaboration~Documents/secret"]}.',
    'If you already have the document secret, provide it directly via documentSecret.',
    'If you provide typeName, entityId, and documentField, the tool will retrieve the secret automatically.',
    'When writing content, specify the format matching your content (default: md for Markdown).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentSecret: z
        .string()
        .optional()
        .describe(
          'The document secret UUID. If not provided, typeName, entityId, and documentField are required to look it up.'
        ),
      typeName: z
        .string()
        .optional()
        .describe('Fully qualified type name (required if documentSecret is not provided)'),
      entityId: z
        .string()
        .optional()
        .describe('The fibery/id of the entity (required if documentSecret is not provided)'),
      documentField: z
        .string()
        .optional()
        .describe(
          'Fully qualified document field name, e.g., "Project/Description" (required if documentSecret is not provided)'
        ),
      action: z.enum(['read', 'write']).describe('Whether to read or write the document'),
      content: z
        .string()
        .optional()
        .describe('Content to write to the document (required for write action)'),
      format: z
        .enum(['md', 'html', 'json', 'plain-text'])
        .optional()
        .default('md')
        .describe('Content format (default: md)')
    })
  )
  .output(
    z.object({
      documentSecret: z.string().describe('The document secret UUID'),
      content: z.string().optional().describe('The document content (for read action)'),
      updated: z
        .boolean()
        .optional()
        .describe('Whether the document was updated (for write action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    let secret = ctx.input.documentSecret;

    // Resolve document secret if not provided
    if (!secret) {
      if (!ctx.input.typeName || !ctx.input.entityId || !ctx.input.documentField) {
        throw new Error(
          'Either documentSecret or all of typeName, entityId, and documentField must be provided'
        );
      }

      let entities = await client.queryEntities({
        typeName: ctx.input.typeName,
        select: [
          'fibery/id',
          { [ctx.input.documentField]: ['Collaboration~Documents/secret'] }
        ],
        where: ['=', ['fibery/id'], '$id'],
        limit: 1,
        queryParams: { $id: ctx.input.entityId }
      });

      let entity = entities[0];
      if (!entity) {
        throw new Error(`Entity ${ctx.input.entityId} not found in ${ctx.input.typeName}`);
      }

      secret = entity[ctx.input.documentField]?.['Collaboration~Documents/secret'];
      if (!secret) {
        throw new Error(`Document secret not found for field ${ctx.input.documentField}`);
      }
    }

    if (ctx.input.action === 'read') {
      let doc = await client.getDocumentContent(secret, ctx.input.format);
      return {
        output: {
          documentSecret: secret,
          content: doc.content
        },
        message: `Read document content (${ctx.input.format} format, ${doc.content.length} chars).`
      };
    } else {
      if (!ctx.input.content) {
        throw new Error('Content is required for write action');
      }
      await client.updateDocumentContent(secret, ctx.input.content, ctx.input.format);
      return {
        output: {
          documentSecret: secret,
          updated: true
        },
        message: `Updated document content (${ctx.input.format} format).`
      };
    }
  })
  .build();
