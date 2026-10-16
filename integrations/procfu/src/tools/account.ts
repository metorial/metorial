import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Get the email address of the ProcFu account connected by this API token.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ email: z.string().describe('The connected account email address') }))
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });
    let email = await client.whoami();
    return { output: { email }, message: `Connected to ProcFu as **${email}**.` };
  })
  .build();

export let getAccountUsage = SlateTool.create(spec, {
  name: 'Get Account Usage',
  key: 'get_account_usage',
  description: 'Get current ProcFu account usage and limits.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({ usage: z.any().describe('The complete ProcFu usage and limits response') })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });
    let usage = await client.getAccountUsage();
    return { output: { usage }, message: 'Retrieved ProcFu account usage and limits.' };
  })
  .build();

export let getLastError = SlateTool.create(spec, {
  name: 'Get Last Error',
  key: 'get_last_error',
  description:
    'Get the latest ProcFu error within a recent time window, optionally restricted to a function. The response is blank when no error was found.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      scriptName: z
        .string()
        .optional()
        .describe('Optional function filename to inspect, for example podio_item_create.pf'),
      sinceSeconds: z
        .number()
        .optional()
        .default(30)
        .describe('Positive whole number of seconds to look back. Defaults to 30.')
    })
  )
  .output(z.object({ error: z.any().describe('The ProcFu error text, or blank if none') }))
  .handleInvocation(async ctx => {
    if (!Number.isInteger(ctx.input.sinceSeconds) || ctx.input.sinceSeconds < 1) {
      throw createApiServiceError('sinceSeconds must be a positive whole number.');
    }
    let client = new ProcFuClient({ token: ctx.auth.token });
    let error = await client.getLastError(ctx.input.scriptName, ctx.input.sinceSeconds);
    return { output: { error }, message: 'Retrieved recent ProcFu error details.' };
  })
  .build();
