import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPermissions = SlateTool.create(spec, {
  name: 'List Permissions',
  key: 'list_permissions',
  description: `List all sharing permissions on a Word document or file in OneDrive or SharePoint.
Returns all permissions including sharing links and direct user grants. Optionally remove a specific permission.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item to list permissions for')
    })
  )
  .output(
    z.object({
      permissions: z
        .array(
          z.object({
            permissionId: z.string().describe('The ID of the permission'),
            roles: z.array(z.string()).describe('Roles granted by the permission'),
            sharingUrl: z
              .string()
              .optional()
              .describe('Sharing link URL if this is a link-based permission'),
            linkType: z.string().optional().describe('Type of sharing link (view/edit)'),
            linkScope: z
              .string()
              .optional()
              .describe('Scope of sharing link (anonymous/organization)'),
            grantedToName: z
              .string()
              .optional()
              .describe('Display name of the user granted access'),
            grantedToEmail: z.string().optional().describe('Email of the user granted access')
          })
        )
        .describe('List of permissions on the item'),
      totalCount: z.number().describe('Total number of permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let permissions = await client.listPermissions(ctx.input.itemId);

    return {
      output: {
        permissions: permissions.map(p => ({
          permissionId: p.permissionId,
          roles: p.roles,
          sharingUrl: p.link?.webUrl,
          linkType: p.link?.type,
          linkScope: p.link?.scope,
          grantedToName: p.grantedTo?.displayName,
          grantedToEmail: p.grantedTo?.email
        })),
        totalCount: permissions.length
      },
      message: `Found **${permissions.length}** permissions on item \`${ctx.input.itemId}\``
    };
  })
  .build();
