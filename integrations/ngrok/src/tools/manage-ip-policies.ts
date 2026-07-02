import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let policyOutputSchema = z.object({
  policyId: z.string().describe('IP policy ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata')
});

let mapPolicy = (p: any) => ({
  policyId: p.id,
  uri: p.uri || '',
  createdAt: p.created_at || '',
  description: p.description || '',
  metadata: p.metadata || ''
});

let ruleOutputSchema = z.object({
  ruleId: z.string().describe('IP policy rule ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  cidr: z.string().describe('CIDR range'),
  action: z.string().describe('Action (allow or deny)'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  ipPolicyId: z.string().describe('Parent IP policy ID')
});

let mapRule = (r: any) => ({
  ruleId: r.id,
  uri: r.uri || '',
  createdAt: r.created_at || '',
  cidr: r.cidr || '',
  action: r.action || '',
  description: r.description || '',
  metadata: r.metadata || '',
  ipPolicyId: r.ip_policy?.id || ''
});

export let listIpPolicies = SlateTool.create(spec, {
  name: 'List IP Policies',
  key: 'list_ip_policies',
  description: `List all IP policies. IP policies are reusable groups of CIDR ranges with allow or deny actions that can restrict access to your API, agent connections, or endpoints.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      policies: z.array(policyOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listIpPolicies({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let policies = (result.ip_policies || []).map(mapPolicy);
    return {
      output: { policies, nextPageUri: result.next_page_uri || null },
      message: `Found **${policies.length}** IP policy/policies.`
    };
  })
  .build();

export let getIpPolicy = SlateTool.create(spec, {
  name: 'Get IP Policy',
  key: 'get_ip_policy',
  description: `Retrieve details of a specific IP policy by ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      policyId: z.string().describe('IP policy ID (e.g., ipp_xxx)')
    })
  )
  .output(policyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let p = await client.getIpPolicy(ctx.input.policyId);
    return {
      output: mapPolicy(p),
      message: `Retrieved IP policy **${p.id}**.`
    };
  })
  .build();

export let createIpPolicy = SlateTool.create(spec, {
  name: 'Create IP Policy',
  key: 'create_ip_policy',
  description: `Create a new IP policy. After creating a policy, add CIDR rules to it using the "Add IP Policy Rule" tool, then apply the policy to restrict access to endpoints, API, agent connections, or the dashboard.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(policyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let p = await client.createIpPolicy({
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapPolicy(p),
      message: `Created IP policy **${p.id}**. Add rules using the "Add IP Policy Rule" tool.`
    };
  })
  .build();

export let updateIpPolicy = SlateTool.create(spec, {
  name: 'Update IP Policy',
  key: 'update_ip_policy',
  description: `Update an IP policy's description or metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      policyId: z.string().describe('IP policy ID to update'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata')
    })
  )
  .output(policyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let p = await client.updateIpPolicy(ctx.input.policyId, {
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapPolicy(p),
      message: `Updated IP policy **${p.id}**.`
    };
  })
  .build();

export let deleteIpPolicy = SlateTool.create(spec, {
  name: 'Delete IP Policy',
  key: 'delete_ip_policy',
  description: `Delete an IP policy and all its associated rules.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      policyId: z.string().describe('IP policy ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteIpPolicy(ctx.input.policyId);
    return {
      output: { success: true },
      message: `Deleted IP policy **${ctx.input.policyId}**.`
    };
  })
  .build();

export let listIpPolicyRules = SlateTool.create(spec, {
  name: 'List IP Policy Rules',
  key: 'list_ip_policy_rules',
  description: `List all IP policy rules across all policies. Rules are individual CIDR entries with allow or deny actions.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      rules: z.array(ruleOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listIpPolicyRules({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let rules = (result.ip_policy_rules || []).map(mapRule);
    return {
      output: { rules, nextPageUri: result.next_page_uri || null },
      message: `Found **${rules.length}** IP policy rule(s).`
    };
  })
  .build();

export let createIpPolicyRule = SlateTool.create(spec, {
  name: 'Add IP Policy Rule',
  key: 'create_ip_policy_rule',
  description: `Add a CIDR rule to an IP policy. Each rule specifies a CIDR range and whether to allow or deny traffic from that range.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      ipPolicyId: z.string().describe('IP policy ID to add the rule to'),
      cidr: z.string().describe('CIDR range (e.g., "10.0.0.0/8", "2001:db8::/32")'),
      action: z
        .enum(['allow', 'deny'])
        .describe('Whether to allow or deny traffic from this CIDR'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(ruleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let r = await client.createIpPolicyRule({
      ipPolicyId: ctx.input.ipPolicyId,
      cidr: ctx.input.cidr,
      action: ctx.input.action,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapRule(r),
      message: `Added **${r.action}** rule for CIDR **${r.cidr}** to policy ${r.ip_policy?.id || ctx.input.ipPolicyId}.`
    };
  })
  .build();

export let deleteIpPolicyRule = SlateTool.create(spec, {
  name: 'Delete IP Policy Rule',
  key: 'delete_ip_policy_rule',
  description: `Remove a CIDR rule from an IP policy.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      ruleId: z.string().describe('IP policy rule ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteIpPolicyRule(ctx.input.ruleId);
    return {
      output: { success: true },
      message: `Deleted IP policy rule **${ctx.input.ruleId}**.`
    };
  })
  .build();
