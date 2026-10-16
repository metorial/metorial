import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getAttributes, getResource, requireText } from '../lib/response';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'who_am_i',
  description:
    'Identify the authenticated Keyword.com account and inspect its plan and keyword usage. Authentication secrets are excluded.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      name: z.string(),
      accessLevel: z.string().optional(),
      plan: z.string().optional(),
      keywordsUsed: z.number().optional(),
      keywordLimit: z.number().optional(),
      refreshes: z
        .object({
          used: z.number().optional(),
          remaining: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = getResource(await new Client({ token: ctx.auth.token }).getCurrentUser());
    let attributes = getAttributes(resource);
    requireText(resource.id, 'Account identifier returned by Keyword.com');
    requireText(attributes.name, 'Account name returned by Keyword.com');
    return {
      message: `Retrieved the current Keyword.com account.`,
      output: {
        accountId: resource.id,
        name: attributes.name,
        accessLevel: attributes.access_level,
        plan: attributes.package_info?.title,
        keywordsUsed: attributes.used,
        keywordLimit: attributes.package,
        refreshes: attributes.refreshes
      }
    };
  })
  .build();
