import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all NeuronWriter projects in the account. Each project contains keyword queries and is associated with a language and search engine. Use this to discover available projects and their IDs for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project identifier'),
          name: z.string().describe('Project name'),
          language: z.string().describe('Project language'),
          engine: z.string().describe('Associated search engine (e.g. google.co.uk)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);
    let projects = await client.listProjects();

    let mapped = projects.map(p => ({
      projectId: p.project,
      name: p.name,
      language: p.language,
      engine: p.engine
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
