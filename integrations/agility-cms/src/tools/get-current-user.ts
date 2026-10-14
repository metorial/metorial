import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieves the authenticated Agility CMS user and their instance access details. Requires OAuth authentication.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region,
      authMethod: ctx.auth.authMethod
    });
    let user = await client.getCurrentUser();
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw createApiServiceError('Agility CMS did not return the authenticated user.');
    }
    return { output: { user }, message: 'Retrieved the authenticated Agility CMS user.' };
  })
  .build();
