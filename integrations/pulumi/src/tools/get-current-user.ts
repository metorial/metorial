import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated Pulumi user or machine-token principal and discover authorized organization logins for other tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      login: z.string(),
      name: z.string(),
      email: z.string().optional(),
      avatarUrl: z.string().optional(),
      organizations: z.array(
        z.object({ login: z.string(), name: z.string(), role: z.string().optional() })
      ),
      tokenInfo: z
        .object({ name: z.string(), organization: z.string(), team: z.string() })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    }).getCurrentUser();
    return {
      output: {
        userId: user.id,
        login: user.githubLogin,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        organizations: user.organizations.map(value => ({
          login: value.githubLogin,
          name: value.name,
          role: value.role
        })),
        tokenInfo: user.tokenInfo
      },
      message: `Authenticated as **${user.name || user.githubLogin}** with ${user.organizations.length} organization membership(s).`
    };
  })
  .build();
