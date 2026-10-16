import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawSchema } from '../lib/responses';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  key: 'list_organizations',
  name: 'List My Organizations',
  description:
    'Discover organizations accessible to the authenticated account, including their IDs, names and your role. Pass an organization ID to transcription, glossary, style-guide and order tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.string(),
          name: z.string(),
          role: z.string(),
          raw: rawSchema
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listOrganizations();
    return {
      output: {
        organizations: result.map(item => ({
          organizationId: String(item.id),
          name: item.name,
          role: item.role,
          raw: item
        }))
      },
      message: `Found **${result.length}** organization(s).`
    };
  })
  .build();
