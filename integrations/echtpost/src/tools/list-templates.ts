import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTemplate, pageInput, pageOutput, templateOutput } from '../lib/schemas';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a page of saved postcard templates from your EchtPost account. Templates are created in the EchtPost web interface and referenced by ID when sending postcards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...pageInput,
      source: z
        .enum(['regular', 'ai', 'letter'])
        .optional()
        .describe('Template source filter; defaults to regular')
    })
  )
  .output(
    z.object({
      templates: z.array(templateOutput).describe('List of available postcard templates'),
      ...pageOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Fetching postcard templates');

    let result = await client.list('/templates', {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      source: ctx.input.source
    });
    let mapped = result.items.map(mapTemplate);

    return {
      output: {
        templates: mapped,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        links: result.links
      },
      message: `Found **${mapped.length}** postcard template(s).`
    };
  })
  .build();
