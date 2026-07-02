import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runSimulation = SlateTool.create(spec, {
  name: 'Run Simulation',
  key: 'run_simulation',
  description: `List simulation suites or execute a simulation suite to test an agent before going live. Simulations run rehearsal calls using predefined test cases.`,
  instructions: [
    'Use operation "list" to browse available simulation suites.',
    'Use operation "execute" to run a simulation suite against a target agent.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['list', 'execute']).describe('Operation to perform'),
      suiteId: z.string().optional().describe('Simulation suite ID (required for execute)'),
      targetAgentId: z
        .string()
        .optional()
        .describe(
          'Agent model ID to test against (required for execute, must match suite agent)'
        ),
      maxTurns: z
        .number()
        .optional()
        .describe('Maximum simulation turns per test case (default: 20)'),
      pageNumber: z
        .number()
        .optional()
        .describe('Page number for listing suites (default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Items per page for listing suites (default: 10)'),
      search: z.string().optional().describe('Search term to filter suite names')
    })
  )
  .output(
    z.object({
      suites: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of simulation suites'),
      session: z.record(z.string(), z.any()).optional().describe('Execution session details'),
      total: z.number().optional().describe('Total number of suites')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.operation === 'list') {
      let result = await client.listSimulationSuites({
        page_number: ctx.input.pageNumber,
        page_size: ctx.input.pageSize,
        search: ctx.input.search
      });
      let response = result.response || result;
      let items = response.items || [];
      return {
        output: {
          suites: items,
          total: response.total
        },
        message: `Found ${items.length} simulation suite(s)${response.total ? ` of ${response.total} total` : ''}.`
      };
    }

    if (ctx.input.operation === 'execute') {
      if (!ctx.input.suiteId) throw new Error('suiteId is required for execute operation');
      if (!ctx.input.targetAgentId)
        throw new Error('targetAgentId is required for execute operation');
      let result = await client.executeSimulationSuite(ctx.input.suiteId, {
        target_agent_id: ctx.input.targetAgentId,
        max_turns: ctx.input.maxTurns
      });
      return {
        output: { session: result },
        message: `Started simulation session \`${result.session_id}\` for suite \`${ctx.input.suiteId}\` with ${result.total_cases || 'unknown'} test case(s).`
      };
    }

    throw new Error(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
