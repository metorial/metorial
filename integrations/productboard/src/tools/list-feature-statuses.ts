import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFeatureStatusesTool = SlateTool.create(spec, {
  name: 'List Feature Statuses',
  key: 'list_feature_statuses',
  description: `List all available feature statuses in the workspace. Use these status IDs when creating or updating features.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      statuses: z
        .array(z.record(z.string(), z.any()))
        .describe('List of feature statuses with IDs and names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let statuses = await client.listFeatureStatuses();

    return {
      output: { statuses },
      message: `Retrieved ${statuses.length} feature status(es).`
    };
  })
  .build();
