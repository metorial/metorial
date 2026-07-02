import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let createSite = SlateTool.create(spec, {
  name: 'Create Site',
  key: 'create_site',
  description: `Create a new Fingertip site (website). A site represents a full business website with pages, bookings, contacts, and e-commerce capabilities.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the site'),
      slug: z.string().describe('URL-friendly identifier for the site'),
      businessType: z.string().describe('Type of business the site represents'),
      description: z.string().optional().describe('Description of the site'),
      status: z
        .enum(['EMPTY', 'UNPUBLISHED', 'PREVIEW', 'SOFT_CLAIM', 'ENABLED', 'DEMO', 'ARCHIVED'])
        .optional()
        .describe('Initial status of the site'),
      timeZone: z
        .string()
        .optional()
        .describe('Time zone for the site (e.g., America/New_York)'),
      workspaceId: z.string().optional().describe('ID of the workspace this site belongs to')
    })
  )
  .output(
    z.object({
      siteId: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      businessType: z.string().nullable(),
      status: z.string(),
      timeZone: z.string().nullable(),
      workspaceId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let site = await client.createSite({
      name: ctx.input.name,
      slug: ctx.input.slug,
      businessType: ctx.input.businessType,
      description: ctx.input.description,
      status: ctx.input.status,
      timeZone: ctx.input.timeZone,
      workspaceId: ctx.input.workspaceId
    });

    return {
      output: {
        siteId: site.id,
        name: site.name,
        slug: site.slug,
        description: site.description,
        businessType: site.businessType,
        status: site.status,
        timeZone: site.timeZone,
        workspaceId: site.workspaceId,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt
      },
      message: `Created site **${site.name}** with slug \`${site.slug}\`.`
    };
  })
  .build();
