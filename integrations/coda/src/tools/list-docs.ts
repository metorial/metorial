import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocsTool = SlateTool.create(spec, {
  name: 'List Docs',
  key: 'list_docs',
  description: `Search and list Coda docs accessible to the authenticated user. Filter by ownership, workspace, folder, starred status, or search query. Returns doc metadata including titles, IDs, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter docs by name'),
      isOwner: z.boolean().optional().describe('Show only docs owned by the API token owner'),
      isStarred: z.boolean().optional().describe('Show only starred docs'),
      workspaceId: z.string().optional().describe('Filter docs to a specific workspace'),
      folderId: z.string().optional().describe('Filter docs to a specific folder'),
      limit: z.number().optional().describe('Maximum number of docs to return (default 25)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      docs: z.array(
        z.object({
          docId: z.string().describe('Unique ID of the doc'),
          name: z.string().describe('Title of the doc'),
          ownerName: z.string().optional().describe('Name of the doc owner'),
          createdAt: z.string().optional().describe('Timestamp when the doc was created'),
          updatedAt: z.string().optional().describe('Timestamp of the last update'),
          workspaceId: z
            .string()
            .optional()
            .describe('ID of the workspace containing the doc'),
          folderId: z.string().optional().describe('ID of the folder containing the doc'),
          browserLink: z.string().optional().describe('URL to open the doc in browser')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocs({
      query: ctx.input.query,
      isOwner: ctx.input.isOwner,
      isStarred: ctx.input.isStarred,
      workspaceId: ctx.input.workspaceId,
      folderId: ctx.input.folderId,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let docs = (result.items || []).map((doc: any) => ({
      docId: doc.id,
      name: doc.name,
      ownerName: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      workspaceId: doc.workspace?.id,
      folderId: doc.folder?.id,
      browserLink: doc.browserLink
    }));

    return {
      output: {
        docs,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${docs.length}** doc(s).${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
