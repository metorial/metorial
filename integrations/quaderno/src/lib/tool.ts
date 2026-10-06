import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import type { Client } from './client';
import { createClient } from './helpers';
import { invalid, type Row, responseError } from './validation';

type Download = { type: 'url'; url: string; mimeType: string; filename?: string };
export function tool<I extends z.ZodRawShape, O extends z.ZodRawShape>(options: {
  name: string;
  key: string;
  description: string;
  input: I;
  output: O;
  readOnly?: boolean;
  destructive?: boolean;
  run: (
    input: z.output<z.ZodObject<I>>,
    client: Client,
    addDownload: (value: Download) => Promise<unknown>
  ) => Promise<Row>;
}) {
  const input = z.object(options.input),
    output = z.object(options.output);
  return SlateTool.create(spec, {
    name: options.name,
    key: options.key,
    description: options.description,
    tags: { readOnly: options.readOnly ?? false, destructive: options.destructive ?? false }
  })
    .input(input)
    .output(output)
    .handleInvocation(async ctx => {
      const parsed = input.safeParse(ctx.input);
      if (!parsed.success) throw invalid('Check the required fields and supported formats.');
      const result = await options.run(parsed.data, createClient(ctx), ctx.addAttachment);
      const checked = output.safeParse(result);
      if (!checked.success) throw responseError();
      return {
        output: checked.data,
        message: `${options.name}: Quaderno accepted the request.${options.key.startsWith('deliver_') ? ' Delivery was initiated; receipt is not confirmed.' : ''}`
      };
    })
    .build();
}
