import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireAtLeastOneDefined } from '../lib/validation';
import { spec } from '../spec';

const releaseFields = {
  subject: z.string().optional().describe('Release subject'),
  description: z.string().optional().describe('HTML description of the release'),
  status: z
    .number()
    .optional()
    .describe('Status: 1=Open, 2=On hold, 3=In Progress, 4=Incomplete, 5=Completed'),
  priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
  releaseType: z
    .number()
    .optional()
    .describe('Release type: 1=Minor, 2=Standard, 3=Major, 4=Emergency'),
  groupId: z.number().optional().describe('Agent group ID'),
  agentId: z.number().optional().describe('Assigned agent ID'),
  departmentId: z.number().optional().describe('Department ID'),
  category: z.string().optional().describe('Category'),
  subCategory: z.string().optional().describe('Sub-category'),
  itemCategory: z.string().optional().describe('Item category'),
  plannedStartDate: z.string().optional().describe('Planned start date (ISO 8601)'),
  plannedEndDate: z.string().optional().describe('Planned end date (ISO 8601)'),
  workStartDate: z.string().optional().describe('Actual work start date (ISO 8601)'),
  workEndDate: z.string().optional().describe('Actual work end date (ISO 8601)'),
  customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields'),
  planningFields: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Planning fields such as build and test plans')
};

const releaseOutput = z.object({
  releaseId: z.number().describe('Freshservice release ID'),
  subject: z.string().describe('Release subject'),
  status: z.number().nullable().describe('Release status'),
  priority: z.number().nullable().describe('Release priority'),
  releaseType: z.number().nullable().describe('Release type'),
  agentId: z.number().nullable().describe('Assigned agent ID'),
  groupId: z.number().nullable().describe('Agent group ID'),
  plannedStartDate: z.string().nullable().describe('Planned start date'),
  plannedEndDate: z.string().nullable().describe('Planned end date'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

let createClient = (ctx: { auth: any; config: any }) =>
  new Client({
    token: ctx.auth.token,
    subdomain: ctx.config.subdomain,
    authType: ctx.auth.authType
  });

let mapRelease = (release: Record<string, any>) => ({
  releaseId: release.id,
  subject: release.subject,
  status: release.status ?? null,
  priority: release.priority ?? null,
  releaseType: release.release_type ?? null,
  agentId: release.agent_id ?? null,
  groupId: release.group_id ?? null,
  plannedStartDate: release.planned_start_date ?? null,
  plannedEndDate: release.planned_end_date ?? null,
  createdAt: release.created_at ?? null,
  updatedAt: release.updated_at ?? null
});

export let createRelease = SlateTool.create(spec, {
  name: 'Create Release',
  key: 'create_release',
  description: `Create a Freshservice release request for planned deployment work.

Status: 1=Open, 2=On hold, 3=In Progress, 4=Incomplete, 5=Completed.
Release type: 1=Minor, 2=Standard, 3=Major, 4=Emergency.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ...releaseFields,
      subject: z.string().describe('Release subject'),
      workspaceId: z
        .number()
        .optional()
        .describe('Workspace ID. If omitted, Freshservice uses the primary workspace.')
    })
  )
  .output(releaseOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let release = await client.createRelease(ctx.input);

    return {
      output: mapRelease(release),
      message: `Created release **#${release.id}**: "${release.subject}"`
    };
  })
  .build();

export let getRelease = SlateTool.create(spec, {
  name: 'Get Release',
  key: 'get_release',
  description: 'Retrieve a Freshservice release by ID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      releaseId: z.number().describe('ID of the release')
    })
  )
  .output(releaseOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let release = await client.getRelease(ctx.input.releaseId);

    return {
      output: mapRelease(release),
      message: `Retrieved release **#${release.id}**: "${release.subject}"`
    };
  })
  .build();

export let listReleases = SlateTool.create(spec, {
  name: 'List Releases',
  key: 'list_releases',
  description: `List Freshservice releases. Use filterName for documented release filters such as all, my_open, unassigned, completed, incomplete, or deleted.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filterName: z.string().optional().describe('Optional Freshservice release filter name'),
      workspaceId: z
        .number()
        .optional()
        .describe('Workspace ID. Use 0 to list releases across all accessible workspaces.'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      releases: z.array(releaseOutput).describe('Freshservice releases')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listReleases(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.filterName,
      ctx.input.workspaceId
    );
    let releases = result.releases.map(mapRelease);

    return {
      output: { releases },
      message: `Found **${releases.length}** releases`
    };
  })
  .build();

export let updateRelease = SlateTool.create(spec, {
  name: 'Update Release',
  key: 'update_release',
  description: 'Update an existing Freshservice release.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      releaseId: z.number().describe('ID of the release to update'),
      ...releaseFields
    })
  )
  .output(releaseOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { releaseId, ...updates } = ctx.input;
    requireAtLeastOneDefined(updates, 'Provide at least one field to update a release.');
    let release = await client.updateRelease(releaseId, updates);

    return {
      output: mapRelease(release),
      message: `Updated release **#${release.id}**: "${release.subject}"`
    };
  })
  .build();

export let deleteRelease = SlateTool.create(spec, {
  name: 'Delete Release',
  key: 'delete_release',
  description: 'Delete a Freshservice release. Deleted releases can be restored.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      releaseId: z.number().describe('ID of the release to delete')
    })
  )
  .output(
    z.object({
      releaseId: z.number().describe('ID of the deleted release'),
      deleted: z.boolean().describe('Whether the deletion was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteRelease(ctx.input.releaseId);

    return {
      output: { releaseId: ctx.input.releaseId, deleted: true },
      message: `Deleted release **#${ctx.input.releaseId}**`
    };
  })
  .build();

export let restoreRelease = SlateTool.create(spec, {
  name: 'Restore Release',
  key: 'restore_release',
  description: 'Restore a deleted Freshservice release.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      releaseId: z.number().describe('ID of the deleted release to restore')
    })
  )
  .output(
    z.object({
      releaseId: z.number().describe('ID of the restored release'),
      restored: z.boolean().describe('Whether the restore was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.restoreRelease(ctx.input.releaseId);

    return {
      output: { releaseId: ctx.input.releaseId, restored: true },
      message: `Restored release **#${ctx.input.releaseId}**`
    };
  })
  .build();
