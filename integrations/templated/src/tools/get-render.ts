import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prepareRenderFiles } from '../lib/files';
import { spec } from '../spec';

export let getRender = SlateTool.create(spec, {
  name: 'Get Render',
  key: 'get_render',
  description:
    'Retrieve an existing render by ID, retaining its provider metadata and generated file URL. Use this to inspect a previously accepted render without generating it again.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      renderId: z
        .string()
        .min(1)
        .describe('Render ID returned by create_render or list_renders')
    })
  )
  .output(z.object({ render: z.unknown(), filePreparationWarning: z.string().optional() }))
  .handleInvocation(async ctx => {
    let render = await new Client(ctx.auth.token).getRender(ctx.input.renderId);
    let warnings = await prepareRenderFiles(ctx, render);
    return {
      output: {
        render,
        filePreparationWarning: warnings.length ? warnings.join(' ') : undefined
      },
      message: `Retrieved render metadata for \`${ctx.input.renderId}\`.${warnings.length ? ` ${warnings.join(' ')}` : ''}`
    };
  })
  .build();
