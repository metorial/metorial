import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Creates a new URL-based project in Webvizio. Projects serve as containers for tasks, bug reports, and feedback items associated with a specific website URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the website for the project'),
      name: z.string().optional().describe('Name for the project'),
      screenshotUrl: z.string().optional().describe('URL of a screenshot for the project'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for syncing with your system')
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

    let project = await client.createProject({
      url: ctx.input.url,
      name: ctx.input.name,
      screenshot: ctx.input.screenshotUrl,
      externalId: ctx.input.externalId
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
      message: `Created project **${project.name}** (ID: ${project.id}) for URL: ${project.url}`
    };
  })
  .build();
