import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let optimizationCompletedTrigger = SlateTrigger.create(spec, {
  name: 'Optimization Completed',
  key: 'optimization_completed',
  description:
    'Triggered when an image optimization completes. Use this by providing the webhook URL as the callback_url in your optimization requests. Kraken.io will POST results to this URL when processing is done.'
})
  .input(
    z.object({
      requestId: z.string().optional().describe('Unique optimization request ID'),
      success: z.boolean().describe('Whether the optimization succeeded'),
      fileName: z.string().optional().describe('Name of the optimized file'),
      originalSize: z.number().optional().describe('Original file size in bytes'),
      optimizedSize: z.number().optional().describe('Optimized file size in bytes'),
      savedBytes: z.number().optional().describe('Number of bytes saved'),
      optimizedUrl: z.string().optional().describe('URL to download the optimized image'),
      errorMessage: z.string().optional().describe('Error message if optimization failed')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Unique optimization request ID'),
      fileName: z.string().optional().describe('Name of the optimized file'),
      originalSize: z.number().optional().describe('Original file size in bytes'),
      optimizedSize: z.number().optional().describe('Optimized file size in bytes'),
      savedBytes: z.number().optional().describe('Number of bytes saved'),
      optimizedUrl: z
        .string()
        .optional()
        .describe('URL to download the optimized image (available for 1 hour)'),
      success: z.boolean().describe('Whether the optimization was successful'),
      errorMessage: z.string().optional().describe('Error message if optimization failed')
    })
  )
  .webhook({
    // Kraken.io does not support programmatic webhook registration.
    // The callback_url is specified per-request, so users provide the webhook URL
    // when making optimization requests.

    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';
      let data: Record<string, unknown>;

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } else {
        // Default format is application/x-www-form-urlencoded
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let success = data.success === true || data.success === 'true';

      return {
        inputs: [
          {
            requestId: data.id as string | undefined,
            success,
            fileName: data.file_name as string | undefined,
            originalSize:
              data.original_size !== undefined ? Number(data.original_size) : undefined,
            optimizedSize:
              data.kraked_size !== undefined ? Number(data.kraked_size) : undefined,
            savedBytes: data.saved_bytes !== undefined ? Number(data.saved_bytes) : undefined,
            optimizedUrl: data.kraked_url as string | undefined,
            errorMessage: !success ? (data.message as string | undefined) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.success ? 'optimization.completed' : 'optimization.failed';
      let eventId = ctx.input.requestId ?? `${ctx.input.fileName ?? 'unknown'}-${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          requestId: ctx.input.requestId,
          fileName: ctx.input.fileName,
          originalSize: ctx.input.originalSize,
          optimizedSize: ctx.input.optimizedSize,
          savedBytes: ctx.input.savedBytes,
          optimizedUrl: ctx.input.optimizedUrl,
          success: ctx.input.success,
          errorMessage: ctx.input.errorMessage
        }
      };
    }
  })
  .build();
