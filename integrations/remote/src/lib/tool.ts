import { SlateTool } from 'slates';
import type { z } from 'zod';
import { spec } from '../spec';
import { Client } from './client';
export function remoteTool<I extends {}, O extends {}>(
  options: {
    key: string;
    name: string;
    description: string;
    instructions?: string[];
    tags?: { readOnly?: boolean; destructive?: boolean };
  },
  input: z.ZodType<I>,
  output: z.ZodType<O>,
  handler: (
    client: Client,
    input: I
  ) => Promise<{ output: O; message: string; download?: { url: string; mimeType: string } }>
) {
  return SlateTool.create(spec, options)
    .input(input)
    .output(output)
    .handleInvocation(async ctx => {
      let result = await handler(new Client(ctx.auth), ctx.input);
      if (result.download)
        await ctx.addAttachment({
          type: 'url',
          url: result.download.url,
          mimeType: result.download.mimeType,
          headers: { Authorization: `Bearer ${ctx.auth.token}` }
        });
      return { output: result.output, message: result.message };
    })
    .build();
}
