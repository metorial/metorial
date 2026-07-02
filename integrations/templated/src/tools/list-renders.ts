import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let renderSchema = z.object({
  renderId: z.string().optional(),
  url: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  createdAt: z.string().optional(),
  externalId: z.string().nullable().optional()
});

export let listRenders = SlateTool.create(spec, {
  name: 'List Renders',
  key: 'list_renders',
  description: `Retrieve all renders from your account. Returns a list of generated outputs including their URLs, formats, dimensions, and associated template information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      renders: z.array(renderSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let renders = await client.listRenders();

    let items = Array.isArray(renders) ? renders : [];

    return {
      output: {
        renders: items.map((r: any) => ({
          renderId: r.id,
          url: r.url,
          width: r.width,
          height: r.height,
          format: r.format,
          templateId: r.templateId,
          templateName: r.templateName,
          createdAt: r.createdAt,
          externalId: r.externalId
        }))
      },
      message: `Found **${items.length}** render(s).`
    };
  })
  .build();
