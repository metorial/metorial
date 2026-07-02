import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopTimer = SlateTool.create(spec, {
  name: 'Stop Timer',
  key: 'stop_timer',
  description: `Stop the currently running timer for a user. If no userId is provided, stops the timer for the authenticated user. Optionally specify a custom end time.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID whose timer to stop. Defaults to the authenticated user.'),
      end: z
        .string()
        .optional()
        .describe('End time in ISO 8601 format. Defaults to the current time.')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('ID of the stopped time entry'),
      description: z.string().optional(),
      start: z.string(),
      end: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let userId = ctx.input.userId;
    if (!userId) {
      let user = await client.getCurrentUser();
      userId = user.id;
    }

    let endTime = ctx.input.end || new Date().toISOString();
    let entry = await client.stopTimer(userId as string, { end: endTime });

    return {
      output: {
        timeEntryId: entry.id,
        description: entry.description || undefined,
        start: entry.timeInterval?.start,
        end: entry.timeInterval?.end
      },
      message: `Stopped timer for entry **${entry.id}**.`
    };
  })
  .build();
