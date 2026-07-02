import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Updates an existing project in Webvizio. You can update the project name and screenshot. Identify the project by its ID, UUID, or external ID.`,
  tags: {
    destructive: false,
    readOnly: false
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
      name: z.string().optional().describe('New name for the project'),
      screenshotUrl: z.string().optional().describe('New screenshot URL for the project')
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

    let project = await client.updateProject({
      projectId: ctx.input.projectId,
      uuid: ctx.input.uuid,
      externalId: ctx.input.externalId,
      name: ctx.input.name,
      screenshot: ctx.input.screenshotUrl
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
      message: `Updated project **${project.name}** (ID: ${project.id})`
    };
  })
  .build();
