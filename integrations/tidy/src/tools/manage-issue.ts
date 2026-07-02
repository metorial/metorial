import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let issueOutputSchema = z.object({
  issueId: z.string().describe('Unique identifier for the issue'),
  addressId: z.string().describe('ID of the address the issue is reported at'),
  description: z.string().describe('Description of the issue'),
  reporterType: z.string().nullable().describe('Type of reporter who created the issue'),
  status: z.string().describe('Current status of the issue (open or resolved)'),
  issueType: z.string().describe('Type of issue (damage or low_inventory)'),
  createdAt: z.string().nullable().describe('Timestamp when the issue was created')
});

let mapIssue = (data: any) => ({
  issueId: data.id,
  addressId: data.address_id,
  description: data.description,
  reporterType: data.reporter_type ?? null,
  status: data.status,
  issueType: data.type,
  createdAt: data.created_at ?? null
});

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `List property issues across your addresses. Optionally filter by address or status (open/resolved). Use this to track damage reports and low inventory alerts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().optional().describe('Filter issues by address ID'),
      status: z.enum(['open', 'resolved']).optional().describe('Filter by issue status')
    })
  )
  .output(
    z.object({
      issues: z.array(issueOutputSchema).describe('List of property issues')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listIssues(ctx.input);
    let issues = (result.data ?? result ?? []).map(mapIssue);

    return {
      output: { issues },
      message: `Found **${issues.length}** issue(s).`
    };
  })
  .build();

export let getIssue = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve detailed information about a specific property issue by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueId: z.string().describe('ID of the issue to retrieve')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getIssue(ctx.input.issueId);
    let issue = mapIssue(result);

    return {
      output: issue,
      message: `Retrieved issue **${issue.issueId}** (status: ${issue.status}, type: ${issue.issueType}).`
    };
  })
  .build();

export let createIssue = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Report a new property issue such as damage or low inventory at a specific address. Issues can be tracked and resolved over time.`
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address where the issue was found'),
      description: z.string().describe('Detailed description of the issue'),
      issueType: z.enum(['damage', 'low_inventory']).describe('Type of issue')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createIssue({
      addressId: ctx.input.addressId,
      description: ctx.input.description,
      type: ctx.input.issueType
    });
    let issue = mapIssue(result);

    return {
      output: issue,
      message: `Created issue **${issue.issueId}** (type: ${issue.issueType}) at address ${issue.addressId}.`
    };
  })
  .build();

export let resolveIssue = SlateTool.create(spec, {
  name: 'Resolve Issue',
  key: 'resolve_issue',
  description: `Mark a property issue as resolved. Changes the issue status from "open" to "resolved".`
})
  .input(
    z.object({
      issueId: z.string().describe('ID of the issue to resolve')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.resolveIssue(ctx.input.issueId);
    let issue = mapIssue(result);

    return {
      output: issue,
      message: `Resolved issue **${issue.issueId}**.`
    };
  })
  .build();

export let deleteIssue = SlateTool.create(spec, {
  name: 'Delete Issue',
  key: 'delete_issue',
  description: `Permanently delete a property issue record.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      issueId: z.string().describe('ID of the issue to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the issue was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteIssue(ctx.input.issueId);

    return {
      output: { deleted: true },
      message: `Deleted issue **${ctx.input.issueId}**.`
    };
  })
  .build();
