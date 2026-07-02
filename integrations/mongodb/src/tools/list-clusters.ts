import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let clusterSummarySchema = z.object({
  clusterName: z.string().describe('Name of the cluster'),
  clusterType: z.string().describe('Type of cluster (REPLICASET, SHARDED, GEOSHARDED)'),
  stateName: z
    .string()
    .describe('Current state (IDLE, CREATING, UPDATING, DELETING, REPAIRING, etc.)'),
  mongoDBVersion: z.string().describe('MongoDB version running on the cluster'),
  paused: z.boolean().describe('Whether the cluster is paused'),
  connectionString: z
    .string()
    .optional()
    .describe('Standard connection string for the cluster'),
  providerName: z.string().optional().describe('Cloud provider (AWS, AZURE, GCP, TENANT)'),
  regionName: z.string().optional().describe('Primary cloud region'),
  instanceSize: z.string().optional().describe('Instance tier (e.g., M10, M20, M30)'),
  diskSizeGB: z.number().optional().describe('Storage capacity in GB'),
  createDate: z.string().optional().describe('ISO 8601 creation timestamp')
});

export let listClustersTool = SlateTool.create(spec, {
  name: 'List Clusters',
  key: 'list_clusters',
  description: `List all database clusters in a MongoDB Atlas project. Returns cluster names, states, configurations, and connection strings. Use the configured projectId or provide one explicitly.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId if omitted.')
    })
  )
  .output(
    z.object({
      clusters: z.array(clusterSummarySchema).describe('List of clusters in the project'),
      totalCount: z.number().describe('Total number of clusters')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required');

    let client = new AtlasClient(ctx.auth);
    let result = await client.listClusters(projectId);

    let clusters = (result.results || []).map((c: any) => {
      let replicationSpec = c.replicationSpecs?.[0];
      let regionConfig = replicationSpec?.regionConfigs?.[0];

      return {
        clusterName: c.name,
        clusterType: c.clusterType || 'REPLICASET',
        stateName: c.stateName || 'UNKNOWN',
        mongoDBVersion: c.mongoDBVersion || c.mongoDBMajorVersion || '',
        paused: c.paused ?? false,
        connectionString: c.connectionStrings?.standardSrv || c.connectionStrings?.standard,
        providerName: regionConfig?.providerName || c.providerSettings?.providerName,
        regionName: regionConfig?.regionName || c.providerSettings?.regionName,
        instanceSize:
          regionConfig?.electableSpecs?.instanceSize || c.providerSettings?.instanceSizeName,
        diskSizeGB: c.diskSizeGB,
        createDate: c.createDate
      };
    });

    return {
      output: {
        clusters,
        totalCount: result.totalCount ?? clusters.length
      },
      message: `Found **${clusters.length}** cluster(s) in project ${projectId}.`
    };
  })
  .build();
