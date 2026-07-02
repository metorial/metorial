import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageStringsTool = SlateTool.create(spec, {
  name: 'Manage Source Strings',
  key: 'manage_strings',
  description: `List, add, update, or delete source strings in a Crowdin project. Strings are the translatable text units. Use the filter or CroQL query to search for specific strings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      action: z.enum(['list', 'get', 'add', 'update', 'delete']).describe('Action to perform'),
      stringId: z.number().optional().describe('String ID (required for get/update/delete)'),
      text: z.string().optional().describe('String text (required for add)'),
      identifier: z.string().optional().describe('String key/identifier (required for add)'),
      fileId: z
        .number()
        .optional()
        .describe(
          'File ID (required for add in file-based projects, used as filter for list)'
        ),
      branchId: z.number().optional().describe('Branch ID (for string-based projects)'),
      directoryId: z.number().optional().describe('Directory ID (filter for list)'),
      context: z.string().optional().describe('Context or description of the string'),
      isHidden: z
        .boolean()
        .optional()
        .describe('Whether the string is hidden from translators'),
      maxLength: z.number().optional().describe('Maximum translation length'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to assign'),
      filter: z.string().optional().describe('Filter strings by text (for list)'),
      croql: z.string().optional().describe('CroQL query for advanced filtering (for list)'),
      limit: z.number().optional().describe('Maximum number of results (for list)'),
      offset: z.number().optional().describe('Number of results to skip (for list)')
    })
  )
  .output(
    z.object({
      strings: z
        .array(
          z.object({
            stringId: z.number().describe('String ID'),
            text: z.string().describe('String text'),
            identifier: z.string().describe('String key/identifier'),
            fileId: z.number().optional().describe('File ID'),
            context: z.string().optional().describe('String context'),
            isHidden: z.boolean().optional(),
            maxLength: z.number().optional(),
            revision: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      pagination: z
        .object({
          offset: z.number(),
          limit: z.number()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, projectId } = ctx.input;

    if (action === 'list') {
      let result = await client.listStrings(projectId, {
        fileId: ctx.input.fileId,
        branchId: ctx.input.branchId,
        directoryId: ctx.input.directoryId,
        filter: ctx.input.filter,
        croql: ctx.input.croql,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let strings = result.data.map((item: any) => ({
        stringId: item.data.id,
        text: item.data.text,
        identifier: item.data.identifier,
        fileId: item.data.fileId || undefined,
        context: item.data.context || undefined,
        isHidden: item.data.isHidden,
        maxLength: item.data.maxLength || undefined,
        revision: item.data.revision,
        createdAt: item.data.createdAt
      }));

      return {
        output: { strings, pagination: result.pagination },
        message: `Found **${strings.length}** source strings.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.stringId) throw new Error('stringId is required for get');

      let str = await client.getString(projectId, ctx.input.stringId);

      return {
        output: {
          strings: [
            {
              stringId: str.id,
              text: str.text,
              identifier: str.identifier,
              fileId: str.fileId || undefined,
              context: str.context || undefined,
              isHidden: str.isHidden,
              maxLength: str.maxLength || undefined,
              revision: str.revision,
              createdAt: str.createdAt
            }
          ]
        },
        message: `Retrieved string **${str.identifier}** (ID: ${str.id}).`
      };
    }

    if (action === 'add') {
      if (!ctx.input.text || !ctx.input.identifier) {
        throw new Error('text and identifier are required for add');
      }

      let str = await client.addString(projectId, {
        text: ctx.input.text,
        identifier: ctx.input.identifier,
        fileId: ctx.input.fileId,
        branchId: ctx.input.branchId,
        context: ctx.input.context,
        isHidden: ctx.input.isHidden,
        maxLength: ctx.input.maxLength,
        labelIds: ctx.input.labelIds
      });

      return {
        output: {
          strings: [
            {
              stringId: str.id,
              text: str.text,
              identifier: str.identifier,
              fileId: str.fileId || undefined,
              context: str.context || undefined,
              isHidden: str.isHidden,
              maxLength: str.maxLength || undefined,
              revision: str.revision,
              createdAt: str.createdAt
            }
          ]
        },
        message: `Added string **${str.identifier}** (ID: ${str.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.stringId) throw new Error('stringId is required for update');

      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.text !== undefined)
        patches.push({ op: 'replace', path: '/text', value: ctx.input.text });
      if (ctx.input.context !== undefined)
        patches.push({ op: 'replace', path: '/context', value: ctx.input.context });
      if (ctx.input.isHidden !== undefined)
        patches.push({ op: 'replace', path: '/isHidden', value: ctx.input.isHidden });
      if (ctx.input.maxLength !== undefined)
        patches.push({ op: 'replace', path: '/maxLength', value: ctx.input.maxLength });
      if (ctx.input.labelIds !== undefined)
        patches.push({ op: 'replace', path: '/labelIds', value: ctx.input.labelIds });

      let str = await client.updateString(projectId, ctx.input.stringId, patches);

      return {
        output: {
          strings: [
            {
              stringId: str.id,
              text: str.text,
              identifier: str.identifier,
              fileId: str.fileId || undefined,
              context: str.context || undefined,
              isHidden: str.isHidden,
              maxLength: str.maxLength || undefined,
              revision: str.revision,
              createdAt: str.createdAt
            }
          ]
        },
        message: `Updated string **${str.identifier}** (ID: ${str.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.stringId) throw new Error('stringId is required for delete');

      await client.deleteString(projectId, ctx.input.stringId);

      return {
        output: { deleted: true },
        message: `Deleted string with ID **${ctx.input.stringId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
