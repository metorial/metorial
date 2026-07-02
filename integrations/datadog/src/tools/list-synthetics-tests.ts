import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSyntheticsTests = SlateTool.create(spec, {
  name: 'List Synthetics Tests',
  key: 'list_synthetics_tests',
  description: `List all Datadog Synthetics tests. Returns test configurations, statuses, and associated metadata for API and browser tests.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tests: z
        .array(
          z.object({
            publicId: z.string(),
            name: z.string().optional(),
            type: z.string().optional(),
            status: z.string().optional(),
            tags: z.array(z.string()).optional(),
            monitorId: z.number().optional(),
            locations: z.array(z.string()).optional(),
            createdAt: z.string().optional(),
            modifiedAt: z.string().optional()
          })
        )
        .describe('List of Synthetics tests')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listSyntheticsTests();

    let tests = (result.tests || []).map((t: any) => ({
      publicId: t.public_id,
      name: t.name,
      type: t.type,
      status: t.status,
      tags: t.tags,
      monitorId: t.monitor_id,
      locations: t.locations,
      createdAt: t.created_at,
      modifiedAt: t.modified_at
    }));

    return {
      output: { tests },
      message: `Found **${tests.length}** Synthetics tests`
    };
  })
  .build();
