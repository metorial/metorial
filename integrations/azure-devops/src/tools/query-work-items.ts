import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let queryWorkItemsTool = SlateTool.create(spec, {
  name: 'Query Work Items',
  key: 'query_work_items',
  description: `Search for work items using WIQL (Work Item Query Language) or simple filters. Runs a WIQL query and returns matching work items with their details.
Use WIQL for complex queries, or provide simple filters (type, state, assignedTo, areaPath) to auto-generate a query.`,
  instructions: [
    'When using WIQL, always SELECT at least [System.Id]. Common fields: [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType], [System.Tags].',
    'Use `@me` to reference the current user and `@today` for the current date in WIQL.'
  ],
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
      wiql: z
        .string()
        .optional()
        .describe('Full WIQL query string. If provided, all filter params are ignored.'),
      workItemType: z
        .string()
        .optional()
        .describe('Filter by work item type (e.g. "Bug", "Task", "User Story")'),
      state: z
        .string()
        .optional()
        .describe('Filter by state (e.g. "Active", "New", "Closed")'),
      assignedTo: z
        .string()
        .optional()
        .describe('Filter by assigned user. Use "@me" for current user.'),
      areaPath: z.string().optional().describe('Filter by area path'),
      tags: z.string().optional().describe('Filter by tag'),
      top: z.number().optional().describe('Maximum number of results (default 50)')
    })
  )
  .output(
    z.object({
      workItems: z.array(
        z.object({
          workItemId: z.number(),
          workItemType: z.string().optional(),
          title: z.string().optional(),
          state: z.string().optional(),
          assignedTo: z.string().optional(),
          areaPath: z.string().optional(),
          tags: z.string().optional(),
          createdDate: z.string().optional(),
          changedDate: z.string().optional()
        })
      ),
      totalCount: z.number()
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

    let wiql = ctx.input.wiql;
    if (!wiql) {
      let conditions: string[] = [];
      if (ctx.input.workItemType)
        conditions.push(`[System.WorkItemType] = '${ctx.input.workItemType}'`);
      if (ctx.input.state) conditions.push(`[System.State] = '${ctx.input.state}'`);
      if (ctx.input.assignedTo)
        conditions.push(`[System.AssignedTo] = '${ctx.input.assignedTo}'`);
      if (ctx.input.areaPath)
        conditions.push(`[System.AreaPath] UNDER '${ctx.input.areaPath}'`);
      if (ctx.input.tags) conditions.push(`[System.Tags] CONTAINS '${ctx.input.tags}'`);

      let whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
      wiql = `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType], [System.Tags], [System.CreatedDate], [System.ChangedDate], [System.AreaPath] FROM WorkItems${whereClause} ORDER BY [System.ChangedDate] DESC`;
    }

    let queryResult = await client.queryWorkItems(project, wiql, ctx.input.top || 50);
    let workItemRefs: Array<{ id: number }> = queryResult.workItems || [];

    if (workItemRefs.length === 0) {
      return {
        output: { workItems: [], totalCount: 0 },
        message: 'No work items matched the query.'
      };
    }

    let ids = workItemRefs.map(wi => wi.id);
    let batchResult = await client.getWorkItemsBatch(project, ids, [
      'System.Id',
      'System.Title',
      'System.State',
      'System.AssignedTo',
      'System.WorkItemType',
      'System.Tags',
      'System.CreatedDate',
      'System.ChangedDate',
      'System.AreaPath'
    ]);

    let workItems = ((batchResult.value || []) as any[]).map((wi: any) => ({
      workItemId: wi.id,
      workItemType: wi.fields?.['System.WorkItemType'],
      title: wi.fields?.['System.Title'],
      state: wi.fields?.['System.State'],
      assignedTo:
        wi.fields?.['System.AssignedTo']?.displayName || wi.fields?.['System.AssignedTo'],
      areaPath: wi.fields?.['System.AreaPath'],
      tags: wi.fields?.['System.Tags'],
      createdDate: wi.fields?.['System.CreatedDate'],
      changedDate: wi.fields?.['System.ChangedDate']
    }));

    return {
      output: { workItems, totalCount: workItems.length },
      message: `Found **${workItems.length}** work items matching the query.`
    };
  })
  .build();
