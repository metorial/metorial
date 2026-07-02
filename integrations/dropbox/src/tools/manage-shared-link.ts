import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { dropboxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSharedLink = SlateTool.create(spec, {
  name: 'Manage Shared Link',
  key: 'manage_shared_link',
  description: `Create, list, or revoke shared links for files and folders. Use action "create" to generate a new shared link, "list" to find existing links, or "revoke" to remove a link.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'revoke'])
        .describe('Action to perform on shared links'),
      path: z
        .string()
        .optional()
        .describe('Path of the file/folder (required for "create", optional for "list")'),
      linkUrl: z
        .string()
        .optional()
        .describe('Shared link URL to revoke (required for "revoke")'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous list action to continue pagination'),
      directOnly: z
        .boolean()
        .optional()
        .describe('For "list", return only links directly on path and not parent links'),
      visibility: z
        .enum(['public', 'team_only', 'password'])
        .optional()
        .describe(
          'Deprecated Dropbox visibility setting for "create"; prefer audience when possible'
        ),
      audience: z
        .enum(['public', 'team', 'no_one', 'password'])
        .optional()
        .describe('Audience for a newly created shared link'),
      access: z
        .enum(['viewer', 'viewer_no_comment', 'editor', 'max', 'default'])
        .optional()
        .describe('Requested access level for a newly created shared link'),
      password: z.string().optional().describe('Password to protect the shared link'),
      expires: z
        .string()
        .optional()
        .describe('Expiration datetime for the link (ISO 8601 format)'),
      allowDownload: z
        .boolean()
        .optional()
        .describe('Whether to allow downloads via the shared link')
    })
  )
  .output(
    z.object({
      links: z
        .array(
          z.object({
            url: z.string().describe('Shared link URL'),
            name: z.string().optional().describe('File or folder name'),
            id: z.string().optional().describe('Linked file or folder ID'),
            pathLower: z.string().optional().describe('Lowercased path'),
            visibility: z.string().optional().describe('Link visibility setting'),
            audience: z.string().optional().describe('Effective link audience'),
            expires: z.string().optional().describe('Link expiration time'),
            linkAccessLevel: z.string().optional().describe('Access level of the link'),
            allowDownload: z
              .boolean()
              .optional()
              .describe('Whether the shared link permits downloads'),
            passwordProtected: z
              .boolean()
              .optional()
              .describe('Whether the shared link is password protected')
          })
        )
        .optional()
        .describe('List of shared links (for "list" and "create" actions)'),
      cursor: z.string().optional().describe('Cursor for fetching more shared links'),
      hasMore: z.boolean().optional().describe('Whether more shared links are available'),
      revoked: z.boolean().optional().describe('Whether the link was successfully revoked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      if (!ctx.input.path) {
        throw dropboxServiceError('path is required to create a shared link.');
      }
      let link = await client.createSharedLink(ctx.input.path, {
        requestedVisibility: ctx.input.visibility,
        audience: ctx.input.audience,
        access: ctx.input.access,
        password: ctx.input.password,
        expires: ctx.input.expires,
        allowDownload: ctx.input.allowDownload
      });

      return {
        output: {
          links: [
            {
              url: link.url,
              name: link.name,
              id: link.id,
              pathLower: link.path_lower,
              visibility: link.link_permissions?.resolved_visibility?.['.tag'],
              audience: link.link_permissions?.effective_audience?.['.tag'],
              expires: link.expires,
              linkAccessLevel: link.link_permissions?.link_access_level?.['.tag'],
              allowDownload: link.link_permissions?.allow_download,
              passwordProtected: link.link_permissions?.require_password
            }
          ]
        },
        message: `Created shared link for **${link.name}**: ${link.url}`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listSharedLinks(
        ctx.input.path,
        ctx.input.cursor,
        ctx.input.directOnly
      );
      let links = (result.links || []).map((link: any) => ({
        url: link.url,
        name: link.name,
        id: link.id,
        pathLower: link.path_lower,
        visibility: link.link_permissions?.resolved_visibility?.['.tag'],
        audience: link.link_permissions?.effective_audience?.['.tag'],
        expires: link.expires,
        linkAccessLevel: link.link_permissions?.link_access_level?.['.tag'],
        allowDownload: link.link_permissions?.allow_download,
        passwordProtected: link.link_permissions?.require_password
      }));

      return {
        output: {
          links,
          cursor: result.cursor,
          hasMore: result.has_more
        },
        message: `Found **${links.length}** shared links${ctx.input.path ? ` for **${ctx.input.path}**` : ''}.`
      };
    }

    // revoke
    if (!ctx.input.linkUrl) {
      throw dropboxServiceError('linkUrl is required to revoke a shared link.');
    }
    await client.revokeSharedLink(ctx.input.linkUrl);
    return {
      output: { revoked: true },
      message: `Revoked shared link: ${ctx.input.linkUrl}`
    };
  })
  .build();
