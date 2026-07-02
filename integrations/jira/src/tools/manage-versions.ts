import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listVersionsTool = SlateTool.create(spec, {
  name: 'List Versions',
  key: 'list_versions',
  description: `List versions (releases) for a Jira project. Returns version details including release status and dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectIdOrKey: z.string().describe('The project key or ID.'),
      startAt: z.number().optional().default(0).describe('Pagination start index.'),
      maxResults: z.number().optional().default(50).describe('Maximum versions to return.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of versions.'),
      versions: z.array(
        z.object({
          versionId: z.string().describe('The version ID.'),
          name: z.string().describe('The version name.'),
          description: z.string().optional().describe('The version description.'),
          released: z.boolean().describe('Whether the version has been released.'),
          archived: z.boolean().describe('Whether the version is archived.'),
          startDate: z.string().optional().describe('The start date.'),
          releaseDate: z.string().optional().describe('The release date.')
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

    let result = await client.getProjectVersions(ctx.input.projectIdOrKey, {
      startAt: ctx.input.startAt,
      maxResults: ctx.input.maxResults
    });

    let versions = (result.values ?? []).map((v: any) => ({
      versionId: v.id,
      name: v.name,
      description: v.description,
      released: v.released ?? false,
      archived: v.archived ?? false,
      startDate: v.startDate,
      releaseDate: v.releaseDate
    }));

    return {
      output: {
        total: result.total ?? versions.length,
        versions
      },
      message: `Found **${result.total ?? versions.length}** versions in project ${ctx.input.projectIdOrKey}.`
    };
  })
  .build();

export let createVersionTool = SlateTool.create(spec, {
  name: 'Create Version',
  key: 'create_version',
  description: `Create a new version (release) in a Jira project for release management.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .describe('The numeric project ID (not key). Use List Projects to find it.'),
      name: z.string().describe('The version name (e.g., "v1.0.0").'),
      description: z.string().optional().describe('Version description.'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      releaseDate: z.string().optional().describe('Target release date in YYYY-MM-DD format.'),
      released: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to mark the version as released immediately.')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('The ID of the created version.'),
      name: z.string().describe('The version name.'),
      released: z.boolean().describe('Whether the version is released.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let version = await client.createVersion({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      releaseDate: ctx.input.releaseDate,
      released: ctx.input.released
    });

    return {
      output: {
        versionId: version.id,
        name: version.name,
        released: version.released ?? false
      },
      message: `Created version **${version.name}** (ID: ${version.id}).`
    };
  })
  .build();

export let updateVersionTool = SlateTool.create(spec, {
  name: 'Update Version',
  key: 'update_version',
  description: `Update a project version's details, release it, or archive it.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      versionId: z.string().describe('The version ID to update.'),
      name: z.string().optional().describe('New version name.'),
      description: z.string().optional().describe('New description.'),
      startDate: z.string().optional().describe('New start date (YYYY-MM-DD).'),
      releaseDate: z.string().optional().describe('New release date (YYYY-MM-DD).'),
      released: z.boolean().optional().describe('Set to true to release, false to unrelease.'),
      archived: z.boolean().optional().describe('Set to true to archive, false to unarchive.')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('The version ID.'),
      name: z.string().describe('The version name.'),
      released: z.boolean().describe('Whether the version is released.'),
      archived: z.boolean().describe('Whether the version is archived.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let fields: Record<string, any> = {};
    if (ctx.input.name !== undefined) fields.name = ctx.input.name;
    if (ctx.input.description !== undefined) fields.description = ctx.input.description;
    if (ctx.input.startDate !== undefined) fields.startDate = ctx.input.startDate;
    if (ctx.input.releaseDate !== undefined) fields.releaseDate = ctx.input.releaseDate;
    if (ctx.input.released !== undefined) fields.released = ctx.input.released;
    if (ctx.input.archived !== undefined) fields.archived = ctx.input.archived;

    let version = await client.updateVersion(ctx.input.versionId, fields);

    return {
      output: {
        versionId: version.id,
        name: version.name,
        released: version.released ?? false,
        archived: version.archived ?? false
      },
      message: `Updated version **${version.name}**.`
    };
  })
  .build();

export let deleteVersionTool = SlateTool.create(spec, {
  name: 'Delete Version',
  key: 'delete_version',
  description: `Delete a Jira project version. Optionally move affected or fixed issues to replacement versions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      versionId: z.string().describe('The version ID to delete.'),
      moveFixIssuesTo: z
        .string()
        .optional()
        .describe('Version ID to move issues with this fix version to.'),
      moveAffectedIssuesTo: z
        .string()
        .optional()
        .describe('Version ID to move issues with this affected version to.')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('The deleted version ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.deleteVersion(ctx.input.versionId, {
      moveFixIssuesTo: ctx.input.moveFixIssuesTo,
      moveAffectedIssuesTo: ctx.input.moveAffectedIssuesTo
    });

    return {
      output: {
        versionId: ctx.input.versionId
      },
      message: `Deleted version **${ctx.input.versionId}**.`
    };
  })
  .build();
