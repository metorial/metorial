import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReleasesTool = SlateTool.create(spec, {
  name: 'List Releases',
  key: 'list_releases',
  description: `List releases and release groups for delivery planning. Returns both releases and their groupings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of items per page'),
      includeGroups: z
        .boolean()
        .optional()
        .describe('Also fetch release groups (default: false)')
    })
  )
  .output(
    z.object({
      releases: z.array(z.record(z.string(), z.any())).describe('List of releases'),
      releaseGroups: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of release groups, if requested'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let releasesResult = await client.listReleases({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    let releaseGroups: any[] | undefined;
    if (ctx.input.includeGroups) {
      let groupsResult = await client.listReleaseGroups();
      releaseGroups = groupsResult.data;
    }

    return {
      output: {
        releases: releasesResult.data,
        releaseGroups,
        pageCursor: releasesResult.pageCursor
      },
      message: `Retrieved ${releasesResult.data.length} release(s).${releaseGroups ? ` Also retrieved ${releaseGroups.length} release group(s).` : ''}`
    };
  })
  .build();

export let createReleaseTool = SlateTool.create(spec, {
  name: 'Create Release',
  key: 'create_release',
  description: `Create a new release for delivery planning. Releases can be grouped and have date ranges.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the release'),
      description: z.string().optional().describe('Description of the release'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      releaseGroupId: z
        .string()
        .optional()
        .describe('ID of the release group to add this release to')
    })
  )
  .output(
    z.object({
      release: z.record(z.string(), z.any()).describe('The created release')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let release = await client.createRelease({
      name: ctx.input.name,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      releaseGroup: ctx.input.releaseGroupId ? { id: ctx.input.releaseGroupId } : undefined
    });

    return {
      output: { release },
      message: `Created release **${ctx.input.name}**.`
    };
  })
  .build();

export let updateReleaseTool = SlateTool.create(spec, {
  name: 'Update Release',
  key: 'update_release',
  description: `Update an existing release's name, description, or date range.`
})
  .input(
    z.object({
      releaseId: z.string().describe('The ID of the release to update'),
      name: z.string().optional().describe('New name for the release'),
      description: z.string().optional().describe('New description'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('New end date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      release: z.record(z.string(), z.any()).describe('The updated release')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let release = await client.updateRelease(ctx.input.releaseId, {
      name: ctx.input.name,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: { release },
      message: `Updated release **${ctx.input.releaseId}**.`
    };
  })
  .build();

export let deleteReleaseTool = SlateTool.create(spec, {
  name: 'Delete Release',
  key: 'delete_release',
  description: `Permanently delete a release. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      releaseId: z.string().describe('The ID of the release to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteRelease(ctx.input.releaseId);

    return {
      output: { success: true },
      message: `Deleted release **${ctx.input.releaseId}**.`
    };
  })
  .build();

export let assignFeatureToReleaseTool = SlateTool.create(spec, {
  name: 'Assign Feature to Release',
  key: 'assign_feature_to_release',
  description: `Assign a feature to a release for delivery planning. Creates a link between a feature and a specific release.`
})
  .input(
    z.object({
      featureId: z.string().describe('The ID of the feature to assign'),
      releaseId: z.string().describe('The ID of the release to assign the feature to')
    })
  )
  .output(
    z.object({
      assignment: z.record(z.string(), z.any()).describe('The created assignment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let assignment = await client.assignFeatureToRelease(
      ctx.input.featureId,
      ctx.input.releaseId
    );

    return {
      output: { assignment },
      message: `Assigned feature **${ctx.input.featureId}** to release **${ctx.input.releaseId}**.`
    };
  })
  .build();
