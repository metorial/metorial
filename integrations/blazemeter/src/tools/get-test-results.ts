import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let getTestResults = SlateTool.create(spec, {
  name: 'Get Test Results',
  key: 'get_test_results',
  description: `Retrieve performance test run results. Get the status, summary metrics, and details of a specific master (test run). Can also list recent runs for a test to find the master ID.`,
  instructions: [
    'Provide **masterId** to get results for a specific test run.',
    'Provide **testId** with **listRecent** to get a list of recent runs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      masterId: z.number().optional().describe('Master (test run) ID for specific results'),
      testId: z.number().optional().describe('Test ID to list recent runs'),
      listRecent: z
        .boolean()
        .optional()
        .describe('If true, list recent test runs instead of getting a specific result'),
      limit: z.number().optional().describe('Maximum number of recent runs to return'),
      includeSummary: z
        .boolean()
        .optional()
        .describe('Include summary metrics (avg response time, throughput, errors)')
    })
  )
  .output(
    z.object({
      masterId: z.number().optional().describe('Master run ID'),
      status: z.string().optional().describe('Run status'),
      summary: z
        .any()
        .optional()
        .describe('Summary metrics (response times, throughput, error rate, etc.)'),
      runs: z
        .array(
          z.object({
            masterId: z.number().describe('Master run ID'),
            name: z.string().optional().describe('Test name'),
            status: z.string().optional().describe('Run status'),
            created: z.number().optional().describe('Creation timestamp'),
            ended: z.number().optional().describe('End timestamp')
          })
        )
        .optional()
        .describe('List of recent runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.listRecent && ctx.input.testId) {
      let masters = await client.listMasters(
        ctx.input.testId,
        undefined,
        ctx.input.limit || 10
      );
      let runs = masters.map((m: any) => ({
        masterId: m.id,
        name: m.name,
        status: m.status,
        created: m.created,
        ended: m.ended
      }));
      return {
        output: { runs },
        message: `Found **${runs.length}** recent run(s) for test ${ctx.input.testId}.`
      };
    }

    if (ctx.input.masterId) {
      let master = await client.getMaster(ctx.input.masterId);
      let status = await client.getMasterStatus(ctx.input.masterId);
      let summary: any;

      if (ctx.input.includeSummary) {
        try {
          summary = await client.getMasterSummary(ctx.input.masterId);
        } catch {
          // Summary may not be available if the test hasn't completed
        }
      }

      return {
        output: {
          masterId: master.id,
          status: status?.status || master.status,
          summary
        },
        message: `Master run **${master.id}** status: **${status?.status || master.status}**.`
      };
    }

    throw new Error(
      'Provide either masterId for specific results, or testId with listRecent to list runs'
    );
  })
  .build();
