import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let manageShareLink = SlateTool.create(spec, {
  name: 'Manage Share Link',
  key: 'manage_share_link',
  description: `Create, update, list, get, or delete share links (called "Bundles" in the API). Share links allow external users to access files with configurable security options including password protection, expiration dates, download limits, and registration requirements.`,
  instructions: [
    'When creating a share link, the "paths" field is required and should contain at least one file or folder path.',
    'The returned "url" is the public share link URL.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      bundleId: z
        .number()
        .optional()
        .describe('Share link ID (required for get, update, delete)'),
      paths: z
        .array(z.string())
        .optional()
        .describe('File or folder paths to include (required for create)'),
      password: z.string().optional().describe('Password to protect the share link'),
      expiresAt: z.string().optional().describe('Expiration date/time (ISO 8601)'),
      maxUses: z.number().optional().describe('Maximum number of accesses allowed'),
      description: z.string().optional().describe('Public-facing description'),
      note: z.string().optional().describe('Internal note (not visible to recipients)'),
      code: z.string().optional().describe('Custom URL code for the share link'),
      permissions: z
        .enum(['download', 'upload', 'full'])
        .optional()
        .describe('Access level for shared folders'),
      requireRegistration: z.boolean().optional().describe('Require name and email to access'),
      requireShareRecipient: z
        .boolean()
        .optional()
        .describe('Only allow access to explicitly invited recipients'),
      previewOnly: z.boolean().optional().describe('Allow preview only, no downloads'),
      startAccessOnDate: z
        .string()
        .optional()
        .describe('Date when access becomes available (ISO 8601)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      bundles: z
        .array(
          z.object({
            bundleId: z.number().describe('Share link ID'),
            url: z.string().optional().describe('Public share URL'),
            code: z.string().optional().describe('URL code'),
            description: z.string().optional().describe('Description'),
            expiresAt: z.string().optional().describe('Expiration date'),
            maxUses: z.number().optional().describe('Max uses'),
            passwordProtected: z.boolean().optional().describe('Whether password is set'),
            requireRegistration: z.boolean().optional().describe('Requires registration'),
            permissions: z.string().optional().describe('Access level'),
            createdAt: z.string().optional().describe('Creation date'),
            username: z.string().optional().describe('Creator username')
          })
        )
        .optional()
        .describe('List of share links'),
      bundle: z
        .object({
          bundleId: z.number().describe('Share link ID'),
          url: z.string().optional().describe('Public share URL'),
          code: z.string().optional().describe('URL code'),
          description: z.string().optional().describe('Description'),
          paths: z.array(z.string()).optional().describe('Included file/folder paths'),
          expiresAt: z.string().optional().describe('Expiration date'),
          maxUses: z.number().optional().describe('Max uses'),
          passwordProtected: z.boolean().optional().describe('Whether password is set'),
          requireRegistration: z.boolean().optional().describe('Requires registration'),
          permissions: z.string().optional().describe('Access level'),
          createdAt: z.string().optional().describe('Creation date')
        })
        .optional()
        .describe('Single share link details'),
      deleted: z.boolean().optional().describe('Whether the share link was deleted'),
      nextCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, bundleId } = ctx.input;

    if (action === 'list') {
      let result = await client.listBundles({
        cursor: ctx.input.cursor,
        perPage: ctx.input.perPage
      });

      let bundles = result.bundles.map((b: Record<string, unknown>) => ({
        bundleId: Number(b.id),
        url: b.url ? String(b.url) : undefined,
        code: b.code ? String(b.code) : undefined,
        description: b.description ? String(b.description) : undefined,
        expiresAt: b.expires_at ? String(b.expires_at) : undefined,
        maxUses: typeof b.max_uses === 'number' ? b.max_uses : undefined,
        passwordProtected:
          typeof b.password_protected === 'boolean' ? b.password_protected : undefined,
        requireRegistration:
          typeof b.require_registration === 'boolean' ? b.require_registration : undefined,
        permissions: b.permissions ? String(b.permissions) : undefined,
        createdAt: b.created_at ? String(b.created_at) : undefined,
        username: b.username ? String(b.username) : undefined
      }));

      return {
        output: { bundles, nextCursor: result.cursor },
        message: `Found **${bundles.length}** share links${result.cursor ? '. More results available.' : '.'}`
      };
    }

    if (action === 'get') {
      if (!bundleId) throw new Error('bundleId is required for get');
      let b = await client.getBundle(bundleId);
      let paths = Array.isArray(b.paths) ? b.paths.map(String) : undefined;
      return {
        output: {
          bundle: {
            bundleId: Number(b.id),
            url: b.url ? String(b.url) : undefined,
            code: b.code ? String(b.code) : undefined,
            description: b.description ? String(b.description) : undefined,
            paths,
            expiresAt: b.expires_at ? String(b.expires_at) : undefined,
            maxUses: typeof b.max_uses === 'number' ? b.max_uses : undefined,
            passwordProtected:
              typeof b.password_protected === 'boolean' ? b.password_protected : undefined,
            requireRegistration:
              typeof b.require_registration === 'boolean' ? b.require_registration : undefined,
            permissions: b.permissions ? String(b.permissions) : undefined,
            createdAt: b.created_at ? String(b.created_at) : undefined
          }
        },
        message: `Retrieved share link **${bundleId}**${b.url ? ` (${b.url})` : ''}`
      };
    }

    if (action === 'delete') {
      if (!bundleId) throw new Error('bundleId is required for delete');
      await client.deleteBundle(bundleId);
      return {
        output: { deleted: true },
        message: `Deleted share link **${bundleId}**`
      };
    }

    let data: Record<string, unknown> = {};
    if (ctx.input.paths !== undefined) data.paths = ctx.input.paths;
    if (ctx.input.password !== undefined) data.password = ctx.input.password;
    if (ctx.input.expiresAt !== undefined) data.expires_at = ctx.input.expiresAt;
    if (ctx.input.maxUses !== undefined) data.max_uses = ctx.input.maxUses;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.note !== undefined) data.note = ctx.input.note;
    if (ctx.input.code !== undefined) data.code = ctx.input.code;
    if (ctx.input.permissions !== undefined) data.permissions = ctx.input.permissions;
    if (ctx.input.requireRegistration !== undefined)
      data.require_registration = ctx.input.requireRegistration;
    if (ctx.input.requireShareRecipient !== undefined)
      data.require_share_recipient = ctx.input.requireShareRecipient;
    if (ctx.input.previewOnly !== undefined) data.preview_only = ctx.input.previewOnly;
    if (ctx.input.startAccessOnDate !== undefined)
      data.start_access_on_date = ctx.input.startAccessOnDate;

    if (action === 'create') {
      if (!ctx.input.paths || ctx.input.paths.length === 0)
        throw new Error('paths is required for create');
      let b = await client.createBundle(data);
      return {
        output: {
          bundle: {
            bundleId: Number(b.id),
            url: b.url ? String(b.url) : undefined,
            code: b.code ? String(b.code) : undefined,
            description: b.description ? String(b.description) : undefined,
            paths: ctx.input.paths,
            expiresAt: b.expires_at ? String(b.expires_at) : undefined,
            maxUses: typeof b.max_uses === 'number' ? b.max_uses : undefined,
            passwordProtected:
              typeof b.password_protected === 'boolean' ? b.password_protected : undefined,
            requireRegistration:
              typeof b.require_registration === 'boolean' ? b.require_registration : undefined,
            permissions: b.permissions ? String(b.permissions) : undefined,
            createdAt: b.created_at ? String(b.created_at) : undefined
          }
        },
        message: `Created share link${b.url ? `: ${b.url}` : ` (ID: ${b.id})`}`
      };
    }

    // update
    if (!bundleId) throw new Error('bundleId is required for update');
    let b = await client.updateBundle(bundleId, data);
    return {
      output: {
        bundle: {
          bundleId: Number(b.id),
          url: b.url ? String(b.url) : undefined,
          code: b.code ? String(b.code) : undefined,
          description: b.description ? String(b.description) : undefined,
          expiresAt: b.expires_at ? String(b.expires_at) : undefined,
          maxUses: typeof b.max_uses === 'number' ? b.max_uses : undefined,
          passwordProtected:
            typeof b.password_protected === 'boolean' ? b.password_protected : undefined,
          requireRegistration:
            typeof b.require_registration === 'boolean' ? b.require_registration : undefined,
          permissions: b.permissions ? String(b.permissions) : undefined,
          createdAt: b.created_at ? String(b.created_at) : undefined
        }
      },
      message: `Updated share link **${bundleId}**`
    };
  })
  .build();
