import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

let discussionSummarySchema = z.object({
  discussionNum: z.number().describe('Discussion number'),
  title: z.string().describe('Title of the discussion'),
  status: z.string().describe('Status (open, closed, merged)'),
  author: z.string().optional().describe('Username of the author'),
  isPullRequest: z.boolean().describe('Whether this is a pull request'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listDiscussionsTool = SlateTool.create(spec, {
  name: 'List Discussions',
  key: 'list_discussions',
  description: `List discussions and pull requests on a Hugging Face repository. Returns summaries including title, status, and whether each item is a PR.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")')
    })
  )
  .output(
    z.object({
      discussions: z.array(discussionSummarySchema).describe('List of discussions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.listDiscussions({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId
    });

    let discussions = (result.discussions || result || []).map((d: any) => ({
      discussionNum: d.num,
      title: d.title,
      status: d.status,
      author: d.author?.name || d.author,
      isPullRequest: d.isPullRequest || false,
      createdAt: d.createdAt
    }));

    return {
      output: { discussions },
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
      author: e.author?.name || e.author,
      content: e.data?.latest?.raw || e.content,
      createdAt: e.createdAt
    }));

    return {
      output: {
        discussionNum: d.num,
        title: d.title,
        status: d.status,
        author: d.author?.name || d.author,
        isPullRequest: d.isPullRequest || false,
        createdAt: d.createdAt,
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
      title: z.string().describe('Title of the discussion'),
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
        url: result.url?.web || result.url
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
      posted: z.boolean().describe('Whether the comment was posted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    await client.commentOnDiscussion({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      discussionNum: ctx.input.discussionNum,
      comment: ctx.input.comment
    });

    return {
      output: { posted: true },
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
