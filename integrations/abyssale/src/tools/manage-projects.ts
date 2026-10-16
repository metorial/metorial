import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in your Abyssale workspace. Projects are used to organize designs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Phrase to match in project names.'),
      page: z
        .number()
        .optional()
        .describe('1-based page. Omit page and perPage to return every match.'),
      perPage: z.number().optional().describe('Items per page; provider caps values over 100.')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique identifier of the project'),
          name: z.string().describe('Project name'),
          createdAt: z.string().describe('Unix timestamp when the project was created'),
          raw: z.record(z.string(), z.any()).optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.listProjects(ctx.input);
    let projects = result.items;

    let mapped = projects.map(p => ({
      projectId: p.id,
      name: p.name,
      createdAt: String(p.created_at_ts),
      raw: p
    }));

    return {
      output: { projects: mapped, totalCount: result.totalCount },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in your Abyssale workspace for organizing designs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project (2-100 characters)')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      name: z.string().describe('Name of the created project'),
      createdAt: z.string().describe('Unix timestamp when the project was created'),
      raw: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.createProject(ctx.input.name);

    return {
      output: {
        projectId: result.id,
        name: result.name,
        createdAt: String(result.created_at_ts),
        raw: result
      },
      message: `Created project **${result.name}** with ID \`${result.id}\`.`
    };
  })
  .build();
