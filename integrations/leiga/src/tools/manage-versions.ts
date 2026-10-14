import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVersionsTool = SlateTool.create(spec, {
  name: 'List Versions',
  key: 'list_versions',
  description: `List one page of organization versions (releases). Returns version names, owner IDs, descriptions, dates, statuses, and total count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe(
          'Legacy project context, accepted for compatibility. Leiga versions are organization-wide and cannot be filtered by project.'
        ),
      pageNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .default(1)
        .describe('Page number starting at 1'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .default(50)
        .describe('Versions per page')
    })
  )
  .output(
    z.object({
      versions: z.array(z.any()).describe('List of versions/releases'),
      total: z.number().optional().describe('Total matching versions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listVersions(
      ctx.input.projectId,
      ctx.input.pageNumber,
      ctx.input.pageSize
    );

    let versions = response.data?.list || [];

    return {
      output: { versions, total: response.data?.total },
      message: `Found **${versions.length}** version(s).`
    };
  })
  .build();

export let createVersionTool = SlateTool.create(spec, {
  name: 'Create Version',
  key: 'create_version',
  description: `Create an organization version (release). Versions help organize work into release milestones. Leiga requires ownerId; call list_org_members to discover member IDs.`
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe(
          'Legacy project context, accepted for compatibility. Leiga versions are organization-wide.'
        ),
      name: z.string().describe('Version name'),
      ownerId: z
        .number()
        .optional()
        .describe(
          'Version owner user ID. Required by Leiga; call list_org_members to discover IDs.'
        ),
      description: z.string().optional().describe('Version description'),
      startDate: z.string().optional().describe('Start date (ISO 8601)'),
      releaseDate: z.string().optional().describe('Target release date (ISO 8601)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the version was created'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createVersion({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      ownerId: ctx.input.ownerId,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      releaseDate: ctx.input.releaseDate
    });

    return {
      output: { success: true, raw: response.data },
      message: `Created version **"${ctx.input.name}"**.`
    };
  })
  .build();

export let updateVersionTool = SlateTool.create(spec, {
  name: 'Update Version',
  key: 'update_version',
  description: `Update a version's name, owner, description, or dates. Leiga requires ownerId; call list_versions to find the current owner. The current name is retained when omitted.`
})
  .input(
    z.object({
      versionId: z.number().describe('The version ID to update'),
      name: z.string().optional().describe('New version name'),
      ownerId: z
        .number()
        .optional()
        .describe(
          'Version owner ID. Required by Leiga; call list_versions for the existing ownerId or list_org_members for a new owner.'
        ),
      description: z.string().optional().describe('New version description'),
      startDate: z.string().optional().describe('New start date (ISO 8601)'),
      releaseDate: z.string().optional().describe('New release date (ISO 8601)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateVersion({
      versionId: ctx.input.versionId,
      name: ctx.input.name,
      ownerId: ctx.input.ownerId,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      releaseDate: ctx.input.releaseDate
    });

    return {
      output: { success: true },
      message: `Updated version **#${ctx.input.versionId}**.`
    };
  })
  .build();

export let deleteVersionTool = SlateTool.create(spec, {
  name: 'Delete Version',
  key: 'delete_version',
  description: `Delete an organization-wide version (release). Call list_versions to discover version IDs and confirm which organization version to remove.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      versionId: z.number().describe('The version ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteVersion(ctx.input.versionId);

    return {
      output: { success: true },
      message: `Deleted version **#${ctx.input.versionId}**.`
    };
  })
  .build();

export let manageVersionLifecycleTool = SlateTool.create(spec, {
  name: 'Manage Version Lifecycle',
  key: 'manage_version_lifecycle',
  description: `Change a version's lifecycle status. Supports releasing, cancelling a release, archiving, and unarchiving a version.`
})
  .input(
    z.object({
      versionId: z.number().describe('The version ID'),
      releasedDate: z
        .string()
        .optional()
        .describe(
          'Actual release date (ISO 8601) for action release. Defaults to the current time.'
        ),
      action: z
        .enum(['release', 'cancel_release', 'archive', 'unarchive'])
        .describe('Lifecycle action to perform')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'release':
        await client.releaseVersion(ctx.input.versionId, ctx.input.releasedDate);
        break;
      case 'cancel_release':
        await client.cancelReleaseVersion(ctx.input.versionId);
        break;
      case 'archive':
        await client.archiveVersion(ctx.input.versionId);
        break;
      case 'unarchive':
        await client.unarchiveVersion(ctx.input.versionId);
        break;
    }

    return {
      output: { success: true },
      message: `Performed **${ctx.input.action}** on version #${ctx.input.versionId}.`
    };
  })
  .build();
