import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Unique identifier'),
  name: z.string().optional().describe('Project name'),
  description: z.string().optional().describe('Description'),
  status: z.string().optional().describe('Status: OPEN or CLOSED'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 update timestamp'),
  closedOn: z.string().optional().describe('Date the project was closed'),
  expectedCloseOn: z.string().optional().describe('Expected close date'),
  party: z.any().optional().describe('Associated party'),
  owner: z.any().optional().describe('Assigned owner'),
  team: z.any().optional().describe('Assigned team'),
  stage: z.any().optional().describe('Current board stage'),
  tags: z.array(z.any()).optional().describe('Associated tags'),
  fields: z.array(z.any()).optional().describe('Custom fields')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects (formerly cases) from Capsule CRM with pagination. Optionally filter by modification date or by party.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      partyId: z.number().optional().describe('Filter projects by party ID'),
      since: z
        .string()
        .optional()
        .describe('ISO 8601 date to filter projects modified after this date'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page, 1-100 (default: 50)'),
      embed: z
        .array(z.enum(['tags', 'fields', 'party', 'opportunity', 'missingImportantFields']))
        .optional()
        .describe('Additional data to embed')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.partyId) {
      result = await client.listProjectsByParty(ctx.input.partyId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        embed: ctx.input.embed
      });
    } else {
      result = await client.listProjects({
        since: ctx.input.since,
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        embed: ctx.input.embed
      });
    }

    let projects = (result.kases || []).map((k: any) => ({
      projectId: k.id,
      name: k.name,
      description: k.description,
      status: k.status,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
      closedOn: k.closedOn,
      expectedCloseOn: k.expectedCloseOn,
      party: k.party,
      owner: k.owner,
      team: k.team,
      stage: k.stage,
      tags: k.tags,
      fields: k.fields
    }));

    return {
      output: { projects },
      message: `Retrieved **${projects.length}** projects.`
    };
  })
  .build();
