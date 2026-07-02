import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

let storageZoneSchema = z
  .object({
    storageZoneId: z.number().describe('Unique ID of the storage zone'),
    name: z.string().describe('Name of the storage zone'),
    region: z.string().optional().describe('Primary region'),
    replicationRegions: z.array(z.string()).optional().describe('Replication regions'),
    filesStored: z.number().optional().describe('Number of files stored'),
    storageUsed: z.number().optional().describe('Storage used in bytes'),
    pullZoneId: z.number().optional().describe('Linked pull zone ID'),
    readOnlyPassword: z.string().optional().describe('Read-only password'),
    dateModified: z.string().optional().describe('Last modification date')
  })
  .passthrough();

export let manageStorageZone = SlateTool.create(spec, {
  name: 'Manage Storage Zone',
  key: 'manage_storage_zone',
  description: `Create, list, retrieve, update, or delete Edge Storage zones. Storage zones are containers for your files that can be replicated across multiple regions. Use this to manage your storage infrastructure, not for file operations (use the Storage Files tool for that).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      storageZoneId: z
        .number()
        .optional()
        .describe('Storage zone ID. Required for get, update, and delete.'),
      name: z.string().optional().describe('Name for the storage zone (create action)'),
      region: z
        .string()
        .optional()
        .describe('Primary storage region code, e.g. DE, NY, LA, SG, SYD (create action)'),
      replicationRegions: z
        .array(z.string())
        .optional()
        .describe('List of replication region codes (create/update)'),
      page: z.number().optional().describe('Page number (list action)'),
      perPage: z.number().optional().describe('Results per page (list action)'),
      originUrl: z.string().optional().describe('Custom origin URL (update action)'),
      customSsl404Enabled: z
        .boolean()
        .optional()
        .describe('Enable custom 404 page (update action)')
    })
  )
  .output(
    z.object({
      storageZone: storageZoneSchema.optional().describe('Storage zone details'),
      storageZones: z.array(storageZoneSchema).optional().describe('List of storage zones'),
      totalItems: z.number().optional().describe('Total number of storage zones'),
      currentPage: z.number().optional().describe('Current page number'),
      deleted: z.boolean().optional().describe('Whether the storage zone was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listStorageZones({
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        return {
          output: {
            storageZones: result.Items || [],
            totalItems: result.TotalItems,
            currentPage: result.CurrentPage
          },
          message: `Found **${result.TotalItems}** storage zones.`
        };
      }
      case 'get': {
        let zone = await client.getStorageZone(ctx.input.storageZoneId!);
        return {
          output: { storageZone: zone },
          message: `Retrieved storage zone **${zone.Name}** (ID: ${zone.Id}).`
        };
      }
      case 'create': {
        let data: any = { Name: ctx.input.name! };
        if (ctx.input.region) data.Region = ctx.input.region;
        if (ctx.input.replicationRegions)
          data.ReplicationRegions = ctx.input.replicationRegions;

        let zone = await client.createStorageZone(data);
        return {
          output: { storageZone: zone },
          message: `Created storage zone **${zone.Name}** (ID: ${zone.Id}).`
        };
      }
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.replicationRegions)
          data.ReplicationRegions = ctx.input.replicationRegions;
        if (ctx.input.originUrl !== undefined) data.OriginUrl = ctx.input.originUrl;
        if (ctx.input.customSsl404Enabled !== undefined)
          data.Custom404FilePath = ctx.input.customSsl404Enabled;

        let zone = await client.updateStorageZone(ctx.input.storageZoneId!, data);
        return {
          output: { storageZone: zone },
          message: `Updated storage zone **${ctx.input.storageZoneId}**.`
        };
      }
      case 'delete': {
        await client.deleteStorageZone(ctx.input.storageZoneId!);
        return {
          output: { deleted: true },
          message: `Deleted storage zone **${ctx.input.storageZoneId}**.`
        };
      }
    }
  })
  .build();
