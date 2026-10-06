import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { text, z } from '../lib/schemas';
import { spec } from '../spec';
export const listProviders = SlateTool.create(spec, {
  name: 'List Providers',
  key: 'list_providers',
  description:
    'Discover the native provider catalog with exact provider names and authentication modes for integration creation. This collection has no documented pagination; results above the local 2,000-provider safety limit are refused. No provider credentials or authorization sessions are requested.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      providers: z.array(
        z.object({
          name: text,
          displayName: z.string().optional(),
          authMode: text,
          logoUrl: z.string().optional(),
          categories: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listProviders();
    return {
      output: {
        providers: result.data.map(item => ({
          name: item.name,
          displayName: item.display_name,
          authMode: item.auth_mode,
          logoUrl: item.logo_url,
          categories: item.categories
        }))
      },
      message: 'Retrieved the native provider catalog.'
    };
  })
  .build();
