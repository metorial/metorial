import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let sloOutputSchema = z.object({
  sloId: z.string().describe('Unique ID of the SLO'),
  name: z.string().describe('Name of the SLO'),
  description: z.string().optional().describe('Description of the SLO'),
  indicator: z.record(z.string(), z.any()).optional().describe('SLO indicator configuration'),
  timeWindow: z
    .object({
      duration: z.string().describe('Time window duration (e.g., "30d")'),
      type: z.string().describe('Time window type (e.g., "rolling", "calendarAligned")')
    })
    .optional()
    .describe('Time window configuration'),
  budgetingMethod: z
    .string()
    .optional()
    .describe('Budgeting method (occurrences or timeslices)'),
  objective: z
    .object({
      target: z.number().describe('Target percentage (0.0 to 1.0)'),
      timesliceTarget: z
        .number()
        .optional()
        .describe('Timeslice target (for timeslices method)'),
      timesliceWindow: z.string().optional().describe('Timeslice window duration')
    })
    .optional()
    .describe('SLO objective'),
  tags: z.array(z.string()).optional().describe('Tags assigned to the SLO'),
  groupBy: z.string().optional().describe('Field to group the SLO by'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('Whether the SLO was deleted')
});

export let searchSLOs = SlateTool.create(spec, {
  name: 'Search SLOs',
  key: 'search_slos',
  description: `Search and list Kibana Service Level Objectives (SLOs). SLOs define reliability targets for services and can use various indicator types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      kqlQuery: z
        .string()
        .optional()
        .describe('KQL query to filter SLOs (e.g., "slo.name: my-slo")'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Number of results per page (default 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching SLOs'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      slos: z.array(sloOutputSchema).describe('List of SLOs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.findSLOs({
      kqlQuery: ctx.input.kqlQuery,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let slos = (result.results ?? []).map((s: any) => ({
      sloId: s.id,
      name: s.name,
      description: s.description,
      indicator: s.indicator,
      timeWindow: s.timeWindow ?? s.time_window,
      budgetingMethod: s.budgetingMethod ?? s.budgeting_method,
      objective: s.objective,
      tags: s.tags,
      groupBy: s.groupBy ?? s.group_by,
      createdAt: s.createdAt ?? s.created_at,
      updatedAt: s.updatedAt ?? s.updated_at
    }));

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? 25,
        slos
      },
      message: `Found **${result.total ?? 0}** SLOs.`
    };
  })
  .build();

export let manageSLO = SlateTool.create(spec, {
  name: 'Manage SLO',
  key: 'manage_slo',
  description: `Create, get, update, or delete a Kibana Service Level Objective (SLO).
Supports KQL, metric custom, and histogram indicator types with occurrences or timeslices budgeting methods.`,
  instructions: [
    'To create an SLO, provide name, indicator, timeWindow, budgetingMethod, and objective.',
    'The objective target is a decimal between 0 and 1 (e.g., 0.99 for 99%).',
    'Indicator types include "sli.kql.custom", "sli.metric.custom", and "sli.histogram.custom".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      sloId: z
        .string()
        .optional()
        .describe('ID of the SLO (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the SLO (required for create)'),
      description: z.string().optional().describe('Description of the SLO'),
      indicator: z
        .record(z.string(), z.any())
        .optional()
        .describe('SLO indicator configuration (required for create)'),
      timeWindow: z
        .object({
          duration: z.string().describe('Time window duration (e.g., "30d", "7d")'),
          type: z.string().describe('Window type: "rolling" or "calendarAligned"')
        })
        .optional()
        .describe('Time window (required for create)'),
      budgetingMethod: z
        .enum(['occurrences', 'timeslices'])
        .optional()
        .describe('Budgeting method (required for create)'),
      objective: z
        .object({
          target: z.number().describe('Target percentage as decimal (e.g., 0.99 for 99%)'),
          timesliceTarget: z
            .number()
            .optional()
            .describe('Timeslice target (for timeslices method)'),
          timesliceWindow: z
            .string()
            .optional()
            .describe('Timeslice window duration (e.g., "5m")')
        })
        .optional()
        .describe('SLO objective (required for create)'),
      tags: z.array(z.string()).optional().describe('Tags for the SLO'),
      groupBy: z.string().optional().describe('Field to group the SLO by')
    })
  )
  .output(sloOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      sloId,
      name,
      description,
      indicator,
      timeWindow,
      budgetingMethod,
      objective,
      tags,
      groupBy
    } = ctx.input;

    if (action === 'get') {
      if (!sloId) throw kibanaServiceError('sloId is required for get action');
      let s = await client.getSLO(sloId);
      return {
        output: {
          sloId: s.id,
          name: s.name,
          description: s.description,
          indicator: s.indicator,
          timeWindow: s.timeWindow ?? s.time_window,
          budgetingMethod: s.budgetingMethod ?? s.budgeting_method,
          objective: s.objective,
          tags: s.tags,
          groupBy: s.groupBy ?? s.group_by,
          createdAt: s.createdAt ?? s.created_at,
          updatedAt: s.updatedAt ?? s.updated_at
        },
        message: `Retrieved SLO \`${s.name}\`.`
      };
    }

    if (action === 'create') {
      if (!name) throw kibanaServiceError('name is required for create action');
      if (!indicator) throw kibanaServiceError('indicator is required for create action');
      if (!timeWindow) throw kibanaServiceError('timeWindow is required for create action');
      if (!budgetingMethod)
        throw kibanaServiceError('budgetingMethod is required for create action');
      if (!objective) throw kibanaServiceError('objective is required for create action');

      let s = await client.createSLO({
        name,
        description,
        indicator,
        timeWindow,
        budgetingMethod,
        objective,
        tags,
        groupBy
      });
      return {
        output: {
          sloId: s.id,
          name: s.name ?? name,
          description: s.description,
          indicator: s.indicator,
          timeWindow: s.timeWindow ?? s.time_window ?? timeWindow,
          budgetingMethod: s.budgetingMethod ?? s.budgeting_method ?? budgetingMethod,
          objective: s.objective ?? objective,
          tags: s.tags,
          groupBy: s.groupBy ?? s.group_by,
          createdAt: s.createdAt ?? s.created_at,
          updatedAt: s.updatedAt ?? s.updated_at
        },
        message: `Created SLO \`${name}\` with ID \`${s.id}\`.`
      };
    }

    if (action === 'update') {
      if (!sloId) throw kibanaServiceError('sloId is required for update action');
      let updateParams: Record<string, any> = {};
      if (name !== undefined) updateParams.name = name;
      if (description !== undefined) updateParams.description = description;
      if (indicator) updateParams.indicator = indicator;
      if (timeWindow) updateParams.timeWindow = timeWindow;
      if (budgetingMethod) updateParams.budgetingMethod = budgetingMethod;
      if (objective) updateParams.objective = objective;
      if (tags) updateParams.tags = tags;
      if (groupBy !== undefined) updateParams.groupBy = groupBy;

      let s = await client.updateSLO(sloId, updateParams);
      return {
        output: {
          sloId: s.id ?? sloId,
          name: s.name ?? name ?? '',
          description: s.description,
          indicator: s.indicator,
          timeWindow: s.timeWindow ?? s.time_window,
          budgetingMethod: s.budgetingMethod ?? s.budgeting_method,
          objective: s.objective,
          tags: s.tags,
          groupBy: s.groupBy ?? s.group_by,
          createdAt: s.createdAt ?? s.created_at,
          updatedAt: s.updatedAt ?? s.updated_at
        },
        message: `Updated SLO \`${sloId}\`.`
      };
    }

    if (action === 'delete') {
      if (!sloId) throw kibanaServiceError('sloId is required for delete action');
      await client.deleteSLO(sloId);
      return {
        output: {
          sloId,
          name: '',
          deleted: true
        },
        message: `Deleted SLO \`${sloId}\`.`
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();
