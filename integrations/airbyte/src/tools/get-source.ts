import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSourceTool = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description: `Retrieve detailed information about a specific Airbyte source connector, including its name, type, workspace, and full configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('The UUID of the source to retrieve.')
    })
  )
  .output(
    z.object({
      sourceId: z.string(),
      name: z.string(),
      sourceType: z.string(),
      workspaceId: z.string(),
      configuration: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let source = await client.getSource(ctx.input.sourceId);

    return {
      output: {
        sourceId: source.sourceId,
        name: source.name,
        sourceType: source.sourceType,
        workspaceId: source.workspaceId,
        configuration: source.configuration
      },
      message: `Retrieved source **${source.name}** (type: ${source.sourceType}).`
    };
  })
  .build();
