import { SlateTool } from 'slates';
import { z } from 'zod';
import { FetchClient } from '../lib/client';
import { spec } from '../spec';

export let getContentItem = SlateTool.create(spec, {
  name: 'Get Content Item',
  key: 'get_content_item',
  description: `Retrieves a single content item by its ID from the Agility CMS Content Fetch API. Returns the full content item including all fields, properties (state, version, dates), and SEO metadata. Use **preview** mode to see unpublished/staging content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentId: z.number().describe('The numeric ID of the content item to retrieve'),
      locale: z
        .string()
        .optional()
        .describe(
          'Locale code override (e.g., "en-us"). Uses default locale from config if omitted.'
        ),
      apiType: z
        .enum(['fetch', 'preview'])
        .default('fetch')
        .describe(
          'Use "fetch" for published content or "preview" for staging/unpublished content'
        )
    })
  )
  .output(
    z.object({
      contentId: z.number().describe('Content item ID'),
      properties: z
        .record(z.string(), z.any())
        .describe(
          'Item properties including state, modified date, versionID, referenceName, definitionName'
        ),
      fields: z.record(z.string(), z.any()).describe('Content fields as key-value pairs'),
      seo: z.record(z.string(), z.any()).optional().describe('SEO metadata if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FetchClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      apiType: ctx.input.apiType
    });

    let item = await client.getContentItem(ctx.input.contentId);

    return {
      output: {
        contentId: item.contentID,
        properties: item.properties || {},
        fields: item.fields || {},
        seo: item.seo
      },
      message: `Retrieved content item **#${item.contentID}** (${item.properties?.definitionName || 'unknown type'})`
    };
  })
  .build();
