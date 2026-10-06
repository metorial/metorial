import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runSimulation = SlateTool.create(spec, {
  name: 'Run Simulation',
  key: 'run_simulation',
  description: `List simulation suites, execute a suite to test an agent before going live, or retrieve a simulation session's results. Simulations run rehearsal calls using predefined test cases.`,
  instructions: [
    'Use operation "list" to browse available simulation suites.',
    'Use operation "execute" to run a simulation suite against a target agent.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['list', 'execute', 'get_session']).describe('Operation to perform'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID from execute; required for get_session'),
      suiteId: z.string().optional().describe('Simulation suite ID (required for execute)'),
      targetAgentId: z
        .string()
        .optional()
        .describe(
          'Agent model ID to test against (required for execute, must match suite agent)'
        ),
      maxTurns: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum simulation turns per test case (default: 20)'),
      pageNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number for listing suites (default: 1)'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Items per page for listing suites (default: 10)'),
      search: z.string().optional().describe('Search term to filter suite names'),
      agentIds: z
        .array(z.string())
        .optional()
        .describe('Filter suite list by agent IDs from list_agents'),
      startDate: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Filter suite creation after this ISO datetime'),
      endDate: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Filter suite creation before this ISO datetime')
    })
  )
  .output(
    z.object({
      suites: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of simulation suites'),
      session: z.record(z.string(), z.any()).optional().describe('Execution session details'),
      sessionId: z.string().optional().describe('Simulation session ID'),
      pageNumber: z.number().optional(),
      pageSize: z.number().optional(),
      total: z.number().optional().describe('Total number of suites')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    if (
      ctx.input.startDate !== undefined &&
      ctx.input.endDate !== undefined &&
      Date.parse(ctx.input.startDate) > Date.parse(ctx.input.endDate)
    )
      throw createApiServiceError('startDate must be before or equal to endDate.');

    if (ctx.input.operation === 'list') {
      let result = await client.listSimulationSuites({
        page_number: ctx.input.pageNumber,
        page_size: ctx.input.pageSize,
        search: ctx.input.search,
        model_ids: ctx.input.agentIds,
        start_date: ctx.input.startDate,
        end_date: ctx.input.endDate
      });
      let response = result.response || result;
      let items = response.items || [];
      return {
        output: {
          suites: items,
          total: response.total,
          pageNumber: response.page_number,
          pageSize: response.page_size
        },
        message: `Found ${items.length} simulation suite(s)${response.total ? ` of ${response.total} total` : ''}.`
      };
    }

    if (ctx.input.operation === 'execute') {
      if (!ctx.input.suiteId)
        throw createApiServiceError('suiteId is required for execute operation');
      if (!ctx.input.targetAgentId)
        throw createApiServiceError('targetAgentId is required for execute operation');
      let result = await client.executeSimulationSuite(ctx.input.suiteId, {
        target_agent_id: ctx.input.targetAgentId,
        max_turns: ctx.input.maxTurns
      });
      if (!result.session_id)
        throw createApiServiceError(
          'Synthflow did not return the started simulation session ID.'
        );
      return {
        output: { session: result, sessionId: result.session_id },
        message: `Started simulation session \`${result.session_id}\` for suite \`${ctx.input.suiteId}\` with ${result.total_cases || 'unknown'} test case(s).`
      };
    }

    if (ctx.input.operation === 'get_session') {
      if (!ctx.input.sessionId)
        throw createApiServiceError('sessionId is required for get_session.');
      let result = await client.getSimulationSession(ctx.input.sessionId);
      if (!result.response || result.response.simulation_session_id !== ctx.input.sessionId)
        throw createApiServiceError(
          'Synthflow did not return the requested simulation session.'
        );
      return {
        output: { session: result.response, sessionId: ctx.input.sessionId },
        message: `Retrieved simulation session \`${ctx.input.sessionId}\`.`
      };
    }

    throw createApiServiceError(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
