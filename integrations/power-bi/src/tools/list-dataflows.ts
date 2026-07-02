import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let dataflowSchema = z.object({
  dataflowId: z.string().describe('Unique identifier of the dataflow'),
  name: z.string().describe('Display name of the dataflow'),
  description: z.string().optional().describe('Dataflow description'),
  configuredBy: z.string().optional().describe('User who configured the dataflow'),
  modifiedBy: z.string().optional().describe('User who last modified the dataflow'),
  modifiedDateTime: z.string().optional().describe('Last modification timestamp')
});

export let listDataflows = SlateTool.create(spec, {
  name: 'List Dataflows',
  key: 'list_dataflows',
  description: `List all Power BI dataflows in a workspace. Returns dataflow names, IDs, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace ID to list dataflows from')
    })
  )
  .output(
    z.object({
      dataflows: z.array(dataflowSchema).describe('List of dataflows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let dataflows = await client.listDataflows(ctx.input.workspaceId);

    let mapped = dataflows.map((d: any) => ({
      dataflowId: d.objectId,
      name: d.name,
      description: d.description,
      configuredBy: d.configuredBy,
      modifiedBy: d.modifiedBy,
      modifiedDateTime: d.modifiedDateTime
    }));

    return {
      output: { dataflows: mapped },
      message: `Found **${mapped.length}** dataflow(s).`
    };
  })
  .build();
