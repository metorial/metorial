import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Lists Google Docs documents accessible to the user. Can filter by name, folder, or other criteria. Returns document metadata including IDs for use with other tools.`,
  instructions: [
    'Results depend on the granted Drive scope: with the default drive.file consent, only documents created or opened through this connection are listed.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleDocsActionScopes.listDocuments)
  .input(
    z.object({
      searchQuery: z.string().optional().describe('Search term to filter documents by name'),
      folderId: z.string().optional().describe('ID of a folder to list documents from'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Number of documents to return per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results'),
      orderBy: z
        .enum([
          'modifiedTime desc',
          'modifiedTime asc',
          'name',
          'name desc',
          'createdTime desc',
          'createdTime asc'
        ])
        .optional()
        .default('modifiedTime desc')
        .describe('Sort order for results')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('Unique identifier of the document'),
            name: z.string().describe('Name of the document'),
            modifiedTime: z
              .string()
              .optional()
              .describe('Last modification time in ISO format'),
            createdTime: z.string().optional().describe('Creation time in ISO format'),
            webViewLink: z
              .string()
              .optional()
              .describe('URL to open the document in Google Docs'),
            lastModifiedBy: z
              .object({
                name: z.string().optional(),
                email: z.string().optional()
              })
              .optional()
              .describe('User who last modified the document')
          })
        )
        .describe('List of documents'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page of results'),
      totalCount: z.number().describe('Number of documents returned in this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDocsClient({
      token: ctx.auth.token
    });

    // Build query for Google Docs only
    let queryParts: string[] = ["mimeType='application/vnd.google-apps.document'"];

    if (ctx.input.searchQuery) {
      queryParts.push(`name contains '${ctx.input.searchQuery.replace(/'/g, "\\'")}'`);
    }

    if (ctx.input.folderId) {
      queryParts.push(`'${ctx.input.folderId}' in parents`);
    }

    let result = await client.listDriveFiles({
      query: queryParts.join(' and '),
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      orderBy: ctx.input.orderBy
    });

    let documents = result.files.map(file => ({
      documentId: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime,
      createdTime: file.createdTime,
      webViewLink: file.webViewLink,
      lastModifiedBy: file.lastModifyingUser
        ? {
            name: file.lastModifyingUser.displayName,
            email: file.lastModifyingUser.emailAddress
          }
        : undefined
    }));

    return {
      output: {
        documents,
        nextPageToken: result.nextPageToken,
        totalCount: documents.length
      },
      message: `Found **${documents.length} document(s)**${ctx.input.searchQuery ? ` matching "${ctx.input.searchQuery}"` : ''}${result.nextPageToken ? ' (more available)' : ''}`
    };
  })
  .build();
