import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination, mapPolicySet } from '../lib/mappers';
import { spec } from '../spec';

let policySetSchema = z.object({
  policySetId: z.string(),
  name: z.string(),
  description: z.string(),
  global: z.boolean(),
  kind: z.string(),
  policyCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listPolicySetsTool = SlateTool.create(spec, {
  name: 'List Policy Sets',
  key: 'list_policy_sets',
  description: `List policy sets configured in the organization. Policy sets contain Sentinel or OPA policies that are enforced on runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search policy sets by name'),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      policySets: z.array(policySetSchema),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listPolicySets({
      search: ctx.input.search,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let policySets = (response.data || []).map(mapPolicySet);
    let pagination = mapPagination(response.meta);

    return {
      output: { policySets, pagination },
      message: `Found **${pagination.totalCount}** policy set(s).`
    };
  })
  .build();

export let createPolicySetTool = SlateTool.create(spec, {
  name: 'Create Policy Set',
  key: 'create_policy_set',
  description: `Create a new policy set using Sentinel or OPA. Apply it globally or scope it to specific workspaces and projects. Optionally connect to a VCS repository containing policy code.`,
  instructions: [
    'Set global to true to enforce on all workspaces, or scope to specific workspaceIds/projectIds.',
    'Kind must match the policy framework: "sentinel" or "opa".'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the policy set'),
      description: z.string().optional().describe('Description of the policy set'),
      global: z
        .boolean()
        .optional()
        .describe('Whether to apply globally to all workspaces (default: false)'),
      kind: z.enum(['sentinel', 'opa']).optional().describe('Policy framework to use'),
      overridable: z.boolean().optional().describe('Whether policies can be overridden'),
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Workspace IDs to scope the policy set to'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Project IDs to scope the policy set to'),
      vcsRepo: z
        .object({
          identifier: z.string().describe('VCS repository identifier (e.g., "owner/repo")'),
          oauthTokenId: z.string().describe('OAuth token ID for VCS connection'),
          branch: z.string().optional().describe('Branch to track'),
          ingressSubmodules: z.boolean().optional().describe('Whether to fetch submodules')
        })
        .optional()
        .describe('VCS repository containing policy code')
    })
  )
  .output(policySetSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createPolicySet(ctx.input);
    let policySet = mapPolicySet(response.data);

    return {
      output: policySet,
      message: `Created policy set **${policySet.name}** (${policySet.policySetId}), kind: ${policySet.kind}, global: ${policySet.global}.`
    };
  })
  .build();

export let deletePolicySetTool = SlateTool.create(spec, {
  name: 'Delete Policy Set',
  key: 'delete_policy_set',
  description: `Permanently delete a policy set. This stops enforcement of all policies in the set.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      policySetId: z.string().describe('The policy set ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deletePolicySet(ctx.input.policySetId);

    return {
      output: { deleted: true },
      message: `Policy set ${ctx.input.policySetId} has been deleted.`
    };
  })
  .build();
