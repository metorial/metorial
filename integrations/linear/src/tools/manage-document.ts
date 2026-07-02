import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

let documentOutputSchema = z.object({
  documentId: z.string().describe('Document ID'),
  title: z.string().describe('Document title'),
  content: z.string().nullable().describe('Document content in Markdown'),
  url: z.string().describe('URL to the document in Linear'),
  icon: z.string().nullable().describe('Document icon'),
  color: z.string().nullable().describe('Document color'),
  creatorId: z.string().nullable().describe('Creator user ID'),
  creatorName: z.string().nullable().describe('Creator name'),
  projectId: z.string().nullable().describe('Associated project ID'),
  projectName: z.string().nullable().describe('Associated project name'),
  createdAt: z.string(),
  updatedAt: z.string()
});

let mapDocumentToOutput = (doc: any) => ({
  documentId: doc.id,
  title: doc.title,
  content: doc.content || null,
  url: doc.url,
  icon: doc.icon || null,
  color: doc.color || null,
  creatorId: doc.creator?.id || null,
  creatorName: doc.creator?.name || null,
  projectId: doc.project?.id || null,
  projectName: doc.project?.name || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export let createDocumentTool = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Creates a new document in Linear. Documents support rich Markdown content and can be associated with projects.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Document title'),
      content: z.string().optional().describe('Document content in Markdown'),
      projectId: z.string().optional().describe('Associate document with a project'),
      icon: z.string().optional().describe('Document icon emoji'),
      color: z.string().optional().describe('Document color')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = { title: ctx.input.title };
    if (ctx.input.content !== undefined) input.content = ctx.input.content;
    if (ctx.input.projectId) input.projectId = ctx.input.projectId;
    if (ctx.input.icon) input.icon = ctx.input.icon;
    if (ctx.input.color) input.color = ctx.input.color;

    let result = await client.createDocument(input);

    if (!result.success) {
      throw linearServiceError('Failed to create document');
    }

    return {
      output: mapDocumentToOutput(result.document),
      message: `Created document **${result.document.title}**`
    };
  })
  .build();

export let updateDocumentTool = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Updates an existing document's title, content, or project association.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New content in Markdown'),
      projectId: z
        .string()
        .nullable()
        .optional()
        .describe('New project ID or null to disassociate'),
      icon: z.string().optional().describe('New icon emoji'),
      color: z.string().optional().describe('New color')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let input: Record<string, any> = {};
    if (ctx.input.title !== undefined) input.title = ctx.input.title;
    if (ctx.input.content !== undefined) input.content = ctx.input.content;
    if (ctx.input.projectId !== undefined) input.projectId = ctx.input.projectId;
    if (ctx.input.icon !== undefined) input.icon = ctx.input.icon;
    if (ctx.input.color !== undefined) input.color = ctx.input.color;

    let result = await client.updateDocument(ctx.input.documentId, input);

    if (!result.success) {
      throw linearServiceError('Failed to update document');
    }

    return {
      output: mapDocumentToOutput(result.document),
      message: `Updated document **${result.document.title}**`
    };
  })
  .build();

export let listDocumentsTool = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Lists documents in the workspace with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of documents to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      documents: z.array(documentOutputSchema),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listDocuments({
      first: ctx.input.first,
      after: ctx.input.after
    });

    let documents = (result.nodes || []).map(mapDocumentToOutput);

    return {
      output: {
        documents,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${documents.length}** documents`
    };
  })
  .build();
