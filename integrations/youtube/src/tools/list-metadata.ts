import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let listMetadata = SlateTool.create(spec, {
  name: 'List YouTube Metadata',
  key: 'list_metadata',
  description: `List YouTube Data API metadata used by other tools, including upload video categories, supported content regions, and supported interface languages.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.listMetadata)
  .input(
    z.object({
      resource: z
        .enum(['videoCategories', 'regions', 'languages'])
        .describe('Metadata resource to list'),
      regionCode: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 region for video categories; defaults to US'),
      categoryId: z.string().optional().describe('Specific video category ID to retrieve'),
      hl: z.string().optional().describe('Language code for localized display names')
    })
  )
  .output(
    z.object({
      videoCategories: z
        .array(
          z.object({
            categoryId: z.string(),
            title: z.string().optional(),
            assignable: z.boolean().optional(),
            channelId: z.string().optional()
          })
        )
        .optional(),
      regions: z
        .array(
          z.object({
            regionCode: z.string(),
            gl: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional(),
      languages: z
        .array(
          z.object({
            languageCode: z.string(),
            hl: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional(),
      totalResults: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.resource === 'videoCategories') {
      let response = await client.listVideoCategories({
        part: ['snippet'],
        videoCategoryId: ctx.input.categoryId,
        regionCode: ctx.input.categoryId ? undefined : (ctx.input.regionCode ?? 'US'),
        hl: ctx.input.hl
      });
      let videoCategories = response.items.map(category => ({
        categoryId: category.id,
        title: category.snippet?.title,
        assignable: category.snippet?.assignable,
        channelId: category.snippet?.channelId
      }));

      return {
        output: {
          videoCategories,
          totalResults: response.pageInfo?.totalResults
        },
        message: `Retrieved **${videoCategories.length}** video categor${videoCategories.length === 1 ? 'y' : 'ies'}.`
      };
    }

    if (ctx.input.resource === 'regions') {
      let response = await client.listRegions({
        part: ['snippet'],
        hl: ctx.input.hl
      });
      let regions = response.items.map(region => ({
        regionCode: region.id,
        gl: region.snippet?.gl,
        name: region.snippet?.name
      }));

      return {
        output: {
          regions,
          totalResults: response.pageInfo?.totalResults
        },
        message: `Retrieved **${regions.length}** region(s).`
      };
    }

    let response = await client.listLanguages({
      part: ['snippet'],
      hl: ctx.input.hl
    });
    let languages = response.items.map(language => ({
      languageCode: language.id,
      hl: language.snippet?.hl,
      name: language.snippet?.name
    }));

    return {
      output: {
        languages,
        totalResults: response.pageInfo?.totalResults
      },
      message: `Retrieved **${languages.length}** language(s).`
    };
  })
  .build();
