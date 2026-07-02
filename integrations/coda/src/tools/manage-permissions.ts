import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      docId: z.string().describe('ID of the doc')
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

    let permResult = await client.listPermissions(ctx.input.docId);
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
      suppressNotification: z
        .boolean()
        .optional()
        .describe('Suppress email notification to the principal')
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
    if (ctx.input.principalType === 'email') principal.email = ctx.input.principalEmail;
    if (ctx.input.principalType === 'domain') principal.domain = ctx.input.principalDomain;

    await client.addPermission(ctx.input.docId, {
      access: ctx.input.accessLevel,
      principal,
      suppressNotification: ctx.input.suppressNotification
    });

    return {
      output: {
        granted: true
      },
      message: `Granted **${ctx.input.accessLevel}** access on doc **${ctx.input.docId}**.`
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
