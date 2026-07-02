import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let caseOutputSchema = z.object({
  caseId: z.string().describe('Unique ID of the case'),
  version: z.string().optional().describe('Case version (required for updates)'),
  title: z.string().describe('Title of the case'),
  description: z.string().optional().describe('Description of the case'),
  status: z.string().optional().describe('Case status (open, in-progress, closed)'),
  severity: z.string().optional().describe('Case severity'),
  tags: z.array(z.string()).optional().describe('Tags assigned to the case'),
  owner: z.string().optional().describe('Owner application'),
  totalComments: z.number().optional().describe('Total number of comments'),
  totalAlerts: z.number().optional().describe('Total number of attached alerts'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  createdBy: z.string().optional().describe('User who created the case'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  closedAt: z.string().optional().describe('Closure timestamp'),
  deleted: z.boolean().optional().describe('Whether the case was deleted')
});

let mapCase = (c: any) => ({
  caseId: c.id,
  version: c.version,
  title: c.title,
  description: c.description,
  status: c.status,
  severity: c.severity,
  tags: c.tags,
  owner: c.owner,
  totalComments: c.totalComment,
  totalAlerts: c.totalAlerts,
  createdAt: c.created_at,
  createdBy: c.created_by?.username ?? c.created_by?.full_name,
  updatedAt: c.updated_at,
  closedAt: c.closed_at
});

export let searchCases = SlateTool.create(spec, {
  name: 'Search Cases',
  key: 'search_cases',
  description: `Search and list Kibana cases for incident tracking. Cases can be associated with alerts, have comments and attachments, and can be synced with external case management systems.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter cases'),
      status: z
        .enum(['open', 'in-progress', 'closed'])
        .optional()
        .describe('Filter by case status'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Number of results per page (default 20)'),
      sortField: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching cases'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      cases: z.array(caseOutputSchema).describe('List of cases')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.findCases({
      search: ctx.input.search,
      status: ctx.input.status,
      tags: ctx.input.tags,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let cases = (result.cases ?? []).map(mapCase);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.per_page ?? 20,
        cases
      },
      message: `Found **${result.total ?? 0}** cases${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();

export let manageCase = SlateTool.create(spec, {
  name: 'Manage Case',
  key: 'manage_case',
  description: `Create, get, update, or delete a Kibana case. Cases are used for incident tracking and can be associated with alerts and synced with external case management systems.`,
  instructions: [
    'To create a case, provide title, description, and owner (e.g., "securitySolution", "observability", "cases").',
    'To update a case, provide caseId and the current version (from a previous get/search).',
    'To delete cases, provide the caseId(s) to remove.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      caseId: z
        .string()
        .optional()
        .describe('ID of the case (required for get, update, delete)'),
      version: z
        .string()
        .optional()
        .describe('Case version (required for update, retrieved from get)'),
      title: z.string().optional().describe('Title of the case (required for create)'),
      description: z
        .string()
        .optional()
        .describe('Description of the case (required for create)'),
      owner: z
        .string()
        .optional()
        .describe(
          'Owner application: "securitySolution", "observability", or "cases" (required for create)'
        ),
      status: z.enum(['open', 'in-progress', 'closed']).optional().describe('Case status'),
      severity: z
        .enum(['low', 'medium', 'high', 'critical'])
        .optional()
        .describe('Case severity'),
      tags: z.array(z.string()).optional().describe('Tags for the case'),
      includeComments: z.boolean().optional().describe('Include comments when getting a case')
    })
  )
  .output(caseOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      caseId,
      version,
      title,
      description,
      owner,
      status,
      severity,
      tags,
      includeComments
    } = ctx.input;

    if (action === 'get') {
      if (!caseId) throw new Error('caseId is required for get action');
      let c = await client.getCase(caseId, includeComments);
      return {
        output: mapCase(c),
        message: `Retrieved case \`${c.title}\`.`
      };
    }

    if (action === 'create') {
      if (!title) throw new Error('title is required for create action');
      if (!description) throw new Error('description is required for create action');
      if (!owner) throw new Error('owner is required for create action');
      let c = await client.createCase({
        title,
        description,
        owner,
        tags,
        severity
      });
      return {
        output: mapCase(c),
        message: `Created case \`${c.title}\` with ID \`${c.id}\`.`
      };
    }

    if (action === 'update') {
      if (!caseId) throw new Error('caseId is required for update action');
      if (!version) throw new Error('version is required for update action');
      let result = await client.updateCase(caseId, version, {
        title,
        description,
        tags,
        status,
        severity
      });
      let updated = Array.isArray(result) ? result[0] : result;
      return {
        output: mapCase(updated),
        message: `Updated case \`${caseId}\`.`
      };
    }

    if (action === 'delete') {
      if (!caseId) throw new Error('caseId is required for delete action');
      await client.deleteCases([caseId]);
      return {
        output: {
          caseId,
          title: '',
          deleted: true
        },
        message: `Deleted case \`${caseId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

export let addCaseComment = SlateTool.create(spec, {
  name: 'Add Case Comment',
  key: 'add_case_comment',
  description: `Add a comment or alert attachment to an existing Kibana case.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      caseId: z.string().describe('ID of the case to comment on'),
      owner: z
        .string()
        .describe('Owner application: "securitySolution", "observability", or "cases"'),
      comment: z.string().optional().describe('Comment text (for user comments)'),
      alertId: z.string().optional().describe('Alert ID to attach (for alert comments)'),
      alertIndex: z
        .string()
        .optional()
        .describe('Alert index name (required when attaching an alert)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      caseId: z.string().describe('ID of the case'),
      type: z.string().describe('Type of the comment (user or alert)'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { caseId, owner, comment, alertId, alertIndex } = ctx.input;

    let type = alertId ? 'alert' : 'user';

    let result = await client.addCaseComment(caseId, {
      type,
      comment: type === 'user' ? comment : undefined,
      alertId: type === 'alert' ? alertId : undefined,
      index: type === 'alert' ? alertIndex : undefined,
      owner
    });

    return {
      output: {
        commentId: result.id,
        caseId,
        type,
        createdAt: result.created_at
      },
      message: `Added ${type} comment to case \`${caseId}\`.`
    };
  })
  .build();
