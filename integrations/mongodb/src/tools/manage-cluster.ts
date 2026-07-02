import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let replicationSpecSchema = z
  .object({
    zoneName: z.string().optional().describe('Name for the zone'),
    regionConfigs: z
      .array(
        z.object({
          providerName: z.string().describe('Cloud provider (AWS, AZURE, GCP)'),
          regionName: z.string().describe('Cloud region name'),
          priority: z.number().optional().describe('Election priority (1-7, 7 = highest)'),
          electableSpecs: z
            .object({
              instanceSize: z.string().describe('Instance tier (e.g., M10, M20, M30)'),
              nodeCount: z.number().optional().describe('Number of electable nodes'),
              diskSizeGB: z.number().optional().describe('Disk size in GB'),
              diskIOPS: z.number().optional().describe('Provisioned IOPS'),
              ebsVolumeType: z
                .string()
                .optional()
                .describe('EBS volume type (STANDARD, PROVISIONED)')
            })
            .optional(),
          readOnlySpecs: z
            .object({
              instanceSize: z.string().optional(),
              nodeCount: z.number().optional()
            })
            .optional(),
          analyticsSpecs: z
            .object({
              instanceSize: z.string().optional(),
              nodeCount: z.number().optional()
            })
            .optional(),
          autoScaling: z
            .object({
              compute: z
                .object({
                  enabled: z.boolean().optional(),
                  scaleDownEnabled: z.boolean().optional(),
                  minInstanceSize: z.string().optional(),
                  maxInstanceSize: z.string().optional()
                })
                .optional(),
              diskGBEnabled: z.boolean().optional()
            })
            .optional()
        })
      )
      .optional()
  })
  .optional();

export let manageClusterTool = SlateTool.create(spec, {
  name: 'Manage Cluster',
  key: 'manage_cluster',
  description: `Create, update, delete, pause, or resume a MongoDB Atlas cluster. Supports configuring cloud provider, region, instance tier, auto-scaling, replication, and sharding settings. Also supports getting detailed cluster information.`,
  instructions: [
    'For create, at minimum provide clusterName, clusterType, and replicationSpecs with provider, region, and instance size.',
    'For pause/resume, only M10+ dedicated clusters can be paused.',
    'For update, only pass fields you want to change in the replicationSpecs or top-level settings.'
  ],
  constraints: [
    'Cluster names must be unique within a project and can only contain ASCII letters, numbers, and hyphens.',
    'Free-tier (M0) and Flex clusters cannot be paused.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete', 'pause', 'resume'])
        .describe('Action to perform on the cluster'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      clusterName: z.string().describe('Name of the cluster'),
      clusterType: z
        .enum(['REPLICASET', 'SHARDED', 'GEOSHARDED'])
        .optional()
        .describe('Cluster type (required for create)'),
      mongoDBMajorVersion: z
        .string()
        .optional()
        .describe('MongoDB major version (e.g., "7.0", "8.0")'),
      diskSizeGB: z.number().optional().describe('Storage capacity in GB'),
      backupEnabled: z.boolean().optional().describe('Whether cloud backup is enabled'),
      terminationProtectionEnabled: z
        .boolean()
        .optional()
        .describe('Prevent accidental cluster deletion'),
      replicationSpecs: z
        .array(replicationSpecSchema)
        .optional()
        .describe('Replication and region configuration'),
      tags: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Resource tags')
    })
  )
  .output(
    z.object({
      clusterName: z.string().optional().describe('Name of the cluster'),
      clusterType: z.string().optional().describe('Cluster type'),
      stateName: z.string().optional().describe('Current cluster state'),
      mongoDBVersion: z.string().optional().describe('MongoDB version'),
      paused: z.boolean().optional().describe('Whether the cluster is paused'),
      connectionString: z.string().optional().describe('SRV connection string'),
      createDate: z.string().optional().describe('ISO 8601 creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the cluster was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw mongodbServiceError('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'get') {
      let cluster = await client.getCluster(projectId, ctx.input.clusterName);
      return {
        output: {
          clusterName: cluster.name,
          clusterType: cluster.clusterType,
          stateName: cluster.stateName,
          mongoDBVersion: cluster.mongoDBVersion,
          paused: cluster.paused ?? false,
          connectionString: cluster.connectionStrings?.standardSrv,
          createDate: cluster.createDate
        },
        message: `Cluster **${cluster.name}** is in state **${cluster.stateName}** (MongoDB ${cluster.mongoDBVersion}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.clusterType)
        throw mongodbServiceError('clusterType is required for create');
      let payload: Record<string, any> = {
        name: ctx.input.clusterName,
        clusterType: ctx.input.clusterType
      };
      if (ctx.input.replicationSpecs) payload.replicationSpecs = ctx.input.replicationSpecs;
      if (ctx.input.mongoDBMajorVersion)
        payload.mongoDBMajorVersion = ctx.input.mongoDBMajorVersion;
      if (ctx.input.diskSizeGB) payload.diskSizeGB = ctx.input.diskSizeGB;
      if (ctx.input.backupEnabled !== undefined)
        payload.backupEnabled = ctx.input.backupEnabled;
      if (ctx.input.terminationProtectionEnabled !== undefined)
        payload.terminationProtectionEnabled = ctx.input.terminationProtectionEnabled;
      if (ctx.input.tags) payload.tags = ctx.input.tags;

      let cluster = await client.createCluster(projectId, payload);
      return {
        output: {
          clusterName: cluster.name,
          clusterType: cluster.clusterType,
          stateName: cluster.stateName,
          mongoDBVersion: cluster.mongoDBVersion || cluster.mongoDBMajorVersion,
          paused: false,
          createDate: cluster.createDate
        },
        message: `Creating cluster **${cluster.name}**. Current state: ${cluster.stateName}.`
      };
    }

    if (ctx.input.action === 'update') {
      let payload: Record<string, any> = {};
      if (ctx.input.replicationSpecs) payload.replicationSpecs = ctx.input.replicationSpecs;
      if (ctx.input.mongoDBMajorVersion)
        payload.mongoDBMajorVersion = ctx.input.mongoDBMajorVersion;
      if (ctx.input.diskSizeGB) payload.diskSizeGB = ctx.input.diskSizeGB;
      if (ctx.input.backupEnabled !== undefined)
        payload.backupEnabled = ctx.input.backupEnabled;
      if (ctx.input.terminationProtectionEnabled !== undefined)
        payload.terminationProtectionEnabled = ctx.input.terminationProtectionEnabled;
      if (ctx.input.tags) payload.tags = ctx.input.tags;

      let cluster = await client.updateCluster(projectId, ctx.input.clusterName, payload);
      return {
        output: {
          clusterName: cluster.name,
          clusterType: cluster.clusterType,
          stateName: cluster.stateName,
          mongoDBVersion: cluster.mongoDBVersion,
          paused: cluster.paused ?? false,
          connectionString: cluster.connectionStrings?.standardSrv,
          createDate: cluster.createDate
        },
        message: `Updated cluster **${cluster.name}**. Current state: ${cluster.stateName}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteCluster(projectId, ctx.input.clusterName);
      return {
        output: {
          clusterName: ctx.input.clusterName,
          deleted: true
        },
        message: `Deleting cluster **${ctx.input.clusterName}**.`
      };
    }

    if (ctx.input.action === 'pause') {
      let cluster = await client.updateCluster(projectId, ctx.input.clusterName, {
        paused: true
      });
      return {
        output: {
          clusterName: cluster.name,
          stateName: cluster.stateName,
          paused: true
        },
        message: `Pausing cluster **${cluster.name}**.`
      };
    }

    if (ctx.input.action === 'resume') {
      let cluster = await client.updateCluster(projectId, ctx.input.clusterName, {
        paused: false
      });
      return {
        output: {
          clusterName: cluster.name,
          stateName: cluster.stateName,
          paused: false
        },
        message: `Resuming cluster **${cluster.name}**.`
      };
    }

    throw mongodbServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
