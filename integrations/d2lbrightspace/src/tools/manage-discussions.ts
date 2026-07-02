import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDiscussionForums = SlateTool.create(spec, {
  name: 'List Discussion Forums',
  key: 'list_discussion_forums',
  description: `List all discussion forums in a course, or get topics within a specific forum. Returns forum/topic details including names, descriptions, and availability settings.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      forumId: z
        .string()
        .optional()
        .describe('If provided, lists topics within this forum instead of listing forums')
    })
  )
  .output(
    z.object({
      forums: z
        .array(
          z.object({
            forumId: z.string().describe('Forum ID'),
            name: z.string().optional().describe('Forum name'),
            description: z.string().optional().describe('Forum description'),
            isHidden: z.boolean().optional().describe('Whether hidden'),
            isLocked: z.boolean().optional().describe('Whether locked')
          })
        )
        .optional()
        .describe('List of forums (when forumId is not provided)'),
      topics: z
        .array(
          z.object({
            topicId: z.string().describe('Topic ID'),
            forumId: z.string().optional().describe('Parent forum ID'),
            name: z.string().optional().describe('Topic name'),
            description: z.string().optional().describe('Topic description'),
            isHidden: z.boolean().optional().describe('Whether hidden'),
            isLocked: z.boolean().optional().describe('Whether locked')
          })
        )
        .optional()
        .describe('List of topics (when forumId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.forumId) {
      let result = await client.listDiscussionTopics(ctx.input.orgUnitId, ctx.input.forumId);
      let items = Array.isArray(result) ? result : [];
      let topics = items.map((t: any) => ({
        topicId: String(t.TopicId),
        forumId: String(t.ForumId),
        name: t.Name,
        description: t.Description?.Text || t.Description?.Content,
        isHidden: t.IsHidden,
        isLocked: t.IsLocked
      }));

      return {
        output: { topics },
        message: `Found **${topics.length}** topic(s) in forum ${ctx.input.forumId}.`
      };
    }

    let result = await client.listDiscussionForums(ctx.input.orgUnitId);
    let items = Array.isArray(result) ? result : [];
    let forums = items.map((f: any) => ({
      forumId: String(f.ForumId),
      name: f.Name,
      description: f.Description?.Text || f.Description?.Content,
      isHidden: f.IsHidden,
      isLocked: f.IsLocked
    }));

    return {
      output: { forums },
      message: `Found **${forums.length}** discussion forum(s) in org unit ${ctx.input.orgUnitId}.`
    };
  })
  .build();

export let createDiscussionForum = SlateTool.create(spec, {
  name: 'Create Discussion Forum',
  key: 'create_discussion_forum',
  description: `Create a new discussion forum in a course with a name, description, and optional visibility/locking settings.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      name: z.string().describe('Forum name'),
      description: z.string().optional().describe('Forum description (HTML supported)'),
      isHidden: z.boolean().optional().describe('Whether the forum is hidden'),
      isLocked: z.boolean().optional().describe('Whether the forum is locked'),
      allowAnonymousPosts: z.boolean().optional().describe('Allow anonymous posts')
    })
  )
  .output(
    z.object({
      forumId: z.string().describe('New forum ID'),
      name: z.string().describe('Forum name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let forumData: any = {
      Name: ctx.input.name
    };
    if (ctx.input.description)
      forumData.Description = { Content: ctx.input.description, Type: 'Html' };
    if (ctx.input.isHidden !== undefined) forumData.IsHidden = ctx.input.isHidden;
    if (ctx.input.isLocked !== undefined) forumData.IsLocked = ctx.input.isLocked;
    if (ctx.input.allowAnonymousPosts !== undefined)
      forumData.AllowAnonymous = ctx.input.allowAnonymousPosts;

    let result = await client.createDiscussionForum(ctx.input.orgUnitId, forumData);

    return {
      output: {
        forumId: String(result.ForumId),
        name: result.Name
      },
      message: `Created discussion forum **${result.Name}** (ID: ${result.ForumId}).`
    };
  })
  .build();

export let createDiscussionTopic = SlateTool.create(spec, {
  name: 'Create Discussion Topic',
  key: 'create_discussion_topic',
  description: `Create a new discussion topic within an existing forum. Supports setting name, description, and availability.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      forumId: z.string().describe('Forum ID to create the topic in'),
      name: z.string().describe('Topic name'),
      description: z.string().optional().describe('Topic description (HTML supported)'),
      isHidden: z.boolean().optional().describe('Whether the topic is hidden'),
      isLocked: z.boolean().optional().describe('Whether the topic is locked'),
      allowAnonymousPosts: z.boolean().optional().describe('Allow anonymous posts'),
      mustPostToParticipate: z
        .boolean()
        .optional()
        .describe('Require a post before viewing other posts')
    })
  )
  .output(
    z.object({
      topicId: z.string().describe('New topic ID'),
      forumId: z.string().describe('Parent forum ID'),
      name: z.string().describe('Topic name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let topicData: any = {
      Name: ctx.input.name
    };
    if (ctx.input.description)
      topicData.Description = { Content: ctx.input.description, Type: 'Html' };
    if (ctx.input.isHidden !== undefined) topicData.IsHidden = ctx.input.isHidden;
    if (ctx.input.isLocked !== undefined) topicData.IsLocked = ctx.input.isLocked;
    if (ctx.input.allowAnonymousPosts !== undefined)
      topicData.AllowAnonymous = ctx.input.allowAnonymousPosts;
    if (ctx.input.mustPostToParticipate !== undefined)
      topicData.MustPostToParticipate = ctx.input.mustPostToParticipate;

    let result = await client.createDiscussionTopic(
      ctx.input.orgUnitId,
      ctx.input.forumId,
      topicData
    );

    return {
      output: {
        topicId: String(result.TopicId),
        forumId: String(result.ForumId),
        name: result.Name
      },
      message: `Created discussion topic **${result.Name}** (ID: ${result.TopicId}) in forum ${ctx.input.forumId}.`
    };
  })
  .build();

export let listDiscussionPosts = SlateTool.create(spec, {
  name: 'List Discussion Posts',
  key: 'list_discussion_posts',
  description: `List posts/threads within a discussion topic. Supports pagination and filtering by threads only.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      forumId: z.string().describe('Forum ID'),
      topicId: z.string().describe('Topic ID'),
      threadsOnly: z.boolean().optional().describe('Only return top-level threads'),
      pageSize: z.number().optional().describe('Number of posts per page'),
      pageNumber: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Post ID'),
            threadId: z.string().optional().describe('Thread ID'),
            parentPostId: z.string().optional().describe('Parent post ID (for replies)'),
            subject: z.string().optional().describe('Post subject'),
            message: z.string().optional().describe('Post message content'),
            postedByUserId: z.string().optional().describe('Author user ID'),
            postedByName: z.string().optional().describe('Author display name'),
            datePosted: z.string().optional().describe('Date posted'),
            isAnonymous: z.boolean().optional().describe('Whether posted anonymously'),
            replyCount: z.number().optional().describe('Number of replies')
          })
        )
        .describe('List of posts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listDiscussionPosts(
      ctx.input.orgUnitId,
      ctx.input.forumId,
      ctx.input.topicId,
      {
        threadsOnly: ctx.input.threadsOnly,
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber
      }
    );

    let items = Array.isArray(result) ? result : result?.Objects || [];
    let posts = items.map((p: any) => ({
      postId: String(p.PostId),
      threadId: p.ThreadId ? String(p.ThreadId) : undefined,
      parentPostId: p.ParentPostId ? String(p.ParentPostId) : undefined,
      subject: p.Subject,
      message: p.Message?.Text || p.Message?.Content || p.Message?.Html,
      postedByUserId: p.PostingUserId ? String(p.PostingUserId) : undefined,
      postedByName: p.PostingUserDisplayName,
      datePosted: p.DatePosted,
      isAnonymous: p.IsAnonymous,
      replyCount: p.ReplyCount
    }));

    return {
      output: { posts },
      message: `Found **${posts.length}** post(s) in topic ${ctx.input.topicId}.`
    };
  })
  .build();

export let createDiscussionPost = SlateTool.create(spec, {
  name: 'Create Discussion Post',
  key: 'create_discussion_post',
  description: `Create a new post or reply in a discussion topic. Specify a parentPostId to create a reply to an existing post.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      forumId: z.string().describe('Forum ID'),
      topicId: z.string().describe('Topic ID'),
      subject: z.string().describe('Post subject'),
      message: z.string().describe('Post message content (HTML supported)'),
      parentPostId: z.string().optional().describe('Parent post ID to reply to'),
      isAnonymous: z.boolean().optional().describe('Post anonymously')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('New post ID'),
      subject: z.string().optional().describe('Post subject')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let postData: any = {
      Subject: ctx.input.subject,
      Message: { Content: ctx.input.message, Type: 'Html' }
    };
    if (ctx.input.parentPostId) postData.ParentPostId = Number(ctx.input.parentPostId);
    if (ctx.input.isAnonymous !== undefined) postData.IsAnonymous = ctx.input.isAnonymous;

    let result = await client.createDiscussionPost(
      ctx.input.orgUnitId,
      ctx.input.forumId,
      ctx.input.topicId,
      postData
    );

    return {
      output: {
        postId: String(result.PostId),
        subject: result.Subject
      },
      message: `Created discussion post **${result.Subject || ctx.input.subject}** (ID: ${result.PostId}).`
    };
  })
  .build();
