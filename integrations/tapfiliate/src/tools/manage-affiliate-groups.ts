import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let affiliateGroupSchema = z.object({
  groupId: z.string().describe('Unique identifier of the group'),
  title: z.string().optional().describe('Group title'),
  currency: z.string().optional().describe('Currency associated with the group')
});

export let listAffiliateGroups = SlateTool.create(spec, {
  name: 'List Affiliate Groups',
  key: 'list_affiliate_groups',
  description: `List all affiliate groups. Groups are used to organize affiliates and can apply different commission rates or rules.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(affiliateGroupSchema).describe('List of affiliate groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listAffiliateGroups();

    let groups = results.map((r: any) => ({
      groupId: r.id,
      title: r.title,
      currency: r.currency
    }));

    return {
      output: { groups },
      message: `Found **${groups.length}** affiliate group(s).`
    };
  })
  .build();

export let createAffiliateGroup = SlateTool.create(spec, {
  name: 'Create Affiliate Group',
  key: 'create_affiliate_group',
  description: `Create a new affiliate group for organizing affiliates with shared commission rules or management purposes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the group'),
      currency: z.string().optional().describe('Currency code for the group')
    })
  )
  .output(affiliateGroupSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createAffiliateGroup(ctx.input);

    return {
      output: {
        groupId: result.id,
        title: result.title,
        currency: result.currency
      },
      message: `Created affiliate group **${result.title}** (\`${result.id}\`).`
    };
  })
  .build();

export let updateAffiliateGroup = SlateTool.create(spec, {
  name: 'Update Affiliate Group',
  key: 'update_affiliate_group',
  description: `Update an existing affiliate group's title.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to update'),
      title: z.string().optional().describe('New title for the group')
    })
  )
  .output(affiliateGroupSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.updateAffiliateGroup(ctx.input.groupId, {
      title: ctx.input.title
    });

    return {
      output: {
        groupId: result.id,
        title: result.title,
        currency: result.currency
      },
      message: `Updated affiliate group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
