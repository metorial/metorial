import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let sharedDriveSchema = z.object({
  driveId: z.string(),
  name: z.string(),
  createdTime: z.string().optional(),
  hidden: z.boolean().optional(),
  capabilities: z.record(z.string(), z.boolean()).optional(),
  restrictions: z.record(z.string(), z.boolean()).optional()
});

export let listSharedDrivesTool = SlateTool.create(spec, {
  name: 'List Shared Drives',
  key: 'list_shared_drives',
  description: `List all shared drives the authenticated user has access to. Optionally filter by name query.`,
  instructions: [
    'Pagination: when using `pageToken`, reuse the same `query` (and `pageSize` if set) as the request that returned that token; otherwise the API may return HTTP 400.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listSharedDrives)
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Filter shared drives by name (e.g. "name contains \'Marketing\'")'),
      pageSize: z.number().optional().describe('Maximum number of drives to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      drives: z.array(sharedDriveSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let result = await client.listSharedDrives({
      query: ctx.input.query,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    return {
      output: result,
      message: `Found **${result.drives.length}** shared drive(s).`
    };
  })
  .build();

export let createSharedDriveTool = SlateTool.create(spec, {
  name: 'Create Shared Drive',
  key: 'create_shared_drive',
  description: `Create a new shared drive for team collaboration. Requires Google Workspace admin privileges.`
})
  .scopes(googleDriveActionScopes.createSharedDrive)
  .input(
    z.object({
      name: z.string().describe('Name for the shared drive'),
      requestId: z
        .string()
        .describe('Unique idempotency key for the request (any unique string)')
    })
  )
  .output(sharedDriveSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let drive = await client.createSharedDrive(ctx.input.name, ctx.input.requestId);

    return {
      output: drive,
      message: `Created shared drive **${drive.name}** with ID \`${drive.driveId}\`.`
    };
  })
  .build();

export let updateSharedDriveTool = SlateTool.create(spec, {
  name: 'Update Shared Drive',
  key: 'update_shared_drive',
  description: `Update a shared drive's name or restrictions.`
})
  .scopes(googleDriveActionScopes.updateSharedDrive)
  .input(
    z.object({
      driveId: z.string().describe('ID of the shared drive'),
      name: z.string().optional().describe('New name for the shared drive'),
      restrictions: z
        .record(z.string(), z.boolean())
        .optional()
        .describe(
          'Restriction settings (e.g. adminManagedRestrictions, copyRequiresWriterPermission)'
        )
    })
  )
  .output(sharedDriveSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let drive = await client.updateSharedDrive(ctx.input.driveId, {
      name: ctx.input.name,
      restrictions: ctx.input.restrictions
    });

    return {
      output: drive,
      message: `Updated shared drive **${drive.name}**.`
    };
  })
  .build();

export let deleteSharedDriveTool = SlateTool.create(spec, {
  name: 'Delete Shared Drive',
  key: 'delete_shared_drive',
  description: `Delete a shared drive. The shared drive must be empty before it can be deleted.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleDriveActionScopes.deleteSharedDrive)
  .input(
    z.object({
      driveId: z.string().describe('ID of the shared drive to delete')
    })
  )
  .output(
    z.object({
      driveId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    await client.deleteSharedDrive(ctx.input.driveId);

    return {
      output: {
        driveId: ctx.input.driveId,
        deleted: true
      },
      message: `Deleted shared drive \`${ctx.input.driveId}\`.`
    };
  })
  .build();
