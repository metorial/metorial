import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { execution } from '../lib/responses';
import { spec } from '../spec';

export let listExecutions = SlateTool.create(spec, {
  name: 'List Executions',
  key: 'list_executions',
  description: `List execution history (containers) for a specific Phantom. Returns status, timing, and exit information for each run. Useful for monitoring and debugging Phantom performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom to list executions for'),
      limit: z.number().optional().describe('Maximum number of executions to return'),
      beforeEndedAt: z
        .string()
        .optional()
        .describe(
          'Provider end-date boundary for an older history page. Keep the same Phantom and mode for subsequent pages.'
        ),
      mode: z
        .enum(['all', 'finalized'])
        .optional()
        .describe('Include all executions or only finalized executions.')
    })
  )
  .output(
    z.object({
      executions: z
        .array(
          z.object({
            containerId: z.string().describe('ID of the container'),
            status: z.string().optional().describe('Status of the execution'),
            exitCode: z.number().optional().describe('Exit code'),
            exitMessage: z.string().optional().describe('Exit message'),
            launchTimestamp: z
              .number()
              .optional()
              .describe('Timestamp when the container was launched'),
            endTimestamp: z.number().optional().describe('Timestamp when the container ended'),
            launchType: z.string().optional().describe('How the execution was triggered')
          })
        )
        .describe('List of executions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let containers = await client.fetchAllContainers(
      ctx.input.phantomId,
      ctx.input.limit,
      ctx.input.beforeEndedAt,
      ctx.input.mode
    );

    let executions = containers.map(execution);

    return {
      output: { executions },
      message: `Found **${executions.length}** execution(s) for Phantom **${ctx.input.phantomId}**.`
    };
  })
  .build();
