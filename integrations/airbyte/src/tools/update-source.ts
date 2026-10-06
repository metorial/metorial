import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateSourceTool = SlateTool.create(spec, {
  name: 'Update Source',
  key: 'update_source',
  tags: { destructive: true },
  description: `Update an existing Airbyte source connector. Modify the source name and/or its configuration. Only provided fields will be updated.`
})
  .input(
    z.object({
      sourceId: z.string().describe('The UUID of the source to update.'),
      name: z.string().optional().describe('New display name for the source.'),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated source-specific configuration.')
    })
  )
  .output(
    z.object({
      sourceId: z.string(),
      name: z.string(),
      sourceType: z.string(),
      workspaceId: z.string(),
      configuration: z
        .record(z.string(), z.unknown())
        .describe(
          'Configuration keys with all values redacted. Never reuse these values as connector input.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.configuration !== undefined)
      updateData.configuration = ctx.input.configuration;

    let source = await client.updateSource(ctx.input.sourceId, updateData);

    return {
      output: {
        sourceId: source.sourceId,
        name: source.name,
        sourceType: source.sourceType,
        workspaceId: source.workspaceId,
        configuration: source.configuration
      },
      message: `Updated source **${source.name}** (ID: ${source.sourceId}).`
    };
  })
  .build();
