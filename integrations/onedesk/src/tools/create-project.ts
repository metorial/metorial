import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Creates a new project in OneDesk.
Projects are containers for organizing work items like tickets and tasks.
Optionally assign a parent portfolio and project type.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project.'),
      type: z
        .string()
        .optional()
        .describe(
          'Project type identifier. Use "Get Organization Info" to list available container types.'
        ),
      description: z.string().optional().describe('Description of the project.'),
      parentPortfolioExternalIds: z
        .array(z.string())
        .optional()
        .describe('External IDs of parent portfolios to place this project under.')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the newly created project.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.createProject({
      name: ctx.input.name,
      type: ctx.input.type,
      description: ctx.input.description,
      parentPortfolioExternalIds: ctx.input.parentPortfolioExternalIds
    });

    let projectId =
      typeof result === 'string' ? result : result?.id || result?.externalId || String(result);

    return {
      output: {
        projectId
      },
      message: `Created project **${ctx.input.name}** with ID \`${projectId}\`.`
    };
  })
  .build();
