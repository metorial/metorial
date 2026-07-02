import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a Railway project including its services and environments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
      name: z.string().describe('Project name'),
      description: z.string().nullable().describe('Project description'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      services: z.array(
        z.object({
          serviceId: z.string(),
          name: z.string(),
          icon: z.string().nullable()
        })
      ),
      environments: z.array(
        z.object({
          environmentId: z.string(),
          name: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description ?? null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        services: project.services.map((s: any) => ({
          serviceId: s.id,
          name: s.name,
          icon: s.icon ?? null
        })),
        environments: project.environments.map((e: any) => ({
          environmentId: e.id,
          name: e.name
        }))
      },
      message: `Project **${project.name}** has ${project.services.length} service(s) and ${project.environments.length} environment(s).`
    };
  })
  .build();
