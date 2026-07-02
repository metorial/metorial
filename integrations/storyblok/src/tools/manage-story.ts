import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

let storyOutputSchema = z.object({
  storyId: z.number().optional().describe('Numeric ID of the story'),
  uuid: z.string().optional().describe('UUID of the story'),
  name: z.string().optional().describe('Name of the story'),
  slug: z.string().optional().describe('Slug of the story'),
  fullSlug: z.string().optional().describe('Full slug path of the story'),
  published: z.boolean().optional().describe('Whether the story is published'),
  isFolder: z.boolean().optional().describe('Whether the story is a folder'),
  isStartpage: z.boolean().optional().describe('Whether the story is a startpage'),
  parentId: z.number().optional().describe('Parent folder ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  publishedAt: z.string().optional().describe('Publication timestamp'),
  content: z.record(z.string(), z.any()).optional().describe('Story content object')
});

export let manageStory = SlateTool.create(spec, {
  name: 'Manage Story',
  key: 'manage_story',
  description: `Create, update, delete, publish, or unpublish a content story. Use this to manage the full lifecycle of content entries in Storyblok — from creation through publication.`,
  instructions: [
    'To **create** a story, set action to "create" and provide a name. Content should include a "component" field matching an existing component name.',
    'To **update** a story, set action to "update" and provide the storyId plus fields to change.',
    'To **publish** or **unpublish**, set the corresponding action and provide the storyId.',
    'To **delete** a story, set action to "delete" and provide the storyId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'publish', 'unpublish'])
        .describe('The story management action to perform'),
      storyId: z
        .string()
        .optional()
        .describe('Story ID (required for update, delete, publish, unpublish)'),
      name: z.string().optional().describe('Story name (required for create)'),
      slug: z.string().optional().describe('URL slug for the story'),
      content: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Story content object. Must include a "component" field matching a component name.'
        ),
      parentId: z.number().optional().describe('Parent folder ID to nest the story under'),
      isStartpage: z.boolean().optional().describe('Set as the startpage of its folder'),
      isFolder: z
        .boolean()
        .optional()
        .describe('Create as a folder instead of a story (create only)'),
      path: z.string().optional().describe('Custom real path for the story'),
      language: z.string().optional().describe('Language code for publish action')
    })
  )
  .output(storyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let { action, storyId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a story');

      let story = await client.createStory({
        name: ctx.input.name,
        slug: ctx.input.slug,
        content: ctx.input.content,
        parentId: ctx.input.parentId,
        isStartpage: ctx.input.isStartpage,
        isFolder: ctx.input.isFolder,
        path: ctx.input.path
      });

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
          publishedAt: story.published_at,
          content: story.content
        },
        message: `Created story **${story.name}** (\`${story.id}\`) at \`${story.full_slug}\`.`
      };
    }

    if (!storyId) throw new Error('storyId is required for this action');

    if (action === 'delete') {
      await client.deleteStory(storyId);
      return {
        output: { storyId: Number.parseInt(storyId, 10) },
        message: `Deleted story \`${storyId}\`.`
      };
    }

    if (action === 'publish') {
      let story = await client.publishStory(storyId, ctx.input.language);
      return {
        output: {
          storyId: story.id,
          uuid: story.uuid,
          name: story.name,
          slug: story.slug,
          fullSlug: story.full_slug,
          published: true,
          publishedAt: story.published_at,
          content: story.content
        },
        message: `Published story **${story.name}** (\`${story.id}\`).`
      };
    }

    if (action === 'unpublish') {
      let story = await client.unpublishStory(storyId);
      return {
        output: {
          storyId: story.id,
          uuid: story.uuid,
          name: story.name,
          slug: story.slug,
          fullSlug: story.full_slug,
          published: false,
          content: story.content
        },
        message: `Unpublished story **${story.name}** (\`${story.id}\`).`
      };
    }

    // action === 'update'
    let story = await client.updateStory(storyId, {
      name: ctx.input.name,
      slug: ctx.input.slug,
      content: ctx.input.content,
      parentId: ctx.input.parentId,
      isStartpage: ctx.input.isStartpage,
      path: ctx.input.path
    });

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
        publishedAt: story.published_at,
        content: story.content
      },
      message: `Updated story **${story.name}** (\`${story.id}\`).`
    };
  })
  .build();
