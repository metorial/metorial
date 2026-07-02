import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let manageDocument = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description: `Initialize, retrieve, update, or delete documents within signature requests. Documents must be initialized before content can be uploaded. Supports PDF, DOCX, images, and structured data.`,
  instructions: [
    'To add a document to a signature request: first init with signatureRequestId, then upload content separately.',
    'Use action "init" to create a new document placeholder within a signature request.',
    'Use action "get" to retrieve document metadata and status.',
    'Use action "delete" to remove a document.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['init', 'get', 'get_context', 'delete']).describe('Action to perform'),
      documentId: z
        .string()
        .optional()
        .describe('Document ID (required for get, get_context, delete)'),
      signatureRequestId: z
        .string()
        .optional()
        .describe('Signature request ID (required for init)'),
      documentType: z
        .enum(['PDF', 'PDF_ENCRYPTED', 'FILE', 'DATA_JSON', 'DATA_XML', 'PRIVATE_FILE'])
        .optional()
        .describe('Document type (for init)'),
      title: z.string().optional().describe('Document title (for init)'),
      description: z.string().optional().describe('Document description (for init)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      action: z.string().describe('Action performed'),
      document: z.any().optional().describe('Document data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    if (ctx.input.action === 'init') {
      if (!ctx.input.signatureRequestId) {
        throw new Error('signatureRequestId is required for init action');
      }
      let result = await client.initDocument({
        signatureRequestId: ctx.input.signatureRequestId,
        documentType: ctx.input.documentType,
        title: ctx.input.title,
        description: ctx.input.description
      });
      return {
        output: {
          documentId: result.documentId,
          action: 'init',
          document: result
        },
        message: `Document **${result.documentId}** initialized in signature request ${ctx.input.signatureRequestId}.`
      };
    }

    if (!ctx.input.documentId) {
      throw new Error('documentId is required for this action');
    }

    if (ctx.input.action === 'get') {
      let result = await client.getDocument(ctx.input.documentId);
      return {
        output: {
          documentId: ctx.input.documentId,
          action: 'get',
          document: result
        },
        message: `Retrieved document **${ctx.input.documentId}**.`
      };
    }

    if (ctx.input.action === 'get_context') {
      let result = await client.getDocumentContext(ctx.input.documentId);
      return {
        output: {
          documentId: ctx.input.documentId,
          action: 'get_context',
          document: result
        },
        message: `Retrieved full context for document **${ctx.input.documentId}**.`
      };
    }

    let result = await client.deleteDocument(ctx.input.documentId);
    return {
      output: {
        documentId: ctx.input.documentId,
        action: 'delete',
        document: result
      },
      message: `Document **${ctx.input.documentId}** deleted.`
    };
  })
  .build();
