import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDesigns = SlateTool.create(spec, {
  name: 'List Designs',
  key: 'list_designs',
  description: `List available certificate and badge design templates returned by Accredible. Designs provide the visual specification for how credentials are rendered. Use the design ID when creating groups to associate a design template. Page inputs select a portion of the returned set; the provider does not document whether that set is exhaustive.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Local page number within the designs returned by Accredible'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of returned designs per local page (default 50)')
    })
  )
  .output(
    z.object({
      designs: z
        .array(
          z.object({
            designId: z.number().describe('Design template ID'),
            name: z.string().optional().describe('Design name'),
            createdAt: z.string().optional().describe('Creation date'),
            updatedAt: z.string().optional().describe('Last update date')
          })
        )
        .describe('List of available design templates'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalCount: z.number().optional().describe('Total number of designs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? (ctx.config as { environment?: string }).environment
    });

    let result = await client.listDesigns(ctx.input.page, ctx.input.pageSize);

    let designs = result.designs.map((d: any) => ({
      designId: d.id,
      name: d.name,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: {
        designs,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        totalCount: result.meta?.total_count
      },
      message: `Found **${result.meta?.total_count ?? designs.length}** design templates.`
    };
  })
  .build();
