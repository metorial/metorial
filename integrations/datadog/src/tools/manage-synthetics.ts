import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSynthetics = SlateTool.create(spec, {
  name: 'Get Synthetics Test',
  key: 'get_synthetics_test',
  description: `Get details and recent results of a Datadog Synthetics test by its public ID. Includes test configuration and latest results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicId: z
        .string()
        .describe('The public ID of the Synthetics test, e.g. "abc-def-ghi"'),
      includeResults: z
        .boolean()
        .optional()
        .describe('Whether to also fetch recent test results')
    })
  )
  .output(
    z.object({
      publicId: z.string().describe('Synthetics test public ID'),
      name: z.string().optional().describe('Test name'),
      type: z.string().optional().describe('Test type (api, browser, etc.)'),
      status: z.string().optional().describe('Test status (live, paused)'),
      message: z.string().optional().describe('Test notification message'),
      tags: z.array(z.string()).optional().describe('Test tags'),
      monitorId: z.number().optional().describe('Associated monitor ID'),
      locations: z.array(z.string()).optional().describe('Test locations'),
      results: z
        .array(
          z.object({
            resultId: z.string().optional(),
            status: z.number().optional(),
            checkTime: z.number().optional(),
            resultType: z.number().optional()
          })
        )
        .optional()
        .describe('Recent test results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let test = await client.getSyntheticsTest(ctx.input.publicId);

    let results: any[] | undefined;
    if (ctx.input.includeResults) {
      let resultsResponse = await client.getSyntheticsTestResults(ctx.input.publicId);
      results = (resultsResponse.results || []).map((r: any) => ({
        resultId: r.result_id,
        status: r.status,
        checkTime: r.check_time,
        resultType: r.result_type
      }));
    }

    return {
      output: {
        publicId: test.public_id || ctx.input.publicId,
        name: test.name,
        type: test.type,
        status: test.status,
        message: test.message,
        tags: test.tags,
        monitorId: test.monitor_id,
        locations: test.locations,
        results
      },
      message: `Retrieved Synthetics test **${test.name}** (${test.public_id})`
    };
  })
  .build();
