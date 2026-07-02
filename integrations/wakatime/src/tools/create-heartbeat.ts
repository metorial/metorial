import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let heartbeatInputSchema = z.object({
  entity: z.string().describe('File path, app name, or domain being tracked'),
  type: z.enum(['file', 'app', 'domain']).describe('Type of entity'),
  time: z.number().describe('UNIX epoch timestamp of the heartbeat'),
  project: z.string().optional().describe('Project name'),
  branch: z.string().optional().describe('Git branch name'),
  language: z.string().optional().describe('Programming language'),
  dependencies: z.array(z.string()).optional().describe('List of dependencies'),
  lines: z.number().optional().describe('Total lines in the file'),
  lineNo: z.number().optional().describe('Current line number'),
  cursorPos: z.number().optional().describe('Current cursor position'),
  isWrite: z.boolean().optional().describe('Whether this is a write event'),
  category: z
    .string()
    .optional()
    .describe('Activity category (e.g., coding, debugging, browsing)')
});

export let createHeartbeat = SlateTool.create(spec, {
  name: 'Create Heartbeat',
  key: 'create_heartbeat',
  description: `Record one or more coding activity events (heartbeats). Supports both single and bulk creation. Each heartbeat captures what file/app is being worked on, when, and in what context (project, branch, language).`,
  constraints: ['Bulk creation supports up to 25 heartbeats per request.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      heartbeats: z
        .array(heartbeatInputSchema)
        .min(1)
        .describe('One or more heartbeats to create')
    })
  )
  .output(
    z.object({
      createdCount: z.number().describe('Number of heartbeats successfully created'),
      responses: z.array(z.any()).describe('API responses for each heartbeat')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let responses: any[];
    if (ctx.input.heartbeats.length === 1) {
      let result = await client.createHeartbeat(ctx.input.heartbeats[0]!);
      responses = [result];
    } else {
      let result = await client.createHeartbeatsBulk(ctx.input.heartbeats);
      responses = Array.isArray(result.responses) ? result.responses : [result];
    }

    return {
      output: {
        createdCount: ctx.input.heartbeats.length,
        responses
      },
      message: `Created **${ctx.input.heartbeats.length}** heartbeat(s).`
    };
  })
  .build();
