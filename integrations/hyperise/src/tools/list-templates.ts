import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Image Templates',
  key: 'list_image_templates',
  description: `List all active image templates in the Hyperise account. Returns each template's hash identifier, name, and dynamic personalization layer configuration. Use template hashes to create personalized short links, track impressions, or apply personalization.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z
            .object({
              templateHash: z
                .string()
                .describe('Unique hash identifier for the image template'),
              name: z.string().describe('Name of the image template'),
              previewUrl: z.string().optional().describe('Preview URL for the template image')
            })
            .passthrough()
        )
        .describe('List of active image templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listTemplates();

    let templates = Array.isArray(data) ? data : (data?.data ?? []);

    let mapped = templates.map((t: any) => ({
      templateHash: t.image_hash || t.hash || t.id?.toString(),
      name: t.name || t.image_name || 'Unnamed',
      previewUrl: t.preview_url || t.image_url,
      ...t
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** active image template(s).`
    };
  })
  .build();
