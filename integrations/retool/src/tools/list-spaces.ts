import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `List all Spaces (isolated sub-environments) in the Retool organization. Spaces are useful for multi-tenant or multi-team setups.`,
  constraints: [
    'Requires Spaces to be enabled on the organization.',
    'API calls must be made from the Admin Space domain.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      spaces: z.array(
        z.object({
          spaceId: z.string(),
          spaceName: z.string(),
          domain: z.string(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listSpaces();

    let spaces = result.data.map(s => ({
      spaceId: s.id,
      spaceName: s.name,
      domain: s.domain,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: {
        spaces,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** spaces.`
    };
  })
  .build();
