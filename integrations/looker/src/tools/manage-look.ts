import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let lookOutputSchema = z.object({
  lookId: z.string().describe('Look ID'),
  title: z.string().optional().describe('Look title'),
  description: z.string().optional().describe('Look description'),
  folderId: z.string().optional().describe('Folder ID'),
  folderName: z.string().optional().describe('Folder name'),
  queryId: z.string().optional().describe('Query ID'),
  isRunOnLoad: z.boolean().optional().describe('Whether the Look runs on load'),
  public: z.boolean().optional().describe('Whether the Look is public'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('Whether the Look is soft-deleted'),
  viewCount: z.number().optional().describe('View count'),
  favoriteCount: z.number().optional().describe('Favorite count')
});

export let manageLook = SlateTool.create(spec, {
  name: 'Manage Look',
  key: 'manage_look',
  description: `Get, create, update, or delete a Look (saved query with visualization). Can also run a Look and return its results.`,
  instructions: [
    'To get a Look: set action to "get" and provide lookId.',
    'To create: set action to "create" with title, folderId, and optionally queryId.',
    'To update: set action to "update" with lookId and fields to change.',
    'To delete: set action to "delete" with lookId.',
    'To run a Look: set action to "run" with lookId and optional resultFormat/limit.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete', 'run'])
        .describe('Action to perform'),
      lookId: z
        .string()
        .optional()
        .describe('Look ID (required for get, update, delete, run)'),
      title: z.string().optional().describe('Look title'),
      description: z.string().optional().describe('Look description'),
      folderId: z.string().optional().describe('Target folder ID (required for create)'),
      queryId: z.string().optional().describe('Query ID to associate with the Look'),
      isRunOnLoad: z.boolean().optional().describe('Whether to run the query on load'),
      resultFormat: z
        .enum(['json', 'json_detail', 'csv', 'txt', 'html', 'md', 'xlsx', 'sql'])
        .optional()
        .describe('Result format for run action (default "json")'),
      limit: z.number().optional().describe('Row limit for run action')
    })
  )
  .output(
    z.object({
      look: lookOutputSchema.optional().describe('Look metadata'),
      results: z.any().optional().describe('Query results (only for run action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let look: any;
    let results: any;
    let actionMessage: string;

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.lookId) throw new Error('lookId is required for get action');
        look = await client.getLook(ctx.input.lookId);
        actionMessage = `Retrieved Look **${look.title}**`;
        break;
      }
      case 'create': {
        if (!ctx.input.title) throw new Error('title is required for create action');
        if (!ctx.input.folderId) throw new Error('folderId is required for create action');
        look = await client.createLook({
          title: ctx.input.title,
          description: ctx.input.description,
          folder_id: ctx.input.folderId,
          query_id: ctx.input.queryId,
          is_run_on_load: ctx.input.isRunOnLoad
        });
        actionMessage = `Created Look **${look.title}** (ID: ${look.id})`;
        break;
      }
      case 'update': {
        if (!ctx.input.lookId) throw new Error('lookId is required for update action');
        let updateBody: Record<string, any> = {};
        if (ctx.input.title !== undefined) updateBody.title = ctx.input.title;
        if (ctx.input.description !== undefined)
          updateBody.description = ctx.input.description;
        if (ctx.input.folderId !== undefined) updateBody.folder_id = ctx.input.folderId;
        if (ctx.input.queryId !== undefined) updateBody.query_id = ctx.input.queryId;
        if (ctx.input.isRunOnLoad !== undefined)
          updateBody.is_run_on_load = ctx.input.isRunOnLoad;
        look = await client.updateLook(ctx.input.lookId, updateBody);
        actionMessage = `Updated Look **${look.title}**`;
        break;
      }
      case 'delete': {
        if (!ctx.input.lookId) throw new Error('lookId is required for delete action');
        look = await client.getLook(ctx.input.lookId);
        await client.deleteLook(ctx.input.lookId);
        actionMessage = `Deleted Look **${look.title}** (ID: ${ctx.input.lookId})`;
        break;
      }
      case 'run': {
        if (!ctx.input.lookId) throw new Error('lookId is required for run action');
        look = await client.getLook(ctx.input.lookId);
        let format = ctx.input.resultFormat || 'json';
        results = await client.runLook(ctx.input.lookId, format, {
          limit: ctx.input.limit
        });
        let rowCount = Array.isArray(results) ? results.length : undefined;
        actionMessage = `Ran Look **${look.title}**${rowCount !== undefined ? ` returning ${rowCount} rows` : ''}`;
        break;
      }
    }

    let lookOutput = look
      ? {
          lookId: String(look.id),
          title: look.title,
          description: look.description,
          folderId: look.folder_id ? String(look.folder_id) : undefined,
          folderName: look.folder?.name,
          queryId: look.query_id ? String(look.query_id) : undefined,
          isRunOnLoad: look.is_run_on_load,
          public: look.public,
          createdAt: look.created_at,
          updatedAt: look.updated_at,
          deleted: look.deleted,
          viewCount: look.view_count,
          favoriteCount: look.favorite_count
        }
      : undefined;

    return {
      output: { look: lookOutput, results },
      message: actionMessage
    };
  })
  .build();
