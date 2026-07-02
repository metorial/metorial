import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExperimentationClient } from '../lib/client';
import { spec } from '../spec';

export let manageAudience = SlateTool.create(spec, {
  name: 'Manage Audience',
  key: 'manage_audience',
  description: `Create, update, retrieve, or list audiences in Optimizely Experimentation.
Audiences define targeting criteria that can be applied to experiments to control which visitors are included.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'list']).describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for create and list)'),
      audienceId: z.number().optional().describe('Audience ID (required for get/update)'),
      name: z.string().optional().describe('Audience name (for create/update)'),
      description: z.string().optional().describe('Audience description (for create/update)'),
      conditions: z
        .string()
        .optional()
        .describe('Audience conditions as JSON string (for create/update)'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      audience: z.any().optional().describe('Audience data'),
      audiences: z.array(z.any()).optional().describe('List of audiences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExperimentationClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.projectId)
          throw new Error('projectId is required for listing audiences');
        let audiences = await client.listAudiences(ctx.input.projectId, {
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        return {
          output: { audiences },
          message: `Listed ${Array.isArray(audiences) ? audiences.length : 0} audiences.`
        };
      }
      case 'get': {
        if (!ctx.input.audienceId) throw new Error('audienceId is required');
        let audience = await client.getAudience(ctx.input.audienceId);
        return {
          output: { audience },
          message: `Retrieved audience **${audience.name}** (ID: ${audience.id}).`
        };
      }
      case 'create': {
        if (!ctx.input.projectId) throw new Error('projectId is required');
        if (!ctx.input.name) throw new Error('name is required');
        let audience = await client.createAudience({
          project_id: ctx.input.projectId,
          name: ctx.input.name,
          description: ctx.input.description,
          conditions: ctx.input.conditions
        });
        return {
          output: { audience },
          message: `Created audience **${audience.name}** (ID: ${audience.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.audienceId) throw new Error('audienceId is required');
        let audience = await client.updateAudience(ctx.input.audienceId, {
          name: ctx.input.name,
          description: ctx.input.description,
          conditions: ctx.input.conditions
        });
        return {
          output: { audience },
          message: `Updated audience **${audience.name}** (ID: ${audience.id}).`
        };
      }
    }
  })
  .build();
