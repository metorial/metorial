import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let getStory = SlateTool.create(spec, {
  name: 'Get Story',
  key: 'get_story',
  description: `Retrieve a single story with its full content by ID. Returns the complete story object including all content fields, metadata, and publication status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storyId: z.string().describe('Numeric ID of the story to retrieve')
    })
  )
  .output(
    z.object({
      storyId: z.number().optional().describe('Numeric ID of the story'),
      uuid: z.string().optional().describe('UUID of the story'),
      name: z.string().optional().describe('Name of the story'),
      slug: z.string().optional().describe('Slug of the story'),
      fullSlug: z.string().optional().describe('Full slug path'),
      published: z.boolean().optional().describe('Whether the story is published'),
      isFolder: z.boolean().optional().describe('Whether the story is a folder'),
      isStartpage: z.boolean().optional().describe('Whether the story is a startpage'),
      parentId: z.number().optional().describe('Parent folder ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      publishedAt: z.string().optional().describe('Publication timestamp'),
      firstPublishedAt: z.string().optional().describe('First publication timestamp'),
      content: z.record(z.string(), z.any()).optional().describe('Full story content object'),
      tagList: z.array(z.string()).optional().describe('Tags assigned to the story'),
      lang: z.string().optional().describe('Language of the story')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let story = await client.getStory(ctx.input.storyId);

    return {
      output: {
        storyId: story.id,
        uuid: story.uuid,
        name: story.name,
        slug: story.slug,
        fullSlug: story.full_slug,
        published: story.published,
        isFolder: story.is_folder,
        isStartpage: story.is_startpage,
        parentId: story.parent_id,
        createdAt: story.created_at,
        updatedAt: story.updated_at,
        publishedAt: story.published_at,
        firstPublishedAt: story.first_published_at,
        content: story.content,
        tagList: story.tag_list,
        lang: story.lang
      },
      message: `Retrieved story **${story.name}** (\`${story.id}\`) at \`${story.full_slug}\`.`
    };
  })
  .build();
