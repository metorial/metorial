import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVersionsTool = SlateTool.create(spec, {
  name: 'List Versions',
  key: 'list_versions',
  description: `List all versions (releases) in a project. Returns version names, descriptions, dates, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID')
    })
  )
  .output(
    z.object({
      versions: z.array(z.any()).describe('List of versions/releases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listVersions(ctx.input.projectId);

    let versions = response.data || [];

    return {
      output: { versions },
      message: `Found **${versions.length}** version(s).`
    };
  })
  .build();

export let createVersionTool = SlateTool.create(spec, {
  name: 'Create Version',
  key: 'create_version',
  description: `Create a new version (release) in a project. Versions help organize work into release milestones.`
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      name: z.string().describe('Version name'),
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
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      releaseDate: ctx.input.releaseDate
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to create version');
    }

    return {
      output: { success: true, raw: response.data },
      message: `Created version **"${ctx.input.name}"**.`
    };
  })
  .build();

export let updateVersionTool = SlateTool.create(spec, {
  name: 'Update Version',
  key: 'update_version',
  description: `Update a version's name, description, or dates.`
})
  .input(
    z.object({
      versionId: z.number().describe('The version ID to update'),
      name: z.string().optional().describe('New version name'),
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

    let response = await client.updateVersion({
      versionId: ctx.input.versionId,
      name: ctx.input.name,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      releaseDate: ctx.input.releaseDate
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to update version');
    }

    return {
      output: { success: true },
      message: `Updated version **#${ctx.input.versionId}**.`
    };
  })
  .build();

export let deleteVersionTool = SlateTool.create(spec, {
  name: 'Delete Version',
  key: 'delete_version',
  description: `Delete a version from a project.`,
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

    let response = await client.deleteVersion(ctx.input.versionId);

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to delete version');
    }

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

    let response: any;
    switch (ctx.input.action) {
      case 'release':
        response = await client.releaseVersion(ctx.input.versionId);
        break;
      case 'cancel_release':
        response = await client.cancelReleaseVersion(ctx.input.versionId);
        break;
      case 'archive':
        response = await client.archiveVersion(ctx.input.versionId);
        break;
      case 'unarchive':
        response = await client.unarchiveVersion(ctx.input.versionId);
        break;
    }

    if (response.code !== '0') {
      throw new Error(response.msg || `Failed to ${ctx.input.action} version`);
    }

    return {
      output: { success: true },
      message: `Performed **${ctx.input.action}** on version #${ctx.input.versionId}.`
    };
  })
  .build();
