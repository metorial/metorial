import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { codaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listPermissionsTool = SlateTool.create(spec, {
  name: 'List Permissions',
  key: 'list_permissions',
  description: `List all sharing permissions on a Coda doc, including who has access and at what level (read, write, comment). Also returns ACL settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      limit: z.number().optional().describe('Maximum number of permissions to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      permissions: z.array(
        z.object({
          permissionId: z.string().describe('ID of the permission entry'),
          principalType: z
            .string()
            .optional()
            .describe('Type of principal (user, group, domain, anyone)'),
          principalEmail: z.string().optional().describe('Email of the principal'),
          principalName: z.string().optional().describe('Name of the principal'),
          accessLevel: z
            .string()
            .optional()
            .describe('Access level (readonly, write, comment)')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      aclSettings: z
        .object({
          allowEditorsToChangePermissions: z.boolean().optional(),
          allowViewersToCopyDoc: z.boolean().optional(),
          allowViewersToRequestEditing: z.boolean().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let permResult = await client.listPermissions(ctx.input.docId, {
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });
    let settingsResult = await client.getAclSettings(ctx.input.docId);

    let permissions = (permResult.items || []).map((p: any) => ({
      permissionId: p.id,
      principalType: p.principal?.type,
      principalEmail: p.principal?.email,
      principalName: p.principal?.name,
      accessLevel: p.access
    }));

    return {
      output: {
        permissions,
        nextPageToken: permResult.nextPageToken,
        aclSettings: {
          allowEditorsToChangePermissions: settingsResult.allowEditorsToChangePermissions,
          allowViewersToCopyDoc: settingsResult.allowViewersToCopyDoc,
          allowViewersToRequestEditing: settingsResult.allowViewersToRequestEditing
        }
      },
      message: `Found **${permissions.length}** permission(s) on doc **${ctx.input.docId}**.`
    };
  })
  .build();

export let addPermissionTool = SlateTool.create(spec, {
  name: 'Add Permission',
  key: 'add_permission',
  description: `Grant access to a Coda doc for a user (by email), a domain, or anyone. Specify the access level as readonly, write, or comment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      accessLevel: z.enum(['readonly', 'write', 'comment']).describe('Access level to grant'),
      principalType: z
        .enum(['email', 'domain', 'anyone'])
        .describe('Type of principal to grant access to'),
      principalEmail: z
        .string()
        .optional()
        .describe('Email address (required when principalType is "email")'),
      principalDomain: z
        .string()
        .optional()
        .describe('Domain name (required when principalType is "domain")'),
      suppressEmail: z
        .boolean()
        .optional()
        .describe('Suppress email notification to the principal'),
      suppressNotification: z
        .boolean()
        .optional()
        .describe('Deprecated alias for suppressEmail')
    })
  )
  .output(
    z.object({
      permissionId: z.string().optional().describe('ID of the created permission'),
      granted: z.boolean().describe('Whether the permission was granted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let principal: any = { type: ctx.input.principalType };
    if (ctx.input.principalType === 'email') {
      if (!ctx.input.principalEmail) {
        throw codaServiceError('principalEmail is required when principalType is "email".');
      }
      principal.email = ctx.input.principalEmail;
    }
    if (ctx.input.principalType === 'domain') {
      if (!ctx.input.principalDomain) {
        throw codaServiceError('principalDomain is required when principalType is "domain".');
      }
      principal.domain = ctx.input.principalDomain;
    }

    await client.addPermission(ctx.input.docId, {
      access: ctx.input.accessLevel,
      principal,
      suppressEmail: ctx.input.suppressEmail ?? ctx.input.suppressNotification
    });

    return {
      output: {
        granted: true
      },
      message: `Granted **${ctx.input.accessLevel}** access on doc **${ctx.input.docId}**.`
    };
  })
  .build();

export let searchPrincipalsTool = SlateTool.create(spec, {
  name: 'Search Principals',
  key: 'search_principals',
  description: `Search Coda users and groups that can be shared on a doc. Useful before granting doc permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      query: z.string().describe('Search term used to find users or groups')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          name: z.string().optional().describe('User name'),
          email: z.string().optional().describe('User email')
        })
      ),
      groups: z.array(
        z.object({
          groupId: z.string().optional().describe('Group ID'),
          name: z.string().optional().describe('Group name'),
          type: z.string().optional().describe('Principal type')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchPrincipals(ctx.input.docId, {
      query: ctx.input.query
    });

    let users = (result.users || []).map((user: any) => ({
      name: user.name,
      email: user.email
    }));
    let groups = (result.groups || []).map((group: any) => ({
      groupId: group.id,
      name: group.name,
      type: group.type
    }));

    return {
      output: {
        users,
        groups
      },
      message: `Found **${users.length}** user(s) and **${groups.length}** group(s).`
    };
  })
  .build();

export let updateAclSettingsTool = SlateTool.create(spec, {
  name: 'Update ACL Settings',
  key: 'update_acl_settings',
  description: `Update Coda doc sharing settings such as whether editors can change permissions and whether viewers can copy or request editing access.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      allowEditorsToChangePermissions: z
        .boolean()
        .optional()
        .describe('Whether editors can change permissions'),
      allowViewersToCopyDoc: z
        .boolean()
        .optional()
        .describe('Whether viewers can copy the doc'),
      allowViewersToRequestEditing: z
        .boolean()
        .optional()
        .describe('Whether viewers can request edit access')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether ACL settings were updated')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.allowEditorsToChangePermissions === undefined &&
      ctx.input.allowViewersToCopyDoc === undefined &&
      ctx.input.allowViewersToRequestEditing === undefined
    ) {
      throw codaServiceError('Provide at least one ACL setting to update.');
    }

    let client = new Client({ token: ctx.auth.token });
    await client.updateAclSettings(ctx.input.docId, {
      allowEditorsToChangePermissions: ctx.input.allowEditorsToChangePermissions,
      allowViewersToCopyDoc: ctx.input.allowViewersToCopyDoc,
      allowViewersToRequestEditing: ctx.input.allowViewersToRequestEditing
    });

    return {
      output: {
        updated: true
      },
      message: `Updated ACL settings for doc **${ctx.input.docId}**.`
    };
  })
  .build();

export let removePermissionTool = SlateTool.create(spec, {
  name: 'Remove Permission',
  key: 'remove_permission',
  description: `Revoke a sharing permission from a Coda doc by permission ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      permissionId: z.string().describe('ID of the permission to revoke')
    })
  )
  .output(
    z.object({
      revoked: z.boolean().describe('Whether the permission was revoked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deletePermission(ctx.input.docId, ctx.input.permissionId);

    return {
      output: {
        revoked: true
      },
      message: `Revoked permission **${ctx.input.permissionId}** on doc **${ctx.input.docId}**.`
    };
  })
  .build();
