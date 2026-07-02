import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

let creativeSchema = z.object({
  creativeId: z.string().describe('Ad creative ID'),
  name: z.string().optional().describe('Creative name'),
  title: z.string().optional().describe('Creative title'),
  body: z.string().optional().describe('Creative body text'),
  imageUrl: z.string().optional().describe('Image URL'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
  objectStorySpec: z.any().optional().describe('Object story specification'),
  status: z.string().optional().describe('Creative status'),
  createdTime: z.string().optional().describe('Creation timestamp')
});

export let listAdCreatives = SlateTool.create(spec, {
  name: 'List Ad Creatives',
  key: 'list_ad_creatives',
  description: `Retrieve ad creatives from the ad account. Creatives define the visual and text content of ads. Use this to browse existing creatives for reuse or reference.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of creatives to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      creatives: z.array(creativeSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getAdCreatives({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let creatives = (result.data || []).map((c: any) => ({
      creativeId: c.id,
      name: c.name,
      title: c.title,
      body: c.body,
      imageUrl: c.image_url,
      thumbnailUrl: c.thumbnail_url,
      objectStorySpec: c.object_story_spec,
      status: c.status,
      createdTime: c.created_time
    }));

    return {
      output: {
        creatives,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${creatives.length}** ad creatives.`
    };
  })
  .build();

export let getAdCreative = SlateTool.create(spec, {
  name: 'Get Ad Creative',
  key: 'get_ad_creative',
  description: `Retrieve detailed information about a specific ad creative.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      creativeId: z.string().describe('The ad creative ID to retrieve')
    })
  )
  .output(creativeSchema)
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let c = await client.getAdCreative(ctx.input.creativeId);

    return {
      output: {
        creativeId: c.id,
        name: c.name,
        title: c.title,
        body: c.body,
        imageUrl: c.image_url,
        thumbnailUrl: c.thumbnail_url,
        objectStorySpec: c.object_story_spec,
        status: c.status,
        createdTime: c.created_time
      },
      message: `Retrieved ad creative **${c.name}** (${c.id}).`
    };
  })
  .build();

export let createAdCreative = SlateTool.create(spec, {
  name: 'Create Ad Creative',
  key: 'create_ad_creative',
  description: `Create a new ad creative. Creatives are immutable once created — to make changes, create a new creative. Supports link ads, image ads, and video ads via the objectStorySpec parameter.`,
  instructions: [
    'Ad creatives are immutable. To change a creative, create a new one and update the ad to use it.',
    'The objectStorySpec defines the creative format. For link ads, use page_id plus link_data. For video ads, use page_id plus video_data.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Creative name for internal reference'),
      objectStorySpec: z
        .record(z.string(), z.any())
        .describe(
          'Object story specification defining the creative content. Example for link ad: { page_id: "123", link_data: { link: "https://example.com", message: "Check this out!", image_hash: "abc123" } }'
        ),
      degreesOfFreedomSpec: z
        .record(z.string(), z.any())
        .optional()
        .describe('Degrees of freedom specification for Advantage+ creative optimization'),
      urlTags: z
        .string()
        .optional()
        .describe('URL tags to append to all links in the creative')
    })
  )
  .output(
    z.object({
      creativeId: z.string().describe('ID of the newly created creative')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {
      name: ctx.input.name,
      object_story_spec: JSON.stringify(ctx.input.objectStorySpec)
    };

    if (ctx.input.degreesOfFreedomSpec) {
      params.degrees_of_freedom_spec = JSON.stringify(ctx.input.degreesOfFreedomSpec);
    }
    if (ctx.input.urlTags) params.url_tags = ctx.input.urlTags;

    let result = await client.createAdCreative(params);

    return {
      output: {
        creativeId: result.id
      },
      message: `Created ad creative **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  })
  .build();
