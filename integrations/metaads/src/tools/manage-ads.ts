import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

let adSchema = z.object({
  adId: z.string().describe('Ad ID'),
  name: z.string().optional().describe('Ad name'),
  adSetId: z.string().optional().describe('Parent ad set ID'),
  campaignId: z.string().optional().describe('Parent campaign ID'),
  status: z.string().optional().describe('Ad status'),
  creative: z.any().optional().describe('Associated ad creative'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  updatedTime: z.string().optional().describe('Last update timestamp')
});

export let listAds = SlateTool.create(spec, {
  name: 'List Ads',
  key: 'list_ads',
  description: `Retrieve ads from the ad account or a specific ad set. Ads are the actual creatives people see, combining an ad creative with an ad set's targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adSetId: z
        .string()
        .optional()
        .describe(
          'Filter ads by ad set ID. If omitted, returns ads from the entire ad account.'
        ),
      statusFilter: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('Filter by status'),
      limit: z.number().optional().describe('Max number of ads to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      ads: z.array(adSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let filtering = ctx.input.statusFilter
      ? [{ field: 'effective_status', operator: 'IN', value: `["${ctx.input.statusFilter}"]` }]
      : undefined;

    let result = await client.getAds({
      adSetId: ctx.input.adSetId,
      limit: ctx.input.limit,
      after: ctx.input.afterCursor,
      filtering
    });

    let ads = (result.data || []).map((a: any) => ({
      adId: a.id,
      name: a.name,
      adSetId: a.adset_id,
      campaignId: a.campaign_id,
      status: a.status,
      creative: a.creative,
      createdTime: a.created_time,
      updatedTime: a.updated_time
    }));

    return {
      output: {
        ads,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${ads.length}** ads.`
    };
  })
  .build();

export let getAd = SlateTool.create(spec, {
  name: 'Get Ad',
  key: 'get_ad',
  description: `Retrieve detailed information about a specific ad by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adId: z.string().describe('The ad ID to retrieve')
    })
  )
  .output(adSchema)
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let a = await client.getAd(ctx.input.adId);

    return {
      output: {
        adId: a.id,
        name: a.name,
        adSetId: a.adset_id,
        campaignId: a.campaign_id,
        status: a.status,
        creative: a.creative,
        createdTime: a.created_time,
        updatedTime: a.updated_time
      },
      message: `Retrieved ad **${a.name}** (${a.id}) with status **${a.status}**.`
    };
  })
  .build();

export let createAd = SlateTool.create(spec, {
  name: 'Create Ad',
  key: 'create_ad',
  description: `Create a new ad within an ad set. An ad links an ad creative to an ad set. You must first create an ad creative, then reference it here.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Ad name'),
      adSetId: z.string().describe('Parent ad set ID'),
      creativeId: z.string().describe('Ad creative ID to use'),
      status: z.enum(['ACTIVE', 'PAUSED']).default('PAUSED').describe('Initial ad status')
    })
  )
  .output(
    z.object({
      adId: z.string().describe('ID of the newly created ad')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.createAd({
      name: ctx.input.name,
      adset_id: ctx.input.adSetId,
      creative: JSON.stringify({ creative_id: ctx.input.creativeId }),
      status: ctx.input.status
    });

    return {
      output: {
        adId: result.id
      },
      message: `Created ad **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  })
  .build();

export let updateAd = SlateTool.create(spec, {
  name: 'Update Ad',
  key: 'update_ad',
  description: `Update an existing ad's name, status, or creative. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      adId: z.string().describe('ID of the ad to update'),
      name: z.string().optional().describe('New ad name'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('New status'),
      creativeId: z.string().optional().describe('New creative ID to associate')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.creativeId)
      params.creative = JSON.stringify({ creative_id: ctx.input.creativeId });

    let result = await client.updateAd(ctx.input.adId, params);

    return {
      output: {
        success: result.success !== false
      },
      message: `Updated ad \`${ctx.input.adId}\`.`
    };
  })
  .build();

export let deleteAd = SlateTool.create(spec, {
  name: 'Delete Ad',
  key: 'delete_ad',
  description: `Delete an ad. This sets the ad status to DELETED.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      adId: z.string().describe('ID of the ad to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.deleteAd(ctx.input.adId);

    return {
      output: {
        success: result.success !== false
      },
      message: `Deleted ad \`${ctx.input.adId}\`.`
    };
  })
  .build();
