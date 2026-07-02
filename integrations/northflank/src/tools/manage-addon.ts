import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAddon = SlateTool.create(spec, {
  name: 'Manage Addon',
  key: 'manage_addon',
  description: `Create, get, delete, or back up a database/storage addon. Supports PostgreSQL, MongoDB, MySQL, Redis, MinIO, and RabbitMQ. Can also retrieve addon credentials and backup history.`,
  instructions: [
    'Use action "create" to provision a new addon. Specify type (e.g. postgresql), version, plan, storage, and replicas.',
    'Use action "get" to retrieve addon details and status.',
    'Use action "credentials" to get connection credentials for the addon.',
    'Use action "backup" to trigger a backup, or "list_backups" to see backup history.',
    'Use action "delete" to permanently remove an addon.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'delete', 'credentials', 'backup', 'list_backups'])
        .describe('Operation to perform'),
      projectId: z.string().describe('Project ID the addon belongs to'),
      addonId: z
        .string()
        .optional()
        .describe('Addon ID (required for get, delete, credentials, backup, list_backups)'),
      name: z.string().optional().describe('Addon name (required for create)'),
      description: z.string().optional().describe('Addon description'),
      addonType: z
        .string()
        .optional()
        .describe(
          'Addon type identifier, e.g. postgresql, mongodb, mysql, redis, minio, rabbitmq (required for create)'
        ),
      version: z
        .string()
        .optional()
        .describe('Addon version, e.g. "latest" or "15-latest" (required for create)'),
      deploymentPlan: z
        .string()
        .optional()
        .describe('Billing deployment plan ID (required for create)'),
      storageMb: z.number().optional().describe('Storage size in MB (required for create)'),
      replicas: z.number().optional().describe('Number of replicas (required for create)'),
      tlsEnabled: z.boolean().optional().describe('Enable TLS for the addon'),
      externalAccessEnabled: z
        .boolean()
        .optional()
        .describe('Enable external access for the addon'),
      tags: z.array(z.string()).optional().describe('Tags for the addon')
    })
  )
  .output(
    z.object({
      addonId: z.string().optional().describe('Addon ID'),
      name: z.string().optional().describe('Addon name'),
      status: z.string().optional().describe('Addon status'),
      credentials: z
        .record(z.string(), z.any())
        .optional()
        .describe('Connection credentials for the addon'),
      backups: z
        .array(
          z.object({
            backupId: z.string().describe('Backup ID'),
            status: z.string().optional().describe('Backup status'),
            createdAt: z.string().optional().describe('Backup creation timestamp')
          })
        )
        .optional()
        .describe('List of addon backups'),
      deleted: z.boolean().optional().describe('Whether the addon was deleted'),
      backupTriggered: z.boolean().optional().describe('Whether a backup was triggered'),
      hasNextPage: z.boolean().optional().describe('Whether more backup results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, projectId, addonId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating an addon');
      if (!ctx.input.addonType) throw new Error('addonType is required for creating an addon');
      if (!ctx.input.version) throw new Error('version is required for creating an addon');
      if (!ctx.input.deploymentPlan)
        throw new Error('deploymentPlan is required for creating an addon');
      if (!ctx.input.storageMb) throw new Error('storageMb is required for creating an addon');

      let result = await client.createAddon(projectId, {
        name: ctx.input.name,
        description: ctx.input.description,
        type: ctx.input.addonType,
        version: ctx.input.version,
        billing: {
          deploymentPlan: ctx.input.deploymentPlan,
          storage: ctx.input.storageMb,
          replicas: ctx.input.replicas || 1
        },
        tags: ctx.input.tags,
        tlsEnabled: ctx.input.tlsEnabled,
        externalAccessEnabled: ctx.input.externalAccessEnabled
      });
      return {
        output: {
          addonId: result?.id,
          name: result?.name,
          status: result?.status
        },
        message: `Addon **${ctx.input.name}** (${ctx.input.addonType}) created in project **${projectId}**.`
      };
    }

    if (action === 'get') {
      if (!addonId) throw new Error('addonId is required');
      let result = await client.getAddon(projectId, addonId);
      return {
        output: {
          addonId: result?.id,
          name: result?.name,
          status: result?.status
        },
        message: `Addon **${result?.name}** — status: ${result?.status}.`
      };
    }

    if (action === 'credentials') {
      if (!addonId) throw new Error('addonId is required');
      let result = await client.getAddonCredentials(projectId, addonId);
      return {
        output: {
          addonId,
          credentials: result
        },
        message: `Retrieved credentials for addon **${addonId}**.`
      };
    }

    if (action === 'backup') {
      if (!addonId) throw new Error('addonId is required');
      await client.backupAddon(projectId, addonId);
      return {
        output: {
          addonId,
          backupTriggered: true
        },
        message: `Backup triggered for addon **${addonId}**.`
      };
    }

    if (action === 'list_backups') {
      if (!addonId) throw new Error('addonId is required');
      let result = await client.listAddonBackups(projectId, addonId);
      let backups = (result.data?.backups || []).map((b: any) => ({
        backupId: b.id,
        status: b.status,
        createdAt: b.createdAt
      }));
      return {
        output: {
          addonId,
          backups,
          hasNextPage: result.pagination.hasNextPage
        },
        message: `Found **${backups.length}** backup(s) for addon **${addonId}**.`
      };
    }

    if (action === 'delete') {
      if (!addonId) throw new Error('addonId is required');
      await client.deleteAddon(projectId, addonId);
      return {
        output: {
          addonId,
          deleted: true
        },
        message: `Addon **${addonId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
