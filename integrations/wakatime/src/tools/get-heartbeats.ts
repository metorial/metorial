import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getHeartbeats = SlateTool.create(spec, {
  name: 'Get Heartbeats',
  key: 'get_heartbeats',
  description: `Retrieve raw coding activity events (heartbeats) for a specific day. Each heartbeat records the file or app being used, timestamp, project, branch, language, and cursor position. Useful for detailed activity analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Date to retrieve heartbeats for in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      heartbeats: z
        .array(
          z
            .object({
              heartbeatId: z.string().describe('Unique ID of the heartbeat'),
              entity: z.string().describe('File path, app name, or domain'),
              type: z.string().describe('Entity type (file, app, domain)'),
              time: z.number().describe('UNIX epoch timestamp'),
              project: z.string().optional().describe('Project name'),
              branch: z.string().optional().describe('Git branch'),
              language: z.string().optional().describe('Programming language'),
              category: z.string().optional().describe('Activity category'),
              isWrite: z.boolean().optional().describe('Whether this was a write event'),
              lines: z.number().optional().describe('Total lines in the file'),
              lineNumber: z.number().optional().describe('Current line number'),
              cursorPosition: z.number().optional().describe('Current cursor position')
            })
            .passthrough()
        )
        .describe('Array of heartbeat events'),
      totalHeartbeats: z.number().describe('Total number of heartbeats returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result = await client.getHeartbeats(ctx.input.date);

    let heartbeats = (result.data || []).map((h: any) => ({
      heartbeatId: h.id ?? '',
      entity: h.entity ?? '',
      type: h.type ?? 'file',
      time: h.time ?? 0,
      project: h.project,
      branch: h.branch,
      language: h.language,
      category: h.category,
      isWrite: h.is_write,
      lines: h.lines,
      lineNumber: h.lineno,
      cursorPosition: h.cursorpos
    }));

    return {
      output: {
        heartbeats,
        totalHeartbeats: heartbeats.length
      },
      message: `Retrieved **${heartbeats.length}** heartbeats for **${ctx.input.date}**.`
    };
  })
  .build();
