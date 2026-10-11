import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient, type RepoType, repoWebUrl } from '../lib/client';
import { spec } from '../spec';

let discussionSummarySchema = z.object({
  discussionNum: z.number().describe('Discussion number'),
  title: z.string().describe('Title of the discussion'),
  status: z.string().describe('Status (open, closed, merged)'),
  author: z.string().optional().describe('Username of the author'),
  isPullRequest: z.boolean().describe('Whether this is a pull request'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  numComments: z.number().optional().describe('Number of comments'),
  pinned: z.boolean().optional().describe('Whether the discussion is pinned')
});

let authorName = (author: any) =>
  typeof author === 'string' ? author : (author?.name ?? undefined);

let discussionWebUrl = (repoType: RepoType, repoId: string, num: number) =>
  `${repoWebUrl(repoType, repoId)}/discussions/${num}`;

export let listDiscussionsTool = SlateTool.create(spec, {
  name: 'List Discussions',
  key: 'list_discussions',
  description: `List discussions and pull requests on a Hugging Face repository. Filter by type, status, author, or search text. Results are paginated 50 per page; use page to fetch more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      type: z
        .enum(['all', 'discussion', 'pull_request'])
        .optional()
        .describe('Only return discussions or pull requests (defaults to all)'),
      status: z
        .enum(['all', 'open', 'closed'])
        .optional()
        .describe('Filter by status (defaults to all)'),
      author: z.string().optional().describe('Only return items opened by this username'),
      search: z.string().optional().describe('Search text to match against titles'),
      page: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Zero-based page index (50 items per page)')
    })
  )
  .output(
    z.object({
      discussions: z.array(discussionSummarySchema).describe('List of discussions'),
      totalCount: z.number().optional().describe('Total number of matching items'),
      hasMore: z.boolean().optional().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.listDiscussions({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      type: ctx.input.type,
      status: ctx.input.status,
      author: ctx.input.author,
      search: ctx.input.search,
      page: ctx.input.page
    });

    let rawDiscussions: any[] = Array.isArray(result?.discussions)
      ? result.discussions
      : Array.isArray(result)
        ? result
        : [];
    let discussions = rawDiscussions.map((d: any) => ({
      discussionNum: d.num,
      title: d.title,
      status: d.status,
      author: authorName(d.author),
      isPullRequest: d.isPullRequest || false,
      createdAt: d.createdAt,
      numComments: d.numComments,
      pinned: d.pinned
    }));
    let totalCount = typeof result?.count === 'number' ? result.count : undefined;
    let start = typeof result?.start === 'number' ? result.start : 0;

    return {
      output: {
        discussions,
        totalCount,
        hasMore: totalCount !== undefined ? start + discussions.length < totalCount : undefined
      },
      message: `Found **${discussions.length}** discussion(s) in **${ctx.input.repoId}**.`
    };
  })
  .build();

export let getDiscussionTool = SlateTool.create(spec, {
  name: 'Get Discussion',
  key: 'get_discussion',
  description: `Get detailed information about a specific discussion or pull request, including all comments and events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      discussionNum: z.number().describe('Discussion number')
    })
  )
  .output(
    z.object({
      discussionNum: z.number().describe('Discussion number'),
      title: z.string().describe('Title'),
      status: z.string().describe('Status'),
      author: z.string().optional().describe('Author username'),
      isPullRequest: z.boolean().describe('Whether this is a pull request'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      url: z.string().optional().describe('URL of the discussion on Hugging Face'),
      gitReference: z
        .string()
        .optional()
        .describe(
          'Git ref of a pull request (e.g. "refs/pr/3"); use as revision to commit to it'
        ),
      events: z
        .array(
          z.object({
            eventId: z.string().optional().describe('Event ID'),
            type: z.string().optional().describe('Event type'),
            author: z.string().optional().describe('Author username'),
            content: z.string().optional().describe('Comment content'),
            createdAt: z.string().optional().describe('Event timestamp')
          })
        )
        .optional()
        .describe('List of events/comments on the discussion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let d = await client.getDiscussion({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      discussionNum: ctx.input.discussionNum
    });

    let events = (d.events || []).map((e: any) => ({
      eventId: e.id || e._id,
      type: e.type,
      author: authorName(e.author),
      content: e.data?.latest?.raw ?? (typeof e.content === 'string' ? e.content : undefined),
      createdAt: e.createdAt
    }));

    return {
      output: {
        discussionNum: d.num,
        title: d.title,
        status: d.status,
        author: authorName(d.author),
        isPullRequest: d.isPullRequest || false,
        createdAt: d.createdAt,
        url: discussionWebUrl(
          ctx.input.repoType,
          ctx.input.repoId,
          d.num ?? ctx.input.discussionNum
        ),
        gitReference: d.isPullRequest
          ? `refs/pr/${d.num ?? ctx.input.discussionNum}`
          : undefined,
        events
      },
      message: `Retrieved discussion **#${ctx.input.discussionNum}**: "${d.title}" (${d.status}).`
    };
  })
  .build();

export let createDiscussionTool = SlateTool.create(spec, {
  name: 'Create Discussion',
  key: 'create_discussion',
  description: `Create a new discussion or pull request on a Hugging Face repository. Use this for opening conversations, requesting changes, or proposing contributions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      title: z.string().describe('Title of the discussion (3-200 characters)'),
      description: z.string().optional().describe('Initial comment/description'),
      isPullRequest: z
        .boolean()
        .optional()
        .default(false)
        .describe('Create as pull request instead of discussion')
    })
  )
  .output(
    z.object({
      discussionNum: z.number().describe('Created discussion number'),
      url: z.string().optional().describe('URL to the discussion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.createDiscussion({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      title: ctx.input.title,
      description: ctx.input.description,
      isPullRequest: ctx.input.isPullRequest
    });

    return {
      output: {
        discussionNum: result.num,
        url:
          (typeof result.url === 'string' ? result.url : result.url?.web) ??
          discussionWebUrl(ctx.input.repoType, ctx.input.repoId, result.num)
      },
      message: `Created ${ctx.input.isPullRequest ? 'pull request' : 'discussion'} **#${result.num}**: "${ctx.input.title}" on **${ctx.input.repoId}**.`
    };
  })
  .build();

export let commentOnDiscussionTool = SlateTool.create(spec, {
  name: 'Comment on Discussion',
  key: 'comment_on_discussion',
  description: `Post a comment on an existing discussion or pull request.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      discussionNum: z.number().describe('Discussion number'),
      comment: z.string().describe('Comment text (supports markdown)')
    })
  )
  .output(
    z.object({
      posted: z.boolean().describe('Whether the comment was posted'),
      commentId: z.string().optional().describe('ID of the created comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.commentOnDiscussion({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      discussionNum: ctx.input.discussionNum,
      comment: ctx.input.comment
    });

    return {
      output: { posted: true, commentId: result?.newMessage?.id ?? undefined },
      message: `Posted comment on discussion **#${ctx.input.discussionNum}** in **${ctx.input.repoId}**.`
    };
  })
  .build();

export let updateDiscussionStatusTool = SlateTool.create(spec, {
  name: 'Update Discussion Status',
  key: 'update_discussion_status',
  description: `Open or close a discussion or pull request. Optionally merge a pull request instead of just closing it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      discussionNum: z.number().describe('Discussion number'),
      action: z.enum(['open', 'close', 'merge']).describe('Action to perform'),
      comment: z.string().optional().describe('Optional comment with the status change')
    })
  )
  .output(
    z.object({
      discussionNum: z.number().describe('Discussion number'),
      newStatus: z.string().describe('Updated status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    if (ctx.input.action === 'merge') {
      await client.mergeDiscussion({
        repoType: ctx.input.repoType,
        repoId: ctx.input.repoId,
        discussionNum: ctx.input.discussionNum,
        comment: ctx.input.comment
      });
      return {
        output: {
          discussionNum: ctx.input.discussionNum,
          newStatus: 'merged'
        },
        message: `Merged pull request **#${ctx.input.discussionNum}** in **${ctx.input.repoId}**.`
      };
    }

    await client.updateDiscussionStatus({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      discussionNum: ctx.input.discussionNum,
      status: ctx.input.action === 'close' ? 'closed' : 'open',
      comment: ctx.input.comment
    });

    return {
      output: {
        discussionNum: ctx.input.discussionNum,
        newStatus: ctx.input.action === 'close' ? 'closed' : 'open'
      },
      message: `${ctx.input.action === 'close' ? 'Closed' : 'Reopened'} discussion **#${ctx.input.discussionNum}** in **${ctx.input.repoId}**.`
    };
  })
  .build();
