import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Lists agent groups in Zendesk. Groups organize agents and are used for ticket assignment and routing.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          isDefault: z.boolean(),
          deleted: z.boolean(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listGroups();

    let groups = (data.groups || []).map((g: any) => ({
      groupId: String(g.id),
      name: g.name,
      description: g.description || null,
      isDefault: g.default || false,
      deleted: g.deleted || false,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));

    return {
      output: {
        groups,
        count: data.count || groups.length
      },
      message: `Found ${groups.length} group(s)`
    };
  })
  .build();
