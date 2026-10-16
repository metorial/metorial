import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let executeStoredFunction = SlateTool.create(spec, {
  name: 'Execute Stored Function',
  key: 'execute_stored_function',
  description:
    'Run a reusable function saved in the CustomJS Code Editor by its Script ID, passing the function its expected JSON data.',
  instructions: [
    'Find the Script ID in the CustomJS Code Editor after saving a function. The configured function response type controls whether the result is JSON, text, or a file.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      scriptId: z
        .string()
        .describe('Script ID of the function saved in the CustomJS Code Editor.'),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          'JSON object sent directly to the stored function, using the fields expected by that function.'
        ),
      returnBinary: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set true when the stored function returns a binary file.'),
      filename: z
        .string()
        .optional()
        .describe('Download filename for a binary result. Defaults to result.bin.'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type for a binary result. Defaults to application/octet-stream.')
    })
  )
  .output(
    z.object({
      result: z
        .unknown()
        .optional()
        .describe('Raw JSON or text result. Omitted for a binary result.'),
      scriptId: z.string(),
      filename: z.string().optional(),
      mimeType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (!/^[A-Za-z0-9_-]+$/.test(ctx.input.scriptId) || ctx.input.scriptId.startsWith('__')) {
      throw createApiServiceError(
        'Provide the Script ID of a saved function from the CustomJS Code Editor.'
      );
    }
    let result = await new ExecutionClient(ctx.auth).executeStoredFunction(ctx.input);
    if (ctx.input.returnBinary) {
      let filename = ctx.input.filename ?? 'result.bin';
      let mimeType = ctx.input.mimeType ?? 'application/octet-stream';
      await ctx.addAttachment({
        type: 'content',
        content: Buffer.from(result),
        filename,
        mimeType
      });
      return {
        output: { scriptId: ctx.input.scriptId, filename, mimeType },
        message: 'Stored function executed and its file is ready to download.'
      };
    }
    return {
      output: { scriptId: ctx.input.scriptId, result },
      message: 'Stored function executed successfully.'
    };
  })
  .build();
