import { SlateTool } from 'slates';
import { getClient } from '../lib/client';
import { one, z } from '../lib/schemas';
import { spec } from '../spec';
export const getCurrentContext = SlateTool.create(spec, {
  key: 'get_current_context',
  name: 'Get Current Context',
  description:
    'Validate the configured Ghost credential with an authenticated content read and show its site and credential type. Staff connections also return their native current user. Integration and Content keys do not represent a user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      siteUrl: z.string(),
      authMode: z.enum([
        'admin_api_key',
        'staff_access_token',
        'content_api_key',
        'legacy_admin'
      ]),
      title: z.string().optional(),
      publicSiteUrl: z.string().optional(),
      user: z
        .object({
          userId: z.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          slug: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = getClient(ctx);
    await client.browsePosts({ limit: 1, fields: 'id' });
    const site = (await client.readSite()).site;
    const user =
      client.mode === 'staff_access_token'
        ? one(await client.readUser('me'), 'users')
        : undefined;
    return {
      output: {
        siteUrl: client.domain,
        authMode: client.mode,
        title: site.title,
        publicSiteUrl: site.url,
        user: user
          ? { userId: user.id, name: user.name, email: user.email, slug: user.slug }
          : undefined
      },
      message:
        'Validated the Ghost connection. Integration and Content credentials identify a connection, not a staff user.'
    };
  })
  .build();
