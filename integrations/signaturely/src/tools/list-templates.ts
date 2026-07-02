import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieves all available API templates from Signaturely. Templates define document layouts, signer roles, and field placements.
Use this to discover available templates before creating signature requests. The returned template IDs can be used with the Create Signature Request tool.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            title: z.string().optional().describe('Display name of the template')
          })
        )
        .describe('List of available API templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Listing available templates');

    let result = await client.listTemplates();

    let items = result.items || result || [];
    let templates = (Array.isArray(items) ? items : []).map((tmpl: any) => ({
      templateId: tmpl.id?.toString() || '',
      title: tmpl.title || tmpl.name || undefined
    }));

    return {
      output: {
        templates
      },
      message: `Found **${templates.length}** template(s) available for signature requests.`
    };
  })
  .build();
