import { createAxios, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let mockAxios = createAxios({
  baseURL: 'https://mock-oauth.metorial.net'
});

export let me = SlateTool.create(spec, {
  name: 'Me',
  key: 'me',
  description: `Return the /userinfo payload for the currently authenticated session against mock-oauth.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sub: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
      raw: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let response = await mockAxios.get('/userinfo', {
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    let data = response.data ?? {};

    return {
      output: {
        sub: typeof data.sub === 'string' ? data.sub : undefined,
        email: typeof data.email === 'string' ? data.email : undefined,
        name: typeof data.name === 'string' ? data.name : undefined,
        raw: data
      },
      message:
        typeof data.email === 'string'
          ? `Signed in as **${data.name ?? data.sub ?? data.email}** (${data.email}).`
          : `Signed in as **${data.name ?? data.sub ?? 'unknown'}**.`
    };
  })
  .build();
