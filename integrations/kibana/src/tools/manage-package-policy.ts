import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let packagePolicyOutputSchema = z.object({
  packagePolicyId: z.string().describe('Package policy ID'),
  name: z.string().optional().describe('Package policy name'),
  namespace: z.string().optional().describe('Policy namespace'),
  enabled: z.boolean().optional().describe('Whether the package policy is enabled'),
  packageName: z.string().optional().describe('Elastic package name'),
  packageVersion: z.string().optional().describe('Elastic package version'),
  policyIds: z.array(z.string()).optional().describe('Assigned Fleet agent policy IDs'),
  agentCount: z.number().optional().describe('Number of agents using the package policy'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  packagePolicy: z
    .record(z.string(), z.any())
    .optional()
    .describe('Raw package policy returned by Kibana'),
  deleted: z.boolean().optional().describe('Whether the package policy was deleted')
});

let mapPackagePolicy = (policy: any) => ({
  packagePolicyId: policy.id,
  name: policy.name,
  namespace: policy.namespace,
  enabled: policy.enabled,
  packageName: policy.package?.name,
  packageVersion: policy.package?.version,
  policyIds: policy.policy_ids,
  agentCount: policy.agents,
  updatedAt: policy.updated_at,
  createdAt: policy.created_at,
  packagePolicy: policy
});

export let listPackagePolicies = SlateTool.create(spec, {
  name: 'List Package Policies',
  key: 'list_package_policies',
  description: `List Fleet package policies in Kibana. Package policies attach Elastic integrations, such as Nginx or System, to Fleet agent policies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      kuery: z.string().optional().describe('KQL query string to filter results'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Number of results per page'),
      sortField: z.string().optional().describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      showUpgradeable: z
        .boolean()
        .optional()
        .describe('Only show package policies with available upgrades'),
      format: z.enum(['simplified', 'legacy']).optional().describe('Response format'),
      withAgentCount: z.boolean().optional().describe('Include agent counts')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of package policies'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      packagePolicies: z.array(packagePolicyOutputSchema).describe('Package policies')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getPackagePolicies({
      kuery: ctx.input.kuery,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder,
      showUpgradeable: ctx.input.showUpgradeable,
      format: ctx.input.format,
      withAgentCount: ctx.input.withAgentCount
    });

    let packagePolicies = (result.items ?? []).map(mapPackagePolicy);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? 20,
        packagePolicies
      },
      message: `Found **${result.total ?? 0}** package policies.`
    };
  })
  .build();

export let managePackagePolicy = SlateTool.create(spec, {
  name: 'Manage Package Policy',
  key: 'manage_package_policy',
  description: `Get, create, update, or delete a Fleet package policy. Package policies attach Elastic integration packages to Fleet agent policies. Provide packagePolicy as the raw Kibana package policy request body for create and update.`,
  instructions: [
    'Use list_package_policies to find existing packagePolicyId values.',
    'For create and update, packagePolicy should match Kibana API fields such as name, namespace, package, policy_ids, inputs, and enabled.',
    'Deleting requires Fleet agent policy and integrations privileges.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      packagePolicyId: z
        .string()
        .optional()
        .describe('Package policy ID. Required for get, update, and delete.'),
      packagePolicy: z
        .record(z.string(), z.any())
        .optional()
        .describe('Raw package policy request body. Required for create and update.'),
      format: z.enum(['simplified', 'legacy']).optional().describe('Response format'),
      force: z
        .boolean()
        .optional()
        .describe('Force delete a managed package policy. Applies to delete only.')
    })
  )
  .output(packagePolicyOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, packagePolicyId, packagePolicy, format, force } = ctx.input;

    if (action === 'get') {
      if (!packagePolicyId) {
        throw kibanaServiceError('packagePolicyId is required for get action');
      }

      let result = await client.getPackagePolicy(packagePolicyId);
      return {
        output: mapPackagePolicy(result.item ?? result),
        message: `Retrieved package policy \`${packagePolicyId}\`.`
      };
    }

    if (action === 'create') {
      if (!packagePolicy) {
        throw kibanaServiceError('packagePolicy is required for create action');
      }

      let result = await client.createPackagePolicy(packagePolicy, format);
      let policy = result.item ?? result;
      return {
        output: mapPackagePolicy(policy),
        message: `Created package policy \`${policy.name ?? policy.id}\`.`
      };
    }

    if (action === 'update') {
      if (!packagePolicyId) {
        throw kibanaServiceError('packagePolicyId is required for update action');
      }
      if (!packagePolicy) {
        throw kibanaServiceError('packagePolicy is required for update action');
      }

      let result = await client.updatePackagePolicy(packagePolicyId, packagePolicy, format);
      let policy = result.item ?? result;
      return {
        output: mapPackagePolicy(policy),
        message: `Updated package policy \`${packagePolicyId}\`.`
      };
    }

    if (action === 'delete') {
      if (!packagePolicyId) {
        throw kibanaServiceError('packagePolicyId is required for delete action');
      }

      let result = await client.deletePackagePolicy(packagePolicyId, force);
      return {
        output: {
          packagePolicyId: result.id ?? packagePolicyId,
          deleted: true
        },
        message: `Deleted package policy \`${packagePolicyId}\`.`
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();
