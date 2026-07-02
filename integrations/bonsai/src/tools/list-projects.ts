import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all projects from Bonsai. Returns project details including name, linked client, currency, status, and description.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project ID'),
            name: z.string().describe('Project name'),
            clientId: z.string().optional().describe('Linked client ID'),
            clientEmail: z.string().optional().describe('Linked client email'),
            currency: z.string().optional().describe('Project currency'),
            status: z.string().optional().describe('Project status'),
            description: z.string().optional().describe('Project description')
          })
        )
        .describe('List of projects'),
      totalCount: z.number().describe('Total number of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let projects = await client.listProjects();

    return {
      output: {
        projects: projects.map(p => ({
          projectId: p.id,
          name: p.name,
          clientId: p.clientId,
          clientEmail: p.clientEmail,
          currency: p.currency,
          status: p.status,
          description: p.description
        })),
        totalCount: projects.length
      },
      message: `Found **${projects.length}** projects.`
    };
  })
  .build();
