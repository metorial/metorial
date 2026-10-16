import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplateFromRender = SlateTool.create(spec, {
  name: 'Create Template From Render',
  key: 'create_template_from_render',
  description:
    'Create an editable template clone using the saved modifications from an existing render. Older renders without a stored payload produce a plain clone of their source template.',
  instructions: [
    'For multi-page renders, any page render ID recreates all pages in the stored payload. This creates a new template; it does not generate a new render.'
  ]
})
  .input(
    z.object({
      renderId: z
        .string()
        .min(1)
        .describe('Existing render ID from list_renders or create_render')
    })
  )
  .output(z.object({ template: z.unknown() }))
  .handleInvocation(async ctx => {
    let template = await new Client(ctx.auth.token).createTemplateFromRender(
      ctx.input.renderId
    );
    return { output: { template }, message: 'Templated returned the new template details.' };
  })
  .build();
