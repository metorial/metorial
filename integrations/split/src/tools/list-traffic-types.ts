import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTrafficTypes = SlateTool.create(spec, {
  name: 'List Traffic Types',
  key: 'list_traffic_types',
  description: `List all traffic types in a workspace. Traffic types define the kind of entities (e.g., "user", "account") that feature flags target. Needed when creating feature flags or segments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.')
    })
  )
  .output(
    z.object({
      trafficTypes: z.array(
        z.object({
          trafficTypeId: z.string(),
          trafficTypeName: z.string(),
          displayAttributeId: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });
    let types = await client.listTrafficTypes(wsId);

    let trafficTypes = types.map(t => ({
      trafficTypeId: t.id,
      trafficTypeName: t.name,
      displayAttributeId: t.displayAttributeId
    }));

    return {
      output: { trafficTypes },
      message: `Found **${trafficTypes.length}** traffic types.`
    };
  })
  .build();
