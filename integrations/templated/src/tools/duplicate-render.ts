import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prepareRenderFiles } from '../lib/files';
import { spec } from '../spec';

export let duplicateRender = SlateTool.create(spec, {
  name: 'Duplicate Render',
  key: 'duplicate_render',
  description:
    'Create a duplicate of an existing render and return its provider metadata and generated file URL.'
})
  .input(
    z.object({
      renderId: z.string().min(1).describe('Render ID from list_renders or create_render')
    })
  )
  .output(z.object({ render: z.unknown(), filePreparationWarning: z.string().optional() }))
  .handleInvocation(async ctx => {
    let render = await new Client(ctx.auth.token).duplicateRender(ctx.input.renderId);
    let warnings = await prepareRenderFiles(ctx, render);
    return {
      output: {
        render,
        filePreparationWarning: warnings.length ? warnings.join(' ') : undefined
      },
      message: `Templated returned the duplicate render.${warnings.length ? ` ${warnings.join(' ')}` : ''}`
    };
  })
  .build();
