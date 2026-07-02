import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let commandRunHistory = SlateTool.create(spec, {
  name: 'Command Run History',
  key: 'command_run_history',
  description: `Retrieve the execution history for a specific command. Returns timestamps and status messages for each run, sorted by most recent first. Use the "List Commands" tool first to find the command ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      commandId: z.string().describe('ID of the command to retrieve run history for')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Unique identifier of the run record'),
            status: z
              .string()
              .describe(
                'Status message of the run (e.g. "Command ran", "Trigger sent from website")'
              ),
            createdAt: z.string().describe('Timestamp of when the run occurred')
          })
        )
        .describe('List of run history records, sorted by most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data = await client.listRuns(ctx.input.commandId);

    let runs = (data.records || []).map(r => ({
      runId: r._id,
      status: r.status,
      createdAt: r.createdAt
    }));

    return {
      output: {
        runs
      },
      message: `Found **${runs.length}** run record(s) for command ${ctx.input.commandId}.`
    };
  })
  .build();
