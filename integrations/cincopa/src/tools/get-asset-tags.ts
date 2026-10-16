import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let getAssetTags = SlateTool.create(spec, {
  name: 'Get Asset Tags',
  key: 'get_asset_tags',
  description: `Retrieve all tags associated with assets in your Cincopa account. Tags help categorize and organize assets, making them easier to search and filter.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z.array(z.string()).describe('List of tag names in the account'),
      tagCloud: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider tag cloud, including counts and special tag buckets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let data = await client.getAssetTags();
    let tagCloud = isApiErrorRecord(data?.tag_cloud) ? data.tag_cloud : undefined;
    let tagList = data?.tags ?? (tagCloud ? Object.keys(tagCloud) : undefined);
    if (!Array.isArray(tagList) || !tagList.every(tag => typeof tag === 'string')) {
      throw createApiServiceError('Cincopa did not return valid asset tags.');
    }

    return {
      output: { tags: tagList, tagCloud },
      message: `Found **${tagList.length}** tags.`
    };
  })
  .build();
