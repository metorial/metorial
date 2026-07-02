import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let triggerSynthetics = SlateTool.create(spec, {
  name: 'Trigger Synthetics Tests',
  key: 'trigger_synthetics',
  description: `Trigger one or more Datadog Synthetics tests on demand. Useful for running tests as part of CI/CD or verifying service health.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      testIds: z.array(z.string()).describe('Public IDs of the Synthetics tests to trigger')
    })
  )
  .output(
    z.object({
      triggeredTests: z
        .array(
          z.object({
            publicId: z.string().optional(),
            resultId: z.string().optional()
          })
        )
        .describe('Triggered test details with result IDs for tracking'),
      triggeredCheckIds: z
        .array(z.string())
        .optional()
        .describe('Check IDs of triggered tests')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let tests = ctx.input.testIds.map(id => ({ public_id: id }));
    let result = await client.triggerSyntheticsTests(tests);

    let triggered = (result.results || []).map((r: any) => ({
      publicId: r.public_id,
      resultId: r.result_id
    }));

    return {
      output: {
        triggeredTests: triggered,
        triggeredCheckIds: result.triggered_check_ids
      },
      message: `Triggered **${ctx.input.testIds.length}** Synthetics tests`
    };
  })
  .build();
