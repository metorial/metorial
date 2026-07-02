import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Sanity projects you are a member of. Returns project metadata including name, ID, organization, members, and datasets. Optionally fetch detailed information for a specific project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe(
          'If provided, fetches detailed info for this specific project instead of listing all projects.'
        )
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z
            .object({
              projectId: z.string().describe('The project ID.'),
              displayName: z.string().describe('Human-readable project name.'),
              organizationId: z
                .string()
                .optional()
                .nullable()
                .describe('ID of the organization this project belongs to.'),
              createdAt: z.string().optional().describe('When the project was created.'),
              studioHost: z
                .string()
                .optional()
                .nullable()
                .describe('The studio hostname if deployed.'),
              members: z
                .array(
                  z.object({
                    userId: z.string().describe('User ID of the member.'),
                    role: z.string().describe('Role of the member in the project.')
                  })
                )
                .optional()
                .describe('List of project members.')
            })
            .passthrough()
        )
        .optional()
        .describe('List of projects (when no specific projectId is provided).'),
      project: z
        .any()
        .optional()
        .describe('Detailed project information (when a specific projectId is provided).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.projectId) {
      let project = await client.getProject(ctx.input.projectId);
      return {
        output: { project },
        message: `Retrieved details for project **${project.displayName || ctx.input.projectId}**.`
      };
    }

    let projects = await client.listProjects();
    return {
      output: { projects },
      message: `Found ${projects.length} project(s).`
    };
  })
  .build();
