import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let linkIssuesTool = SlateTool.create(spec, {
  name: 'Link Issues',
  key: 'link_issues',
  description: `Create a link between two Jira issues. Common link types include "Blocks", "Cloners", "Duplicate", and "Relates". The outward issue is the source and the inward issue is the target. For example, with "Blocks": outward issue **blocks** inward issue.`,
  instructions: [
    'Use List Issue Link Types tool to find available link type names for your instance.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      linkTypeName: z
        .string()
        .describe('The link type name (e.g., "Blocks", "Duplicate", "Relates").'),
      outwardIssueKey: z.string().describe('The source issue key (e.g., "PROJ-1").'),
      inwardIssueKey: z.string().describe('The target issue key (e.g., "PROJ-2").')
    })
  )
  .output(
    z.object({
      outwardIssueKey: z.string().describe('The source issue key.'),
      inwardIssueKey: z.string().describe('The target issue key.'),
      linkTypeName: z.string().describe('The link type name used.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.createIssueLink({
      type: { name: ctx.input.linkTypeName },
      outwardIssue: { key: ctx.input.outwardIssueKey },
      inwardIssue: { key: ctx.input.inwardIssueKey }
    });

    return {
      output: {
        outwardIssueKey: ctx.input.outwardIssueKey,
        inwardIssueKey: ctx.input.inwardIssueKey,
        linkTypeName: ctx.input.linkTypeName
      },
      message: `Linked **${ctx.input.outwardIssueKey}** → *${ctx.input.linkTypeName}* → **${ctx.input.inwardIssueKey}**.`
    };
  })
  .build();

export let listIssueLinkTypesTool = SlateTool.create(spec, {
  name: 'List Issue Link Types',
  key: 'list_issue_link_types',
  description: `List all available issue link types in the Jira instance (e.g., "Blocks", "Duplicate", "Relates").`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      linkTypes: z.array(
        z.object({
          linkTypeId: z.string().describe('The link type ID.'),
          name: z.string().describe('The link type name.'),
          inward: z.string().describe('The inward description (e.g., "is blocked by").'),
          outward: z.string().describe('The outward description (e.g., "blocks").')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let types = await client.getIssueLinkTypes();

    return {
      output: {
        linkTypes: types.map((t: any) => ({
          linkTypeId: t.id,
          name: t.name,
          inward: t.inward,
          outward: t.outward
        }))
      },
      message: `Found **${types.length}** issue link types.`
    };
  })
  .build();

export let deleteIssueLinkTool = SlateTool.create(spec, {
  name: 'Delete Issue Link',
  key: 'delete_issue_link',
  description: `Delete an existing link between two Jira issues by issue link ID. Use Get Issue with fields=["issuelinks"] to find link IDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      issueLinkId: z.string().describe('The issue link ID to delete.')
    })
  )
  .output(
    z.object({
      issueLinkId: z.string().describe('The deleted issue link ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.deleteIssueLink(ctx.input.issueLinkId);

    return {
      output: {
        issueLinkId: ctx.input.issueLinkId
      },
      message: `Deleted issue link **${ctx.input.issueLinkId}**.`
    };
  })
  .build();
