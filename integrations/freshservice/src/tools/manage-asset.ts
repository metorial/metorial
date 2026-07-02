import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAsset = SlateTool.create(spec, {
  name: 'Create Asset',
  key: 'create_asset',
  description: `Create a new asset in Freshservice. Requires a name and asset type ID at minimum.

Impact values: "low", "medium", "high".
Usage Type values: "permanent", "loaner".`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the asset'),
      assetTypeId: z.number().describe('ID of the asset type'),
      description: z.string().optional().describe('Description of the asset'),
      assetTag: z.string().optional().describe('Asset tag identifier'),
      impact: z.string().optional().describe('Impact: "low", "medium", "high"'),
      usageType: z.string().optional().describe('Usage type: "permanent", "loaner"'),
      agentId: z.number().optional().describe('ID of the agent using the asset'),
      departmentId: z.number().optional().describe('Department ID'),
      locationId: z.number().optional().describe('Location ID'),
      groupId: z.number().optional().describe('Group ID'),
      assignedOn: z.string().optional().describe('Assignment date (ISO 8601)'),
      typeFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Asset type-specific fields')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the created asset'),
      name: z.string().describe('Name of the asset'),
      assetTag: z.string().nullable().describe('Asset tag'),
      assetTypeId: z.number().describe('Asset type ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let asset = await client.createAsset(ctx.input);

    return {
      output: {
        assetId: asset.id,
        name: asset.name,
        assetTag: asset.asset_tag,
        assetTypeId: asset.asset_type_id,
        createdAt: asset.created_at
      },
      message: `Created asset **#${asset.id}**: "${asset.name}"`
    };
  })
  .build();

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve a single asset by its ID with all details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.number().describe('ID of the asset')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the asset'),
      name: z.string().describe('Name'),
      description: z.string().nullable().describe('Description'),
      assetTag: z.string().nullable().describe('Asset tag'),
      assetTypeId: z.number().describe('Asset type ID'),
      impact: z.string().nullable().describe('Impact level'),
      usageType: z.string().nullable().describe('Usage type'),
      userId: z.number().nullable().describe('User/agent ID using the asset'),
      departmentId: z.number().nullable().describe('Department ID'),
      locationId: z.number().nullable().describe('Location ID'),
      groupId: z.number().nullable().describe('Group ID'),
      assignedOn: z.string().nullable().describe('Assignment date'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let asset = await client.getAsset(ctx.input.assetId);

    return {
      output: {
        assetId: asset.id,
        name: asset.name,
        description: asset.description,
        assetTag: asset.asset_tag,
        assetTypeId: asset.asset_type_id,
        impact: asset.impact,
        usageType: asset.usage_type,
        userId: asset.user_id,
        departmentId: asset.department_id,
        locationId: asset.location_id,
        groupId: asset.group_id,
        assignedOn: asset.assigned_on,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at
      },
      message: `Retrieved asset **#${asset.id}**: "${asset.name}"`
    };
  })
  .build();

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List assets in Freshservice with pagination. Optionally include type fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      include: z.string().optional().describe('Embed additional info: "type_fields"'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 30, max: 100)')
    })
  )
  .output(
    z.object({
      assets: z.array(
        z.object({
          assetId: z.number().describe('ID'),
          name: z.string().describe('Name'),
          assetTag: z.string().nullable().describe('Asset tag'),
          assetTypeId: z.number().describe('Asset type ID'),
          impact: z.string().nullable().describe('Impact'),
          userId: z.number().nullable().describe('User ID'),
          departmentId: z.number().nullable().describe('Department ID'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listAssets(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.include
    );

    let assets = result.assets.map((a: Record<string, unknown>) => ({
      assetId: a.id as number,
      name: a.name as string,
      assetTag: a.asset_tag as string | null,
      assetTypeId: a.asset_type_id as number,
      impact: a.impact as string | null,
      userId: a.user_id as number | null,
      departmentId: a.department_id as number | null,
      createdAt: a.created_at as string,
      updatedAt: a.updated_at as string
    }));

    return {
      output: { assets },
      message: `Found **${assets.length}** assets`
    };
  })
  .build();

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update an existing asset's properties such as name, assignment, location, and type-specific fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      assetId: z.number().describe('ID of the asset to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      assetTypeId: z.number().optional().describe('Asset type ID'),
      assetTag: z.string().optional().describe('Asset tag'),
      impact: z.string().optional().describe('Impact: "low", "medium", "high"'),
      usageType: z.string().optional().describe('Usage type: "permanent", "loaner"'),
      agentId: z.number().optional().describe('Agent ID'),
      departmentId: z.number().optional().describe('Department ID'),
      locationId: z.number().optional().describe('Location ID'),
      groupId: z.number().optional().describe('Group ID'),
      assignedOn: z.string().optional().describe('Assignment date (ISO 8601)'),
      typeFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Asset type-specific fields')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the updated asset'),
      name: z.string().describe('Name'),
      assetTag: z.string().nullable().describe('Asset tag'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { assetId, ...updateParams } = ctx.input;
    let asset = await client.updateAsset(assetId, updateParams);

    return {
      output: {
        assetId: asset.id,
        name: asset.name,
        assetTag: asset.asset_tag,
        updatedAt: asset.updated_at
      },
      message: `Updated asset **#${asset.id}**: "${asset.name}"`
    };
  })
  .build();

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Permanently delete an asset by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      assetId: z.number().describe('ID of the asset to delete')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the deleted asset'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    await client.deleteAsset(ctx.input.assetId);

    return {
      output: {
        assetId: ctx.input.assetId,
        deleted: true
      },
      message: `Deleted asset **#${ctx.input.assetId}**`
    };
  })
  .build();
