import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let createCase = SlateTool.create(spec, {
  name: 'Create Case',
  key: 'create_case',
  description: `Create a new manual review case. Cases support human review workflows for flagged inquiries, verifications, or other events requiring manual judgment.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      caseTemplateId: z.string().optional().describe('Case template ID (starts with cstmpl_)'),
      caseName: z.string().optional().describe('Name for the case'),
      creatorId: z.string().optional().describe('ID of the user creating the case')
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('Persona case ID'),
      status: z.string().optional().describe('Case status'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full case attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let attrs: Record<string, any> = {};
    if (ctx.input.caseTemplateId) attrs['case-template-id'] = ctx.input.caseTemplateId;
    if (ctx.input.caseName) attrs.name = ctx.input.caseName;
    if (ctx.input.creatorId) attrs['creator-id'] = ctx.input.creatorId;

    let result = await client.createCase(attrs);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        caseId: result.data?.id,
        status: normalized.status,
        attributes: normalized
      },
      message: `Created case **${result.data?.id}**.`
    };
  })
  .build();

export let getCase = SlateTool.create(spec, {
  name: 'Get Case',
  key: 'get_case',
  description: `Retrieve the details of a specific manual review case.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      caseId: z.string().describe('Persona case ID (starts with case_)')
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('Case ID'),
      caseName: z.string().optional().describe('Case name'),
      status: z.string().optional().describe('Case status'),
      assigneeId: z.string().optional().describe('Assigned reviewer ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      resolvedAt: z.string().optional().describe('Resolution timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full case attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getCase(ctx.input.caseId);
    let n = normalizeResource(result.data);

    return {
      output: {
        caseId: result.data?.id,
        caseName: n.name,
        status: n.status,
        assigneeId: n.relationships?.assignee?.id,
        createdAt: n['created-at'] || n.created_at,
        resolvedAt: n['resolved-at'] || n.resolved_at,
        attributes: n
      },
      message: `Case **${result.data?.id}** is **${n.status}**.`
    };
  })
  .build();

export let listCases = SlateTool.create(spec, {
  name: 'List Cases',
  key: 'list_cases',
  description: `List manual review cases with optional status filter. Supports cursor-based pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterStatus: z.string().optional().describe('Filter by status (open, resolved, etc.)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      cases: z
        .array(
          z.object({
            caseId: z.string().describe('Case ID'),
            caseName: z.string().optional().describe('Case name'),
            status: z.string().optional().describe('Status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of cases'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listCases({
      filterStatus: ctx.input.filterStatus,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let cases = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        caseId: item.id,
        caseName: n.name,
        status: n.status,
        createdAt: n['created-at'] || n.created_at
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { cases, nextCursor },
      message: `Found **${cases.length}** cases.`
    };
  })
  .build();

export let updateCase = SlateTool.create(spec, {
  name: 'Update Case',
  key: 'update_case',
  description: `Update a case's status, assignment, or tags. Supports setting status, assigning a reviewer, and managing tags in a single operation.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      caseId: z.string().describe('Persona case ID (starts with case_)'),
      status: z.string().optional().describe('New status for the case'),
      assigneeId: z.string().optional().describe('User ID to assign the case to'),
      addTag: z.string().optional().describe('Tag to add'),
      removeTag: z.string().optional().describe('Tag to remove')
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('Case ID'),
      status: z.string().optional().describe('Updated status'),
      attributes: z.record(z.string(), z.any()).optional().describe('Updated case attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.status) {
      result = await client.setCaseStatus(ctx.input.caseId, ctx.input.status);
    }

    if (ctx.input.assigneeId) {
      result = await client.assignCase(ctx.input.caseId, ctx.input.assigneeId);
    }

    if (ctx.input.addTag) {
      result = await client.addCaseTag(ctx.input.caseId, ctx.input.addTag);
    }

    if (ctx.input.removeTag) {
      result = await client.removeCaseTag(ctx.input.caseId, ctx.input.removeTag);
    }

    if (!result) {
      result = await client.getCase(ctx.input.caseId);
    }

    let normalized = normalizeResource(result.data);

    return {
      output: {
        caseId: result.data?.id || ctx.input.caseId,
        status: normalized.status,
        attributes: normalized
      },
      message: `Updated case **${ctx.input.caseId}**.`
    };
  })
  .build();
