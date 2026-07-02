import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { invalidAction, requireString, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

let tagSchema = z.object({
  key: z.string().describe('Tag key between 1 and 255 characters.'),
  value: z.string().describe('Tag value between 1 and 255 characters.')
});

export let manageFlexClusterTool = SlateTool.create(spec, {
  name: 'Manage Flex Cluster',
  key: 'manage_flex_cluster',
  description: `Create, update, list, retrieve, or delete MongoDB Atlas Flex clusters. Flex clusters use the current Atlas flexClusters API for low-cost, elastic deployments separate from dedicated cluster endpoints.`,
  instructions: [
    'For create, provide clusterName, backingProviderName, and regionName.',
    'For update, Atlas currently supports tags and terminationProtectionEnabled.',
    'For delete, disable termination protection first if it is enabled.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform. Source-specific fields are validated at runtime.'),
      clusterName: z
        .string()
        .optional()
        .describe('Flex cluster name. Required for get/create/update/delete.'),
      backingProviderName: z
        .enum(['AWS', 'AZURE', 'GCP'])
        .optional()
        .describe('Cloud provider backing the flex cluster. Required for create.'),
      regionName: z.string().optional().describe('Atlas region name. Required for create.'),
      terminationProtectionEnabled: z
        .boolean()
        .optional()
        .describe('Whether Atlas prevents deleting this flex cluster.'),
      tags: z.array(tagSchema).optional().describe('Tags to set on create or update.')
    })
  )
  .output(
    z.object({
      cluster: z.any().optional().describe('Flex cluster details'),
      clusters: z.array(z.any()).optional().describe('Flex clusters in the project'),
      totalCount: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listFlexClusters(projectId);
      let clusters = result.results || [];
      return {
        output: { clusters, totalCount: result.totalCount || clusters.length },
        message: `Found **${clusters.length}** flex cluster(s) in project.`
      };
    }

    let clusterName = requireString(ctx.input.clusterName, 'clusterName', 'for this action');

    if (action === 'get') {
      let cluster = await client.getFlexCluster(projectId, clusterName);
      return {
        output: { cluster },
        message: `Retrieved flex cluster **${clusterName}** (state: ${cluster.stateName}).`
      };
    }

    if (action === 'create') {
      let backingProviderName = requireString(
        ctx.input.backingProviderName,
        'backingProviderName',
        'for create'
      );
      let regionName = requireString(ctx.input.regionName, 'regionName', 'for create');
      let data: any = {
        name: clusterName,
        providerSettings: {
          backingProviderName,
          regionName
        }
      };
      if (ctx.input.tags) data.tags = ctx.input.tags;
      if (ctx.input.terminationProtectionEnabled !== undefined) {
        data.terminationProtectionEnabled = ctx.input.terminationProtectionEnabled;
      }

      let cluster = await client.createFlexCluster(projectId, data);
      return {
        output: { cluster },
        message: `Flex cluster **${clusterName}** creation initiated (state: ${cluster.stateName}).`
      };
    }

    if (action === 'update') {
      let data: any = {};
      if (ctx.input.tags) data.tags = ctx.input.tags;
      if (ctx.input.terminationProtectionEnabled !== undefined) {
        data.terminationProtectionEnabled = ctx.input.terminationProtectionEnabled;
      }

      let cluster = await client.updateFlexCluster(projectId, clusterName, data);
      return {
        output: { cluster },
        message: `Flex cluster **${clusterName}** update initiated.`
      };
    }

    if (action === 'delete') {
      await client.deleteFlexCluster(projectId, clusterName);
      return {
        output: { deleted: true },
        message: `Flex cluster **${clusterName}** deletion initiated.`
      };
    }

    return invalidAction(action);
  })
  .build();
