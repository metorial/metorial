import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateEmailLightning = SlateTool.create(spec, {
  name: 'Validate Email Lightning',
  key: 'validate_email_lightning',
  description:
    'Checks an email address with REV Lightning, returning reachability, catch-all domain status, disposable and free provider flags, ISP status, and caution indicators.',
  instructions: [
    'Reachability and catch-all results can be Y, N, or ?. A question mark means the provider could not determine that result.',
    'Caution indicates potential suspicious use of the email service; it is not a definitive fraud determination.'
  ],
  constraints: ['API rate limit of 10 requests per second.'],
  tags: { readOnly: true }
})
  .input(z.object({ email: z.string().describe('Email address to validate') }))
  .output(
    z.object({
      lookupId: z.string().describe('Provider transaction identifier'),
      email: z.string().describe('Email address returned by the provider'),
      reachable: z.string().describe('Y = reachable, N = unreachable, ? = unknown'),
      acceptAll: z
        .string()
        .describe('Y = catch-all domain, N = explicit accounts only, ? = unknown'),
      disposable: z.string().describe('Y = disposable or temporary email, N = not disposable'),
      free: z.string().describe('Y = known free email service, N = not a known free service'),
      isp: z
        .string()
        .describe('Y = email provided to internet-service customers, N = not an ISP email'),
      caution: z
        .string()
        .describe('Y = possible suspicious use, N = no extra suspicion indicators'),
      providerResponse: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.emailLightning(ctx.input.email);
    return {
      output: {
        lookupId: result.id,
        email: result.email,
        reachable: result.reachable,
        acceptAll: result.accept_all,
        disposable: result.disposable,
        free: result.free,
        isp: result.isp,
        caution: result.caution,
        providerResponse: result
      },
      message: `Email **${result.email}**: reachable **${result.reachable}**, catch-all **${result.accept_all}**, disposable **${result.disposable}**.`
    };
  })
  .build();
