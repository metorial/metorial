import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let manageSessions = SlateTool.create(spec, {
  name: 'Manage Workbook Sessions',
  key: 'manage_sessions',
  description: `Create, refresh, or close workbook sessions for efficient multi-step interactions with an Excel workbook. Persistent sessions save changes to the file; non-persistent sessions discard changes on close, useful for read-only analysis or calculations.`,
  instructions: [
    'Create a session before performing multiple operations on the same workbook for better performance.',
    'Pass the returned sessionId to other tools via their sessionId parameter.',
    'Refresh a session periodically to keep it alive during long-running operations.',
    'Close the session when done to release server resources.'
  ],
  constraints: [
    'Sessions expire after a period of inactivity (typically 5 minutes).',
    'Non-persistent sessions do not save any changes back to the workbook file.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      action: z.enum(['create', 'refresh', 'close']).describe('Operation to perform'),
      persistChanges: z
        .boolean()
        .optional()
        .describe('Whether changes should be saved to the file (for create, default: true)'),
      sessionId: z.string().optional().describe('Session ID (required for refresh and close)')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('The workbook session ID (for create)'),
      persistChanges: z.boolean().optional().describe('Whether the session persists changes'),
      refreshed: z.boolean().optional().describe('Whether the session was refreshed'),
      closed: z.boolean().optional().describe('Whether the session was closed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    switch (ctx.input.action) {
      case 'create': {
        let persist = ctx.input.persistChanges !== false;
        let session = await client.createSession(ctx.input.workbookItemId, persist);
        return {
          output: { sessionId: session.id, persistChanges: persist },
          message: `Created ${persist ? 'persistent' : 'non-persistent'} session \`${session.id}\`.`
        };
      }
      case 'refresh': {
        if (!ctx.input.sessionId) throw new Error('sessionId is required for refresh action');
        await client.refreshSession(ctx.input.workbookItemId, ctx.input.sessionId);
        return {
          output: { refreshed: true },
          message: `Refreshed session \`${ctx.input.sessionId}\`.`
        };
      }
      case 'close': {
        if (!ctx.input.sessionId) throw new Error('sessionId is required for close action');
        await client.closeSession(ctx.input.workbookItemId, ctx.input.sessionId);
        return {
          output: { closed: true },
          message: `Closed session \`${ctx.input.sessionId}\`.`
        };
      }
    }
  })
  .build();
