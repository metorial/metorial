import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkItemTool = SlateTool.create(spec, {
  name: 'Get Work Item',
  key: 'get_work_item',
  description: `Retrieve one or more work items by ID. Returns all fields including title, state, assigned to, area path, iteration path, and custom fields. Supports fetching multiple work items in a single request.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      workItemIds: z
        .array(z.number())
        .min(1)
        .describe('One or more work item IDs to retrieve'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific field reference names to return (e.g. ["System.Title", "System.State"]). Returns all fields if omitted.'
        )
    })
  )
  .output(
    z.object({
      workItems: z.array(
        z.object({
          workItemId: z.number(),
          rev: z.number().optional(),
          workItemType: z.string().optional(),
          title: z.string().optional(),
          state: z.string().optional(),
          assignedTo: z.string().optional(),
          areaPath: z.string().optional(),
          iterationPath: z.string().optional(),
          fields: z.record(z.string(), z.any()).optional(),
          url: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project)
      throw new Error(
        'Project is required. Provide it in the input or set a default project in config.'
      );

    let workItems: any[];
    if (ctx.input.workItemIds.length === 1) {
      let wi = await client.getWorkItem(project, ctx.input.workItemIds[0]!, {
        fields: ctx.input.fields,
        expand: 'all'
      });
      workItems = [wi];
    } else {
      let result = await client.getWorkItemsBatch(
        project,
        ctx.input.workItemIds,
        ctx.input.fields
      );
      workItems = result.value || [];
    }

    let mapped = workItems.map((wi: any) => ({
      workItemId: wi.id,
      rev: wi.rev,
      workItemType: wi.fields?.['System.WorkItemType'],
      title: wi.fields?.['System.Title'],
      state: wi.fields?.['System.State'],
      assignedTo:
        wi.fields?.['System.AssignedTo']?.displayName || wi.fields?.['System.AssignedTo'],
      areaPath: wi.fields?.['System.AreaPath'],
      iterationPath: wi.fields?.['System.IterationPath'],
      fields: wi.fields,
      url: wi.url
    }));

    return {
      output: { workItems: mapped },
      message: `Retrieved **${mapped.length}** work item(s).`
    };
  })
  .build();
