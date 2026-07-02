import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let redirectSchema = z
  .object({
    from: z.string().optional().describe('Source URL'),
    to: z.string().optional().describe('Destination URL'),
    firstDetected: z.string().optional().describe('When the redirect was first detected'),
    lastDetected: z.string().optional().describe('When the redirect was last detected')
  })
  .passthrough();

export let getRedirects = SlateTool.create(spec, {
  name: 'Get Domain Redirects',
  key: 'get_redirects',
  description: `Retrieve live and historical redirects for a website. Shows the full redirect chain history — where a domain redirects to and from, and how long each redirect has been in place.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to check redirects for (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      redirects: z.array(redirectSchema).describe('Redirect chain history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.redirects(ctx.input.domain);

    let redirects = data?.Results ?? [];

    return {
      output: {
        redirects
      },
      message: `Found **${redirects.length}** redirect(s) for **${ctx.input.domain}**.`
    };
  });
