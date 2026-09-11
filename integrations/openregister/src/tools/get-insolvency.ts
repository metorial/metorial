import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenRegisterClient } from '../lib/client';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getInsolvency = SlateTool.create(spec, {
  key: 'get_insolvency',
  name: 'Get Insolvency',
  description:
    'Read an insolvency proceeding with its status, debtor, administrator, dated events, and deadlines. Discover insolvency_id using search_insolvencies.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      insolvency_id: z
        .string()
        .trim()
        .min(1)
        .describe('Proceeding ID returned by search_insolvencies.')
    })
  )
  .output(out.insolvencyOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get insolvency',
      `/v1/insolvency/${encodeURIComponent(ctx.input.insolvency_id)}`,
      out.insolvencyOutput,
      {}
    );
    return { output: result, message: 'Get insolvency completed.' };
  })
  .build();
