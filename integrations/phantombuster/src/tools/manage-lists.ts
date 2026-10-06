import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, identifier, matchingId, type Row } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lead Lists',
  key: 'manage_lists',
  tags: { readOnly: false, destructive: true },
  description: `Manage lead lists in the LinkedIn Leads database. Fetch all lists, get a specific list, create/update a list, or delete a list.
- **fetchAll**: Get all lists in the workspace.
- **fetch**: Get a specific list by ID.
- **save**: Create or update a list.
- **delete**: Delete a list by ID.`
})
  .input(
    z.object({
      action: z
        .enum(['fetchAll', 'fetch', 'save', 'delete'])
        .describe('Action to perform on lists'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list (required for "fetch", "save" with update, and "delete")'),
      name: z.string().optional().describe('Name for the list (used with "save" action)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Dynamic lead-list filter, required for creation; existing listMetadata.filter remains supported.'
        ),
      listMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata for the list (used with "save" action)')
    })
  )
  .output(
    z.object({
      lists: z.array(z.record(z.string(), z.any())).optional().describe('Retrieved lists'),
      list: z.record(z.string(), z.any()).optional().describe('Single list details'),
      deleted: z.boolean().optional().describe('Whether the delete was successful'),
      actionPerformed: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'fetchAll') {
      const lists = await client.fetchAllLists();
      return {
        output: { lists, actionPerformed: 'fetchAll' },
        message: `Found **${lists.length}** lead lists.`
      };
    }
    if (ctx.input.action === 'fetch' || ctx.input.action === 'delete') {
      if (!ctx.input.listId)
        throw createApiServiceError('Provide listId for fetch or delete.');
      if (ctx.input.action === 'fetch')
        return {
          output: { list: await client.fetchList(ctx.input.listId), actionPerformed: 'fetch' },
          message: 'Retrieved the lead list.'
        };
      await client.deleteList(ctx.input.listId);
      return {
        output: { deleted: true, actionPerformed: 'delete' },
        message: 'The provider accepted the list deletion.'
      };
    }
    const body: Row = { ...ctx.input.listMetadata };
    if (ctx.input.listId !== undefined) {
      if (body.id !== undefined && body.id !== ctx.input.listId)
        throw createApiServiceError('listMetadata.id conflicts with listId.');
      body.id = identifier(ctx.input.listId, 'List ID');
    }
    if (ctx.input.name !== undefined) {
      if (body.name !== undefined && body.name !== ctx.input.name)
        throw createApiServiceError('listMetadata.name conflicts with name.');
      body.name = ctx.input.name;
    }
    if (ctx.input.filter !== undefined) {
      if (
        body.filter !== undefined &&
        JSON.stringify(body.filter) !== JSON.stringify(ctx.input.filter)
      )
        throw createApiServiceError('listMetadata.filter conflicts with filter.');
      body.filter = ctx.input.filter;
    }
    if (body.id !== undefined && (body.name === undefined || body.filter === undefined)) {
      const existing = await client.fetchList(identifier(body.id, 'List ID'));
      body.name ??= existing.name;
      body.filter ??= existing.filter;
    }
    if (typeof body.name !== 'string' || !body.name.trim() || !isApiErrorRecord(body.filter))
      throw createApiServiceError(
        'Saving a lead list requires a nonempty name and a filter object.'
      );
    const list = await client.saveList(body);
    const id = identifier(list.id, 'Saved list ID');
    if (body.id !== undefined) matchingId(id, identifier(body.id, 'List ID'), 'List ID');
    return {
      output: { list, actionPerformed: 'save' },
      message: `Saved lead list **${id}**.`
    };
  })
  .build();
