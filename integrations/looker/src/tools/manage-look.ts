import { createApiServiceError, createBase64Attachment, SlateTool } from 'slates';
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

let requireLookId = (lookId: string | undefined, action: string) => {
  if (!lookId) {
    throw createApiServiceError(`lookId is required for ${action} action`, {
      reason: 'looker_manage_look_id_required'
    });
  }

  return lookId;
};

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

let mapLook = (look: any) => {
  if (look?.id === undefined || look.id === null) {
    throw createApiServiceError('Looker returned a Look without an ID.', {
      reason: 'looker_manage_look_invalid_response'
    });
  }

  return {
    lookId: String(look.id),
    title: optionalString(look.title),
    description: optionalString(look.description),
    folderId:
      look.folder_id === undefined || look.folder_id === null
        ? undefined
        : String(look.folder_id),
    folderName: optionalString(look.folder?.name),
    queryId:
      look.query_id === undefined || look.query_id === null
        ? undefined
        : String(look.query_id),
    isRunOnLoad: typeof look.is_run_on_load === 'boolean' ? look.is_run_on_load : undefined,
    public: typeof look.public === 'boolean' ? look.public : undefined,
    createdAt: optionalString(look.created_at),
    updatedAt: optionalString(look.updated_at),
    deleted: typeof look.deleted === 'boolean' ? look.deleted : undefined,
    viewCount: typeof look.view_count === 'number' ? look.view_count : undefined,
    favoriteCount: typeof look.favorite_count === 'number' ? look.favorite_count : undefined
  };
};

export let manageLook = SlateTool.create(spec, {
  name: 'Manage Look',
  key: 'manage_look',
  description: `Get, create, update, or permanently delete a Look (saved query with visualization). Can also run a Look and return JSON results inline or non-JSON results as attachments.`,
  instructions: [
    'To get a Look: set action to "get" and provide lookId.',
    'To create: set action to "create" with title, folderId, and optionally queryId.',
    'To update: set action to "update" with lookId and fields to change.',
    'To delete permanently (there is no undo): set action to "delete" with lookId.',
    'To run a Look: set action to "run" with lookId and optional resultFormat, limit, applyFormatting, and applyVis.'
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
      title: z
        .string()
        .nullable()
        .optional()
        .describe('Look title; null is supported for update'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Look description; use null to clear it during update'),
      folderId: z
        .string()
        .nullable()
        .optional()
        .describe('Target folder ID (required and non-null for create)'),
      queryId: z
        .string()
        .nullable()
        .optional()
        .describe('Query ID to associate with the Look; use null to clear it during update'),
      isRunOnLoad: z.boolean().optional().describe('Whether to run the query on load'),
      public: z.boolean().optional().describe('Whether the Look is publicly accessible'),
      resultFormat: z
        .enum([
          'json',
          'json_bi',
          'json_detail',
          'csv',
          'txt',
          'html',
          'md',
          'xlsx',
          'sql',
          'png',
          'jpg'
        ])
        .optional()
        .describe(
          'Result format for run action (default "json"); non-JSON formats are returned as attachments'
        ),
      limit: z.number().int().optional().describe('Row limit for run action'),
      applyFormatting: z
        .boolean()
        .optional()
        .describe('Apply model-specified formatting to run results'),
      applyVis: z.boolean().optional().describe('Apply visualization options to run results')
    })
  )
  .output(
    z.object({
      look: lookOutputSchema.optional().describe('Look metadata'),
      results: z
        .any()
        .optional()
        .describe('Query results or attachment metadata (only for run action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let look: any;
    let results: any;
    let attachment:
      | {
          contentBase64: string;
          mimeType: string;
        }
      | undefined;
    let actionMessage: string;

    switch (ctx.input.action) {
      case 'get': {
        let lookId = requireLookId(ctx.input.lookId, 'get');
        look = await client.getLook(lookId);
        actionMessage = `Retrieved Look **${look?.title ?? look?.id ?? 'unknown'}**`;
        break;
      }
      case 'create': {
        if (!ctx.input.title) {
          throw createApiServiceError('title is required for create action', {
            reason: 'looker_manage_look_title_required'
          });
        }
        if (!ctx.input.folderId) {
          throw createApiServiceError('folderId is required for create action', {
            reason: 'looker_manage_look_folder_id_required'
          });
        }
        look = await client.createLook({
          title: ctx.input.title,
          description: ctx.input.description,
          folder_id: ctx.input.folderId,
          query_id: ctx.input.queryId,
          is_run_on_load: ctx.input.isRunOnLoad,
          public: ctx.input.public
        });
        actionMessage = `Created Look **${look?.title ?? look?.id ?? 'unknown'}** (ID: ${look?.id ?? 'unknown'})`;
        break;
      }
      case 'update': {
        let lookId = requireLookId(ctx.input.lookId, 'update');
        let updateBody: Parameters<LookerClient['updateLook']>[1] = {};
        if (ctx.input.title !== undefined) updateBody.title = ctx.input.title;
        if (ctx.input.description !== undefined)
          updateBody.description = ctx.input.description;
        if (ctx.input.folderId !== undefined) updateBody.folder_id = ctx.input.folderId;
        if (ctx.input.queryId !== undefined) updateBody.query_id = ctx.input.queryId;
        if (ctx.input.isRunOnLoad !== undefined)
          updateBody.is_run_on_load = ctx.input.isRunOnLoad;
        if (ctx.input.public !== undefined) updateBody.public = ctx.input.public;
        if (Object.keys(updateBody).length === 0) {
          throw createApiServiceError('Provide at least one Look field to update.', {
            reason: 'looker_manage_look_update_fields_required'
          });
        }
        look = await client.updateLook(lookId, updateBody);
        actionMessage = `Updated Look **${look?.title ?? look?.id ?? 'unknown'}**`;
        break;
      }
      case 'delete': {
        let lookId = requireLookId(ctx.input.lookId, 'delete');
        look = await client.getLook(lookId);
        await client.deleteLook(lookId);
        actionMessage = `Permanently deleted Look **${look?.title ?? look?.id ?? 'unknown'}** (ID: ${lookId})`;
        break;
      }
      case 'run': {
        let lookId = requireLookId(ctx.input.lookId, 'run');
        look = await client.getLook(lookId);
        let format = ctx.input.resultFormat ?? 'json';
        let runResult = await client.runLook(lookId, format, {
          limit: ctx.input.limit,
          apply_formatting: ctx.input.applyFormatting,
          apply_vis: ctx.input.applyVis
        });
        results = runResult.results;
        attachment = runResult.attachment;
        let rowCount = Array.isArray(results) ? results.length : undefined;
        actionMessage = `Ran Look **${look?.title ?? look?.id ?? 'unknown'}**${rowCount !== undefined ? ` returning ${rowCount} rows` : ''}`;
        break;
      }
    }

    let lookOutput = look ? mapLook(look) : undefined;

    return {
      output: { look: lookOutput, results },
      attachments: attachment
        ? [createBase64Attachment(attachment.contentBase64, attachment.mimeType)]
        : undefined,
      message: actionMessage
    };
  })
  .build();
