import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';
export const listFormats = SlateTool.create(spec, {
  name: 'List Conversion Formats',
  key: 'list_formats',
  description:
    'Discover supported conversion paths from the current operations catalog. Filter by input format, output format, engine, or engine version before creating a conversion.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      inputFormat: z.string().min(1).optional(),
      outputFormat: z.string().min(1).optional(),
      engine: z.string().min(1).optional(),
      engineVersion: z.string().min(1).optional()
    })
  )
  .output(
    z.object({
      formats: z.array(
        z.object({
          inputFormat: z.string(),
          outputFormat: z.string(),
          engine: z.string(),
          engineVersion: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listConversionFormats(ctx.input);
    return {
      output: {
        formats: result.map(format => ({
          inputFormat: format.input_format,
          outputFormat: format.output_format,
          engine: format.engine,
          engineVersion: format.engine_version
        }))
      },
      message: `Found ${result.length} conversion format(s).`
    };
  })
  .build();
