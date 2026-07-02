import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let testActionStep = SlateTool.create(spec, {
  name: 'Test Action Step',
  key: 'test_action_step',
  description: `Test a configured Zapier action step with the provided authentication and inputs. Zapier executes the action against the target app and returns the third-party result payload.`,
  instructions: [
    'Use this after resolving required fields and before creating a Zap.',
    'This may execute the selected third-party action, so prefer harmless test inputs or clean up any created resources.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID from the /v2/actions endpoint'),
      authenticationId: z
        .string()
        .nullable()
        .describe('Authentication ID to use for testing the action'),
      inputs: z.record(z.string(), z.any()).describe('Input values to test with the action'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of test results to return when supported'),
      offset: z.number().optional().describe('Pagination offset when supported')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Result data returned by the tested action'),
      totalCount: z.number().describe('Total number of results returned by Zapier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.testStep(ctx.input.actionId, {
      authentication: ctx.input.authenticationId,
      inputs: ctx.input.inputs,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let results = Array.isArray(response?.data) ? response.data : [];
    let totalCount =
      typeof response?.meta?.count === 'number' ? response.meta.count : results.length;

    return {
      output: {
        results,
        totalCount
      },
      message: `Tested action \`${ctx.input.actionId}\` and received **${results.length}** result(s).`
    };
  })
  .build();
