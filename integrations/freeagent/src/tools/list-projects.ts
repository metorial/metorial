import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve projects from FreeAgent with optional filtering by status or contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['active', 'completed', 'cancelled', 'hidden'])
        .optional()
        .describe('Filter projects by status'),
      sort: z
        .enum([
          'name',
          '-name',
          'contact_name',
          '-contact_name',
          'created_at',
          '-created_at',
          'updated_at',
          '-updated_at'
        ])
        .optional()
        .describe('Sort order'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      projects: z.array(z.record(z.string(), z.any())).describe('List of project records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let projects = await client.listProjects(ctx.input);
    let count = projects.length;

    return {
      output: { projects },
      message: `Found **${count}** project${count !== 1 ? 's' : ''}${ctx.input.view ? ` (${ctx.input.view})` : ''}.`
    };
  })
  .build();
