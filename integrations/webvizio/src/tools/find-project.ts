import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findProject = SlateTool.create(spec, {
  name: 'Find Project',
  key: 'find_project',
  description: `Finds a project in Webvizio by its ID, UUID, external ID, or name. At least one identifier must be provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Webvizio internal project ID'),
      uuid: z.string().optional().describe('Project UUID'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier assigned to the project'),
      name: z.string().optional().describe('Project name to search for')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Webvizio project ID'),
      uuid: z.string().describe('Project UUID'),
      externalId: z.string().nullable().describe('External identifier'),
      name: z.string().describe('Project name'),
      screenshot: z.string().nullable().describe('Project screenshot URL'),
      url: z.string().nullable().describe('Project website URL'),
      createdAt: z.string().describe('Creation timestamp in ISO8601 format'),
      updatedAt: z.string().describe('Last update timestamp in ISO8601 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.findProject({
      projectId: ctx.input.projectId,
      uuid: ctx.input.uuid,
      externalId: ctx.input.externalId,
      name: ctx.input.name
    });

    return {
      output: {
        projectId: project.id,
        uuid: project.uuid,
        externalId: project.externalId,
        name: project.name,
        screenshot: project.screenshot,
        url: project.url,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      message: `Found project **${project.name}** (ID: ${project.id})`
    };
  })
  .build();
