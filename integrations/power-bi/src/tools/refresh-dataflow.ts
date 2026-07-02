import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let refreshDataflow = SlateTool.create(spec, {
  name: 'Refresh Dataflow',
  key: 'refresh_dataflow',
  description: `Trigger a refresh for a Power BI dataflow. The refresh runs asynchronously to update data preparation logic.`,
  constraints: [
    'The dataflow must exist in the specified workspace.',
    'You must have write permissions on the workspace.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace ID containing the dataflow'),
      dataflowId: z.string().describe('ID of the dataflow to refresh')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the refresh was triggered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    await client.refreshDataflow(ctx.input.workspaceId, ctx.input.dataflowId);

    return {
      output: { success: true },
      message: `Triggered refresh for dataflow **${ctx.input.dataflowId}**.`
    };
  })
  .build();
