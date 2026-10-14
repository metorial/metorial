import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all Paradym projects accessible to the authenticated user. Each project provides multi-tenancy with its own templates, sessions, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageBefore: z.string().optional().describe('Cursor for fetching the previous page'),
      pageSize: z.number().optional().describe('Number of projects to return per page'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      metadata: z
        .any()
        .optional()
        .describe('Provider pagination metadata, including next and previous page URLs'),
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('ID of the project'),
            name: z.string().describe('Project name'),
            ownerId: z.string().optional().describe('ID of the project owner'),
            verificationDataAccess: z
              .string()
              .optional()
              .describe('Default availability of verified attributes through the API'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.listProjects({
      pageSize: ctx.input.pageSize,
      pageBefore: ctx.input.pageBefore,
      pageAfter: ctx.input.pageAfter
    });

    let projects = (result.data ?? []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      ownerId: p.ownerId,
      verificationDataAccess: p.verificationDataAccess,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: { projects, metadata: result.meta },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
