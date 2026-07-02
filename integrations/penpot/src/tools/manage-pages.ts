import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePagesTool = SlateTool.create(spec, {
  name: 'Manage Pages',
  key: 'manage_pages',
  description: `Add, rename, reorder, or delete pages within a design file. Pages are managed through the file update mechanism.`,
  instructions: [
    'First retrieve the file to get the current revn and vern values using the "Get File" tool.',
    'For "add", provide the file details and an optional page name.',
    'For "rename", provide pageId and the new name.',
    'For "delete", provide the pageId to remove.',
    'For "move", provide pageId and the target index position.'
  ],
  constraints: ['Requires current revn and vern values from the file to avoid conflicts.']
})
  .input(
    z.object({
      action: z
        .enum(['add', 'rename', 'delete', 'move'])
        .describe('The page operation to perform'),
      fileId: z.string().describe('ID of the file'),
      revn: z.number().describe('Current file revision number (get from Get File tool)'),
      vern: z
        .number()
        .default(0)
        .describe('Current file version number (get from Get File tool)'),
      pageId: z
        .string()
        .optional()
        .describe('ID of the page (required for "rename", "delete", "move")'),
      name: z.string().optional().describe('Page name (required for "add" and "rename")'),
      index: z.number().optional().describe('Target position index (required for "move")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      pageId: z.string().optional().describe('ID of the affected page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, fileId, revn, vern, pageId, name, index } = ctx.input;

    let sessionId = crypto.randomUUID();
    let change: any;

    switch (action) {
      case 'add': {
        let newPageId = crypto.randomUUID();
        change = { type: 'add-page', id: newPageId, name: name ?? 'New Page' };
        await client.updateFile(fileId, sessionId, revn, vern, [change]);
        return {
          output: { success: true, pageId: newPageId },
          message: `Added page **${name ?? 'New Page'}**.`
        };
      }
      case 'rename': {
        if (!pageId || !name)
          throw new Error('pageId and name are required for rename action');
        change = { type: 'mod-page', id: pageId, name };
        await client.updateFile(fileId, sessionId, revn, vern, [change]);
        return {
          output: { success: true, pageId },
          message: `Renamed page to **${name}**.`
        };
      }
      case 'delete': {
        if (!pageId) throw new Error('pageId is required for delete action');
        change = { type: 'del-page', id: pageId };
        await client.updateFile(fileId, sessionId, revn, vern, [change]);
        return {
          output: { success: true, pageId },
          message: `Deleted page \`${pageId}\`.`
        };
      }
      case 'move': {
        if (!pageId || index === undefined)
          throw new Error('pageId and index are required for move action');
        change = { type: 'mov-page', id: pageId, index };
        await client.updateFile(fileId, sessionId, revn, vern, [change]);
        return {
          output: { success: true, pageId },
          message: `Moved page to index **${index}**.`
        };
      }
    }
  })
  .build();
