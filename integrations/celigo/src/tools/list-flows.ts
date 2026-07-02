import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFlows = SlateTool.create(spec, {
  name: 'List Flows',
  key: 'list_flows',
  description: `Retrieve all integration flows in your Celigo account. Flows compose exports and imports to move data between applications.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      flows: z
        .array(
          z.object({
            flowId: z.string().describe('Unique flow identifier'),
            name: z.string().optional().describe('Flow name'),
            disabled: z.boolean().optional().describe('Whether the flow is disabled'),
            integrationId: z.string().optional().describe('Parent integration ID'),
            lastModified: z.string().optional().describe('Last modification timestamp'),
            schedule: z.string().optional().describe('Cron schedule expression, if scheduled')
          })
        )
        .describe('List of flows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let flows = await client.listFlows();

    let mapped = flows.map((f: any) => ({
      flowId: f._id,
      name: f.name,
      disabled: f.disabled,
      integrationId: f._integrationId,
      lastModified: f.lastModified,
      schedule: f.schedule
    }));

    return {
      output: { flows: mapped },
      message: `Found **${mapped.length}** flow(s).`
    };
  })
  .build();
