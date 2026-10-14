import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkDisposable = SlateTool.create(spec, {
  name: 'Check Disposable Domain',
  key: 'check_disposable',
  description:
    'Check whether an email domain issues temporary email addresses and whether its mail-server DNS records are configured. Useful for screening signups without checking a full mailbox.',
  constraints: ['Consumes one credit; unknown results are not charged.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      domain: z.string().max(255).describe('Email domain to check, such as example.com')
    })
  )
  .output(
    z.object({
      domain: z.string(),
      result: z
        .string()
        .describe('Domain status: ok, disposable, dead_server, invalid_mx, or unknown'),
      internalResult: z.string().nullable(),
      mxServer: z.string().nullable(),
      mxServerIp: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).checkDisposable(ctx.input.domain);
    return { output, message: `Domain **${output.domain}**: **${output.result}**.` };
  })
  .build();
