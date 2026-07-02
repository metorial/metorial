import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAgent = SlateTool.create(spec, {
  name: 'Manage Agent',
  key: 'manage_agent',
  description: `List uploaded agent resources, pause, or resume a running AI agent within an active browser session.`
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the active session'),
      action: z.enum(['list_files', 'pause', 'resume']).describe('Agent operation to perform')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            name: z.string(),
            size: z.number(),
            fileType: z.string(),
            lastModified: z.string()
          })
        )
        .optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list_files') {
      let result = await client.listAgentFiles(input.sessionId);
      return {
        output: {
          files: (result.files ?? []).map(f => ({
            name: f.name,
            size: f.size,
            fileType: f.type,
            lastModified: f.lastModified
          }))
        },
        message: `Found **${(result.files ?? []).length}** agent files in session **${input.sessionId}**.`
      };
    }

    if (input.action === 'pause') {
      await client.pauseAgent(input.sessionId);
      return {
        output: { success: true },
        message: `Agent paused in session **${input.sessionId}**.`
      };
    }

    if (input.action === 'resume') {
      await client.resumeAgent(input.sessionId);
      return {
        output: { success: true },
        message: `Agent resumed in session **${input.sessionId}**.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
