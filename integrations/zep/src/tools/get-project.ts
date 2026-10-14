import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Identify the Zep project authorized by the current API key, including its name, UUID, description, and default time zone.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      uuid: z.string().optional().describe('Project UUID'),
      name: z.string().optional().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      defaultTimeZone: z.string().optional().describe('Default project time zone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.getProject();
    if (!result.project) {
      throw createApiServiceError('Zep did not return project information for this API key.');
    }
    return {
      output: {
        uuid: result.project.uuid,
        name: result.project.name,
        description: result.project.description,
        createdAt: result.project.created_at,
        defaultTimeZone: result.project.default_time_zone
      },
      message: `Retrieved project **${result.project.name ?? result.project.uuid ?? 'authorized by this API key'}**.`
    };
  })
  .build();
