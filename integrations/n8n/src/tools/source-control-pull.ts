import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let sourceControlPull = SlateTool.create(spec, {
  name: 'Source Control Pull',
  key: 'source_control_pull',
  description: `Pull workflow changes from a connected Git repository into your n8n instance. Requires the Source Control feature to be licensed and configured.`,
  constraints: [
    'Requires Source Control feature to be licensed and configured on the n8n instance.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      force: z.boolean().optional().describe('Force pull, overwriting local changes'),
      autoPublish: z
        .enum(['none', 'all', 'published'])
        .optional()
        .describe(
          'Auto-publish setting: none (do not publish), all (publish all pulled workflows), or published (only publish previously published workflows)'
        ),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Legacy compatibility field. The verified Public API does not support overrides here; use manage_variables separately. A supplied value is refused before any pull.'
        )
    })
  )
  .output(
    z.object({
      pullResult: z
        .any()
        .describe(
          'Import result including affected workflows, credentials, tags, and variables'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let result = await client.sourceControlPull({
      force: ctx.input.force,
      autoPublish: ctx.input.autoPublish,
      variables: ctx.input.variables as Record<string, string> | undefined
    });

    return {
      output: {
        pullResult: result
      },
      message: `Source-control pull returned its native per-resource results. Inspect conflicts and publishing errors; partial imports or retained external effects may remain.`
    };
  })
  .build();
