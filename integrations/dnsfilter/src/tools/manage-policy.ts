import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePolicy = SlateTool.create(spec, {
  name: 'Manage Policy',
  key: 'manage_policy',
  description: `Create, update, or delete a DNS filtering policy. Policies control content filtering behavior including domain allow/block lists, category blocking, and application (AppAware) rules.
- To **create**: provide a name and optional settings.
- To **update**: provide policyId and the fields to change.
- To **delete**: provide policyId and set action to "delete".`,
  instructions: [
    'To add domains to the allow list, include them in allowListDomains. To add to block list, use blockListDomains.',
    'Category IDs can be retrieved using the List Categories tool.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      policyId: z.string().optional().describe('Policy ID (required for update/delete)'),
      name: z.string().optional().describe('Policy name (for create/update)'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID to associate with (for create)'),
      allowListDomains: z
        .array(z.string())
        .optional()
        .describe('Domains to add to the allow list (whitelist)'),
      blockListDomains: z
        .array(z.string())
        .optional()
        .describe('Domains to add to the block list (blacklist)'),
      blockedCategoryIds: z.array(z.string()).optional().describe('Category IDs to block'),
      blockedApplicationIds: z
        .array(z.string())
        .optional()
        .describe('Application IDs to block (AppAware)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional policy attributes to set')
    })
  )
  .output(
    z.object({
      policy: z
        .record(z.string(), z.any())
        .optional()
        .describe('Policy details (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the policy was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, policyId } = ctx.input;

    if (action === 'delete') {
      if (!policyId) throw new Error('policyId is required for delete');
      await client.deletePolicy(policyId);
      return {
        output: { deleted: true },
        message: `Deleted policy **${policyId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.organizationId) params.organization_id = ctx.input.organizationId;
    if (ctx.input.allowListDomains) params.whitelist_domains = ctx.input.allowListDomains;
    if (ctx.input.blockListDomains) params.blacklist_domains = ctx.input.blockListDomains;
    if (ctx.input.blockedCategoryIds) params.blocked_categories = ctx.input.blockedCategoryIds;
    if (ctx.input.blockedApplicationIds)
      params.blocked_applications = ctx.input.blockedApplicationIds;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    if (action === 'create') {
      let policy = await client.createPolicy(params);
      return {
        output: { policy },
        message: `Created policy **${policy.name ?? 'new policy'}**.`
      };
    }

    if (!policyId) throw new Error('policyId is required for update');
    let policy = await client.updatePolicy(policyId, params);
    return {
      output: { policy },
      message: `Updated policy **${policy.name ?? policyId}**.`
    };
  })
  .build();
