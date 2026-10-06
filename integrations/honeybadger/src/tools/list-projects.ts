import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Project } from '../lib/types';
import { accountIdSchema, nextUrlSchema } from '../lib/validation';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Unique project ID'),
  name: z.string().describe('Project name'),
  projectToken: z.string().optional().describe('Legacy field; credentials are not returned'),
  reportingKeyAvailable: z
    .boolean()
    .optional()
    .describe('Whether the project has a primary reporting key'),
  faultCount: z.number().optional().describe('Total number of faults'),
  language: z.string().optional().describe('Primary language of the project'),
  createdAt: z.string().optional().describe('When the project was created'),
  environments: z.array(z.unknown()).optional().describe('Project environments'),
  teams: z.array(z.unknown()).optional().describe('Teams associated with the project'),
  streams: z
    .array(
      z.object({
        streamId: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        internal: z.boolean().optional()
      })
    )
    .optional()
    .describe('Insights streams for query_insights streamIds'),
  active: z.boolean().optional().describe('Whether the project is active')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List a page of Honeybadger projects accessible with your auth token. Optionally filter by account. Returns project details including name, language, fault count, and associated teams; use nextUrl to continue.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextUrl: nextUrlSchema,
      accountId: accountIdSchema.optional()
    })
  )
  .output(
    z.object({
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let data = await client.listProjects({
      accountId: ctx.input.accountId,
      nextUrl: ctx.input.nextUrl
    });
    let results = data.results || [];

    let projects = results.map((p: Project) => ({
      projectId: p.id ?? undefined,
      name: p.name ?? undefined,
      reportingKeyAvailable: Boolean(p.token),
      faultCount: p.fault_count ?? undefined,
      language: p.language ?? undefined,
      createdAt: p.created_at ?? undefined,
      environments: p.environments ?? undefined,
      teams: p.teams ?? undefined,
      streams: p.streams?.map(stream => ({
        streamId: stream.id,
        name: stream.name ?? undefined,
        slug: stream.slug ?? undefined,
        internal: stream.internal ?? undefined
      })),
      active: p.active ?? undefined
    }));

    return {
      output: { projects, nextUrl: data.links?.next ?? undefined },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
