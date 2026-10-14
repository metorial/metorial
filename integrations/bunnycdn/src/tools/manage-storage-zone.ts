import { createApiServiceError, SlateTool } from 'slates';
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
      custom404FilePath: z
        .string()
        .optional()
        .describe(
          'Path to the custom 404 file (update action). Use an empty string to disable it.'
        ),
      rewrite404To200: z
        .boolean()
        .optional()
        .describe('Return HTTP 200 for a custom 404 response (update action)'),
      customSsl404Enabled: z
        .boolean()
        .optional()
        .describe('Legacy setting. Use custom404FilePath or rewrite404To200 for update.')
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
    if (
      ['get', 'update', 'delete'].includes(ctx.input.action) &&
      (ctx.input.storageZoneId === undefined ||
        ctx.input.storageZoneId <= 0 ||
        !Number.isInteger(ctx.input.storageZoneId))
    )
      throw createApiServiceError('A positive storageZoneId is required for this action.');
    if (ctx.input.action === 'create' && !ctx.input.name?.trim())
      throw createApiServiceError('A name is required to create a storage zone.');
    if (ctx.input.action === 'update' && ctx.input.customSsl404Enabled !== undefined)
      throw createApiServiceError(
        'customSsl404Enabled is not a supported storage setting. Use custom404FilePath to select a custom error page, or rewrite404To200 to control its response status.'
      );
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
        let data = {
          Name: ctx.input.name!,
          Region: ctx.input.region ?? 'DE',
          ReplicationRegions: ctx.input.replicationRegions
        };
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
        if (ctx.input.replicationRegions) data.ReplicationZones = ctx.input.replicationRegions;
        if (ctx.input.originUrl !== undefined) data.OriginUrl = ctx.input.originUrl;
        if (ctx.input.custom404FilePath !== undefined)
          data.Custom404FilePath = ctx.input.custom404FilePath;
        if (ctx.input.rewrite404To200 !== undefined)
          data.Rewrite404To200 = ctx.input.rewrite404To200;

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
