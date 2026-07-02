import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRecording = SlateTool.create(spec, {
  name: 'Manage Recording',
  key: 'manage_recording',
  description: `List, pause, or resume session recordings. Recordings capture browser session activity for later review and debugging.`
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the session'),
      action: z.enum(['list', 'pause', 'resume']).describe('Recording action to perform')
    })
  )
  .output(
    z.object({
      recordings: z
        .array(
          z.object({
            recordingId: z.string(),
            isPrimary: z.boolean(),
            fileLink: z.string().optional(),
            suggestedFileName: z.string().optional(),
            duration: z.number().optional(),
            size: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listRecordings(input.sessionId);
      return {
        output: {
          recordings: (result.items ?? []).map(r => ({
            recordingId: r.id,
            isPrimary: r.is_primary,
            fileLink: r.file_link,
            suggestedFileName: r.suggested_file_name,
            duration: r.duration,
            size: r.size,
            createdAt: r.created_at
          }))
        },
        message: `Found **${result.count ?? 0}** recordings for session **${input.sessionId}**.`
      };
    }

    if (input.action === 'pause') {
      let result = await client.pauseRecording(input.sessionId);
      return {
        output: { status: result.status },
        message: `Recording paused for session **${input.sessionId}**.`
      };
    }

    if (input.action === 'resume') {
      let result = await client.resumeRecording(input.sessionId);
      return {
        output: { status: result.status },
        message: `Recording resumed for session **${input.sessionId}**.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
