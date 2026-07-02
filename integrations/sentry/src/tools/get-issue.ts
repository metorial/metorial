import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { optionalBoolean, optionalNumber, optionalString } from '../lib/output';
import { spec } from '../spec';

export let getIssueTool = SlateTool.create(spec, {
  name: 'Get Issue Details',
  key: 'get_issue',
  description: `Retrieve detailed information about a specific Sentry issue, including its latest event with stack trace, tags, and contextual data. Optionally fetches comments and tag breakdowns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueId: z.string().describe('The issue ID to retrieve'),
      includeLatestEvent: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include the latest event with stack trace'),
      includeTags: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include tag breakdowns')
    })
  )
  .output(
    z.object({
      issueId: z.string(),
      shortId: z.string(),
      title: z.string(),
      culprit: z.string().optional(),
      level: z.string(),
      status: z.string(),
      substatus: z.string().optional(),
      platform: z.string().optional(),
      projectSlug: z.string().optional(),
      projectName: z.string().optional(),
      count: z.string().optional(),
      userCount: z.number().optional(),
      firstSeen: z.string().optional(),
      lastSeen: z.string().optional(),
      assignedTo: z.any().optional(),
      isPublic: z.boolean().optional(),
      isBookmarked: z.boolean().optional(),
      permalink: z.string().optional(),
      metadata: z.any().optional().describe('Issue metadata including type, value, filename'),
      latestEvent: z
        .any()
        .optional()
        .describe('Latest event data including stack trace and context'),
      tags: z.array(z.any()).optional().describe('Tag breakdowns for the issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let issue = await client.getIssue(ctx.input.issueId);

    let latestEvent: any;
    if (ctx.input.includeLatestEvent) {
      try {
        latestEvent = await client.getLatestEvent(ctx.input.issueId);
      } catch {
        // Latest event may not be available
      }
    }

    let tags: any[] | undefined;
    if (ctx.input.includeTags) {
      try {
        tags = await client.listIssueTags(ctx.input.issueId);
      } catch {
        // Tags may not be available
      }
    }

    return {
      output: {
        issueId: String(issue.id),
        shortId: optionalString(issue.shortId) ?? '',
        title: optionalString(issue.title) ?? '',
        culprit: optionalString(issue.culprit),
        level: optionalString(issue.level) ?? 'error',
        status: optionalString(issue.status) ?? 'unresolved',
        substatus: optionalString(issue.substatus),
        platform: optionalString(issue.platform),
        projectSlug: optionalString(issue.project?.slug),
        projectName: optionalString(issue.project?.name),
        count: optionalString(issue.count),
        userCount: optionalNumber(issue.userCount),
        firstSeen: optionalString(issue.firstSeen),
        lastSeen: optionalString(issue.lastSeen),
        assignedTo: issue.assignedTo,
        isPublic: optionalBoolean(issue.isPublic),
        isBookmarked: optionalBoolean(issue.isBookmarked),
        permalink: optionalString(issue.permalink),
        metadata: issue.metadata,
        latestEvent,
        tags
      },
      message: `Retrieved issue **${issue.shortId}**: ${issue.title} (${issue.status}).`
    };
  })
  .build();
