import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { consortiumId, contractProjectId, membershipId } from '../lib/schemas';
import { spec } from '../spec';

let projectSchema = z.object({
  contractProjectId: z.string().describe('Contract project ID'),
  name: z.string().optional().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  membershipId: z.string().optional().describe('Owning membership ID'),
  contractType: z.string().optional().describe('Project type'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageContractProject = SlateTool.create(spec, {
  name: 'Manage Contract Project',
  key: 'manage_contract_project',
  description:
    'Create, list, retrieve, update, or delete consortium contract projects. Call list_consortia to discover the consortium, then use the project ID with manage_compiled_contract to manage compiled versions.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'get', 'update', 'delete']),
      consortiumId,
      contractProjectId: contractProjectId.optional(),
      name: z.string().optional().describe('Project name; required for create'),
      description: z.string().optional().describe('Project description for create or update'),
      membershipId: membershipId.optional(),
      contractType: z
        .enum(['github', 'precompiled'])
        .optional()
        .describe('Project type; required for create')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).optional(),
      project: projectSchema.optional(),
      contractProjectId: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({ token: ctx.auth.token, region: ctx.config.region });
    let mapProject = (project: Record<string, any>) => ({
      contractProjectId: project._id,
      name: project.name ?? undefined,
      description: project.description ?? undefined,
      membershipId: project.membership_id ?? undefined,
      contractType: project.type ?? undefined,
      createdAt: project.created_at ?? undefined
    });
    if (ctx.input.action === 'list') {
      let projects = (await client.listContractProjects(ctx.input.consortiumId)).map(
        mapProject
      );
      return {
        output: { projects },
        message: `Found ${projects.length} contract project(s).`
      };
    }
    if (ctx.input.action === 'create') {
      if (!ctx.input.name?.trim() || !ctx.input.membershipId || !ctx.input.contractType) {
        throw createApiServiceError(
          'Provide name, membershipId, and contractType when creating a contract project.',
          { reason: 'invalid_input' }
        );
      }
      let result = await client.createContractProject(ctx.input.consortiumId, {
        name: ctx.input.name,
        description: ctx.input.description,
        membership_id: ctx.input.membershipId,
        type: ctx.input.contractType
      });
      return {
        output: { project: mapProject(result), contractProjectId: result._id },
        message: `Created contract project ${result.name}.`
      };
    }
    if (!ctx.input.contractProjectId) {
      throw createApiServiceError(
        'Provide contractProjectId. Discover projects with manage_contract_project action list.',
        { reason: 'invalid_input' }
      );
    }
    if (ctx.input.action === 'delete') {
      await client.deleteContractProject(ctx.input.consortiumId, ctx.input.contractProjectId);
      return {
        output: { contractProjectId: ctx.input.contractProjectId, deleted: true },
        message: `Deleted contract project ${ctx.input.contractProjectId}.`
      };
    }
    let params = pickDefined({ name: ctx.input.name, description: ctx.input.description });
    if (ctx.input.action === 'update' && !Object.keys(params).length) {
      throw createApiServiceError('Provide name or description to update the project.', {
        reason: 'invalid_input'
      });
    }
    let result =
      ctx.input.action === 'update'
        ? await client.updateContractProject(
            ctx.input.consortiumId,
            ctx.input.contractProjectId,
            params
          )
        : await client.getContractProject(ctx.input.consortiumId, ctx.input.contractProjectId);
    return {
      output: { project: mapProject(result), contractProjectId: result._id },
      message: `Retrieved contract project ${result.name}.`
    };
  })
  .build();
