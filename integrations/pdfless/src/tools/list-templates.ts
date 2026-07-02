import { SlateTool } from 'slates';
import { z } from 'zod';
import { PdflessClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a paginated list of document templates available in the workspace. Use this to discover template IDs before generating PDFs.`,
  constraints: [
    'Returns at most 100 templates. If more exist, paginate through results using the page parameter.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (defaults to 1)'),
      pageSize: z.number().optional().describe('Number of templates per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            title: z.string().describe('Title of the template')
          })
        )
        .describe('List of document templates'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Number of templates per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PdflessClient({
      token: ctx.auth.token
    });

    let result = await client.listTemplates({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    ctx.info({
      message: 'Templates retrieved',
      count: result.templates.length,
      page: result.page
    });

    let templateList = result.templates
      .map(t => `- **${t.title}** (\`${t.templateId}\`)`)
      .join('\n');

    return {
      output: result,
      message:
        result.templates.length > 0
          ? `Found **${result.templates.length}** template(s) on page ${result.page}:\n${templateList}`
          : `No templates found on page ${result.page}.`
    };
  })
  .build();
