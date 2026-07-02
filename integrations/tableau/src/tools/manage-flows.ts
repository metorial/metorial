import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageFlows = SlateTool.create(spec, {
  name: 'Manage Flows',
  key: 'manage_flows',
  description: `List, get, update, delete, or run Tableau Prep flows. Use the **action** field to select the operation.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'update', 'delete', 'run'])
        .describe('Operation to perform'),
      flowId: z
        .string()
        .optional()
        .describe('Flow LUID (required for get, update, delete, run)'),
      name: z.string().optional().describe('New name (for update)'),
      description: z.string().optional().describe('New description (for update)'),
      projectId: z.string().optional().describe('New project LUID (for update)'),
      ownerUserId: z.string().optional().describe('New owner LUID (for update)'),
      pageSize: z.number().optional().describe('Page size for list'),
      pageNumber: z.number().optional().describe('Page number for list'),
      filter: z.string().optional().describe('Filter expression for list'),
      sort: z.string().optional().describe('Sort expression for list')
    })
  )
  .output(
    z.object({
      flows: z
        .array(
          z.object({
            flowId: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            projectId: z.string().optional(),
            projectName: z.string().optional(),
            ownerId: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      flow: z
        .object({
          flowId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          projectId: z.string().optional(),
          projectName: z.string().optional(),
          ownerId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional(),
      jobId: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryFlows({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let pagination = result.pagination || {};
      let flows = (result.flows?.flow || []).map((f: any) => ({
        flowId: f.id,
        name: f.name,
        description: f.description,
        projectId: f.project?.id,
        projectName: f.project?.name,
        ownerId: f.owner?.id,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }));
      return {
        output: { flows, totalCount: Number(pagination.totalAvailable || 0) },
        message: `Found **${flows.length}** flows (${pagination.totalAvailable || 0} total).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.flowId) throw tableauServiceError('flowId is required for get action.');

      let f = await client.getFlow(ctx.input.flowId);
      return {
        output: {
          flow: {
            flowId: f.id,
            name: f.name,
            description: f.description,
            projectId: f.project?.id,
            projectName: f.project?.name,
            ownerId: f.owner?.id,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt
          }
        },
        message: `Retrieved flow **${f.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.flowId)
        throw tableauServiceError('flowId is required for update action.');
      if (
        ctx.input.name === undefined &&
        ctx.input.description === undefined &&
        ctx.input.projectId === undefined &&
        ctx.input.ownerUserId === undefined
      ) {
        throw tableauServiceError('Provide at least one field to update a flow.');
      }

      let f = await client.updateFlow(ctx.input.flowId, {
        name: ctx.input.name,
        description: ctx.input.description,
        projectId: ctx.input.projectId,
        ownerUserId: ctx.input.ownerUserId
      });
      return {
        output: {
          flow: {
            flowId: f.id,
            name: f.name,
            description: f.description,
            projectId: f.project?.id,
            projectName: f.project?.name,
            ownerId: f.owner?.id,
            updatedAt: f.updatedAt
          }
        },
        message: `Updated flow **${f.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.flowId)
        throw tableauServiceError('flowId is required for delete action.');

      await client.deleteFlow(ctx.input.flowId);
      return {
        output: { deleted: true },
        message: `Deleted flow \`${ctx.input.flowId}\`.`
      };
    }

    if (action === 'run') {
      if (!ctx.input.flowId) throw tableauServiceError('flowId is required for run action.');

      let job = await client.runFlow(ctx.input.flowId);
      return {
        output: { jobId: job?.id },
        message: `Started flow run for \`${ctx.input.flowId}\`. Job ID: \`${job?.id}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
