import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accessLevelEnum = z.enum(['NONE', 'APP_ONLY', 'CAN_VIEW', 'CAN_EDIT', 'FULL_ACCESS']);

export let manageProjectSharing = SlateTool.create(spec, {
  name: 'Manage Project Sharing',
  key: 'manage_project_sharing',
  description: `Configure sharing permissions for a Hex project. Supports setting access at multiple levels: individual users, groups, collections, workspace-wide, and public web. Access levels include NONE, APP_ONLY, CAN_VIEW, CAN_EDIT, and FULL_ACCESS. You can update one or more sharing levels in a single call.`,
  instructions: [
    'Provide at least one of the sharing options (users, groups, collections, workspace, or publicWeb).'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project to share'),
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID to grant access to'),
            accessLevel: accessLevelEnum.describe('Access level for this user')
          })
        )
        .optional()
        .describe('User-level sharing permissions to set'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID to grant access to'),
            accessLevel: accessLevelEnum.describe('Access level for this group')
          })
        )
        .optional()
        .describe('Group-level sharing permissions to set'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID to add/update'),
            accessLevel: accessLevelEnum.describe('Access level for this collection')
          })
        )
        .optional()
        .describe('Collection-level sharing permissions to set'),
      workspace: accessLevelEnum.optional().describe('Workspace-wide access level'),
      publicWeb: accessLevelEnum.optional().describe('Public web access level')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      updatedSharing: z.object({
        usersUpdated: z.boolean(),
        groupsUpdated: z.boolean(),
        collectionsUpdated: z.boolean(),
        workspaceUpdated: z.boolean(),
        publicWebUpdated: z.boolean()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let { projectId, users, groups, collections, workspace, publicWeb } = ctx.input;

    let updatedSharing = {
      usersUpdated: false,
      groupsUpdated: false,
      collectionsUpdated: false,
      workspaceUpdated: false,
      publicWebUpdated: false
    };

    let project: any;

    if (users && users.length > 0) {
      project = await client.editProjectSharingUsers(projectId, {
        upsert: { users }
      });
      updatedSharing.usersUpdated = true;
    }

    if (groups && groups.length > 0) {
      project = await client.editProjectSharingGroups(projectId, {
        upsert: { groups }
      });
      updatedSharing.groupsUpdated = true;
    }

    if (collections && collections.length > 0) {
      project = await client.editProjectSharingCollections(projectId, {
        upsert: { collections }
      });
      updatedSharing.collectionsUpdated = true;
    }

    if (workspace !== undefined || publicWeb !== undefined) {
      let sharingParams: { workspace?: string; publicWeb?: string } = {};
      if (workspace !== undefined) sharingParams.workspace = workspace;
      if (publicWeb !== undefined) sharingParams.publicWeb = publicWeb;
      project = await client.editProjectSharingWorkspaceAndPublic(projectId, sharingParams);
      updatedSharing.workspaceUpdated = workspace !== undefined;
      updatedSharing.publicWebUpdated = publicWeb !== undefined;
    }

    if (!project) {
      project = await client.getProject(projectId);
    }

    let changes = Object.entries(updatedSharing)
      .filter(([, v]) => v)
      .map(([k]) => k.replace('Updated', ''));

    return {
      output: {
        projectId: project.projectId,
        title: project.title,
        updatedSharing
      },
      message: `Updated sharing for project **${project.title}**: ${changes.join(', ')}.`
    };
  })
  .build();
