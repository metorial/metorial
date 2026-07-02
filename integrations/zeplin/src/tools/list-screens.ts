import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let screenSummarySchema = z.object({
  screenId: z.string().describe('Unique screen identifier'),
  name: z.string().describe('Screen name'),
  description: z.string().optional().describe('Screen description'),
  thumbnail: z.string().optional().describe('Screen thumbnail URL'),
  created: z.number().optional().describe('Creation timestamp'),
  updated: z.number().optional().describe('Last update timestamp'),
  tags: z.array(z.string()).optional().describe('Screen tags')
});

export let listScreens = SlateTool.create(spec, {
  name: 'List Screens',
  key: 'list_screens',
  description: `List all screens in a Zeplin project. Returns screen metadata including name, thumbnail, and timestamps. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
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
      screens: z.array(screenSummarySchema).describe('List of screens')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let screens = (await client.listScreens(ctx.input.projectId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    })) as any[];

    let mapped = screens.map((s: any) => ({
      screenId: s.id,
      name: s.name,
      description: s.description,
      thumbnail: s.thumbnail,
      created: s.created,
      updated: s.updated,
      tags: s.tags
    }));

    return {
      output: { screens: mapped },
      message: `Found **${mapped.length}** screen(s) in the project.`
    };
  })
  .build();
