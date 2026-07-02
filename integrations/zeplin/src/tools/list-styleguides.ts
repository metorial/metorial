import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let styleguideSummarySchema = z.object({
  styleguideId: z.string().describe('Styleguide identifier'),
  name: z.string().describe('Styleguide name'),
  description: z.string().optional().describe('Styleguide description'),
  platform: z.string().optional().describe('Target platform'),
  thumbnail: z.string().optional().describe('Styleguide thumbnail URL'),
  status: z.string().optional().describe('Styleguide status'),
  created: z.number().optional().describe('Creation timestamp'),
  updated: z.number().optional().describe('Last update timestamp'),
  numberOfMembers: z.number().optional().describe('Number of members'),
  numberOfComponents: z.number().optional().describe('Number of components'),
  organizationId: z.string().optional().describe('Parent organization ID'),
  organizationName: z.string().optional().describe('Parent organization name')
});

export let listStyleguides = SlateTool.create(spec, {
  name: 'List Styleguides',
  key: 'list_styleguides',
  description: `List all Zeplin styleguides the authenticated user is a member of. Optionally filter by linked project, linked styleguide, or workspace. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkedProject: z
        .string()
        .optional()
        .describe('Filter to styleguides linked to this project ID'),
      linkedStyleguide: z
        .string()
        .optional()
        .describe('Filter to styleguides linked to this styleguide ID'),
      workspace: z.string().optional().describe('Filter by workspace ID'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default: 30)'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      styleguides: z.array(styleguideSummarySchema).describe('List of styleguides')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let styleguides = (await client.listStyleguides({
      linkedProject: ctx.input.linkedProject,
      linkedStyleguide: ctx.input.linkedStyleguide,
      workspace: ctx.input.workspace,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    })) as any[];

    let mapped = styleguides.map((s: any) => ({
      styleguideId: s.id,
      name: s.name,
      description: s.description,
      platform: s.platform,
      thumbnail: s.thumbnail,
      status: s.status,
      created: s.created,
      updated: s.updated,
      numberOfMembers: s.number_of_members,
      numberOfComponents: s.number_of_components,
      organizationId: s.organization?.id,
      organizationName: s.organization?.name
    }));

    return {
      output: { styleguides: mapped },
      message: `Found **${mapped.length}** styleguide(s).`
    };
  })
  .build();

export let getStyleguide = SlateTool.create(spec, {
  name: 'Get Styleguide',
  key: 'get_styleguide',
  description: `Retrieve detailed information about a specific Zeplin styleguide.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      styleguideId: z.string().describe('ID of the styleguide to retrieve')
    })
  )
  .output(
    z.object({
      styleguideId: z.string().describe('Styleguide identifier'),
      name: z.string().describe('Styleguide name'),
      description: z.string().optional().describe('Styleguide description'),
      platform: z.string().optional().describe('Target platform'),
      thumbnail: z.string().optional().describe('Styleguide thumbnail URL'),
      status: z.string().optional().describe('Styleguide status'),
      created: z.number().optional().describe('Creation timestamp'),
      updated: z.number().optional().describe('Last update timestamp'),
      numberOfMembers: z.number().optional().describe('Number of members'),
      numberOfComponents: z.number().optional().describe('Number of components'),
      organizationId: z.string().optional().describe('Parent organization ID'),
      organizationName: z.string().optional().describe('Parent organization name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let s = (await client.getStyleguide(ctx.input.styleguideId)) as any;

    return {
      output: {
        styleguideId: s.id,
        name: s.name,
        description: s.description,
        platform: s.platform,
        thumbnail: s.thumbnail,
        status: s.status,
        created: s.created,
        updated: s.updated,
        numberOfMembers: s.number_of_members,
        numberOfComponents: s.number_of_components,
        organizationId: s.organization?.id,
        organizationName: s.organization?.name
      },
      message: `Retrieved styleguide **${s.name}**.`
    };
  })
  .build();
