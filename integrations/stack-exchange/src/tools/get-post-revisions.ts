import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let revisionSchema = z.object({
  revisionGuid: z.string().optional().describe('GUID of the revision'),
  revisionNumber: z.number().optional().describe('Sequential revision number'),
  revisionType: z
    .string()
    .optional()
    .describe('Type of revision (e.g., single_user, vote_based)'),
  postId: z.number().optional().describe('ID of the post'),
  postType: z.string().optional().describe('Type of post (question or answer)'),
  comment: z.string().optional().describe('Edit summary/comment'),
  body: z.string().optional().describe('Body content after revision'),
  title: z.string().optional().describe('Title after revision (for questions)'),
  tags: z.array(z.string()).optional().describe('Tags after revision (for questions)'),
  creationDate: z.string().optional().describe('When the revision was made (ISO 8601)'),
  userDisplayName: z.string().optional().describe('Display name of the editor'),
  userId: z.number().optional().describe('User ID of the editor'),
  setCommunityWiki: z
    .boolean()
    .optional()
    .describe('Whether this revision set the post as community wiki')
});

export let getPostRevisions = SlateTool.create(spec, {
  name: 'Get Post Revisions',
  key: 'get_post_revisions',
  description: `View the revision history of a question or answer, showing how the post has changed over time. Each revision includes the edit summary, content changes, and editor details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the question or answer to get revisions for'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      revisions: z.array(revisionSchema).describe('List of revisions, newest first'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let result = await client.getPostRevisions(ctx.input.postId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let revisions = result.items.map((r: any) => ({
      revisionGuid: r.revision_guid,
      revisionNumber: r.revision_number,
      revisionType: r.revision_type,
      postId: r.post_id,
      postType: r.post_type,
      comment: r.comment,
      body: r.body,
      title: r.title,
      tags: r.tags,
      creationDate: r.creation_date
        ? new Date(r.creation_date * 1000).toISOString()
        : undefined,
      userDisplayName: r.user?.display_name,
      userId: r.user?.user_id,
      setCommunityWiki: r.set_community_wiki
    }));

    return {
      output: { revisions, hasMore: result.hasMore },
      message: `Retrieved **${revisions.length}** revision(s) for post **#${ctx.input.postId}**.`
    };
  })
  .build();
