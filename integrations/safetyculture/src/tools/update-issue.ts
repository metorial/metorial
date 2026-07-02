import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateIssue = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing issue (incident). Modify its title, description, status, priority, due date, category, site, or collaborators. Only provided fields will be updated.`
})
  .input(
    z.object({
      issueId: z.string().describe('ID of the issue to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.string().optional().describe('New status'),
      priority: z
        .string()
        .optional()
        .describe('New priority (e.g., "NONE", "LOW", "MEDIUM", "HIGH")'),
      dueAt: z.string().optional().describe('New due date in ISO 8601 format'),
      categoryId: z.string().optional().describe('New category ID'),
      siteId: z.string().optional().describe('New site ID'),
      addCollaboratorIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to add as collaborators'),
      removeCollaboratorIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to remove from collaborators')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('ID of the updated issue'),
      updatedFields: z.array(z.string()).describe('List of fields that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { issueId } = ctx.input;
    let updatedFields: string[] = [];

    if (ctx.input.title !== undefined) {
      await client.updateIssueTitle(issueId, ctx.input.title);
      updatedFields.push('title');
    }
    if (ctx.input.description !== undefined) {
      await client.updateIssueDescription(issueId, ctx.input.description);
      updatedFields.push('description');
    }
    if (ctx.input.status !== undefined) {
      await client.updateIssueStatus(issueId, ctx.input.status);
      updatedFields.push('status');
    }
    if (ctx.input.priority !== undefined) {
      await client.updateIssuePriority(issueId, ctx.input.priority);
      updatedFields.push('priority');
    }
    if (ctx.input.dueAt !== undefined) {
      await client.updateIssueDueDate(issueId, ctx.input.dueAt);
      updatedFields.push('dueAt');
    }
    if (ctx.input.categoryId !== undefined) {
      await client.updateIssueCategory(issueId, ctx.input.categoryId);
      updatedFields.push('category');
    }
    if (ctx.input.siteId !== undefined) {
      await client.updateIssueSite(issueId, ctx.input.siteId);
      updatedFields.push('site');
    }
    if (ctx.input.addCollaboratorIds && ctx.input.addCollaboratorIds.length > 0) {
      await client.addIssueCollaborators(issueId, ctx.input.addCollaboratorIds);
      updatedFields.push('collaborators_added');
    }
    if (ctx.input.removeCollaboratorIds && ctx.input.removeCollaboratorIds.length > 0) {
      await client.removeIssueCollaborators(issueId, ctx.input.removeCollaboratorIds);
      updatedFields.push('collaborators_removed');
    }

    return {
      output: { issueId, updatedFields },
      message: `Updated issue **${issueId}**: modified ${updatedFields.join(', ')}.`
    };
  })
  .build();
