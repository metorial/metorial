import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Contract Templates',
  key: 'list_templates',
  description: `Browse Starton's library of pre-audited smart contract templates. Templates include ERC20, ERC721, ERC1155, and other common contract types ready for deployment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().optional().describe('Specific template ID to get full details'),
      limit: z.number().default(20).describe('Number of templates to return'),
      page: z.number().default(0).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template identifier'),
            name: z.string().describe('Template name'),
            description: z.string().optional().describe('Template description'),
            category: z
              .string()
              .optional()
              .describe('Template category (e.g., ERC20, ERC721)'),
            blockchains: z.array(z.string()).optional().describe('Supported blockchains')
          })
        )
        .describe('Contract templates'),
      totalCount: z.number().optional().describe('Total number of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    if (ctx.input.templateId) {
      let template = await client.getTemplate(ctx.input.templateId);

      return {
        output: {
          templates: [
            {
              templateId: template.id || ctx.input.templateId,
              name: template.name || '',
              description: template.description,
              category: template.category,
              blockchains: template.blockchains
            }
          ],
          totalCount: 1
        },
        message: `Template **${template.name}**: ${template.description || 'No description.'}`
      };
    }

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let items = result.items || result || [];

    return {
      output: {
        templates: items.map((t: any) => ({
          templateId: t.id || '',
          name: t.name || '',
          description: t.description,
          category: t.category,
          blockchains: t.blockchains
        })),
        totalCount: result.meta?.totalCount || items.length
      },
      message: `Found **${items.length}** contract templates.`
    };
  })
  .build();
