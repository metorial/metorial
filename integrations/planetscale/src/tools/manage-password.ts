import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireAtLeastOne, requireField } from '../lib/errors';
import { spec } from '../spec';

export let managePassword = SlateTool.create(spec, {
  name: 'Manage Password',
  key: 'manage_password',
  description: `Create, list, update, renew, or delete connection credentials (passwords) for a database branch. Passwords are scoped to a specific branch and can be configured with TTLs, CIDR restrictions, and direct vtgate access. The plaintext password is only returned on creation.`,
  instructions: [
    'Use action "list" to list all passwords for a branch.',
    'Use action "create" to create a new password (the plaintext value is only available in the response on creation).',
    'Use action "get" to get details about a specific password.',
    'Use action "update" to update the name or CIDR restrictions of a password.',
    'Use action "renew" to renew an expiring password.',
    'Use action "delete" to permanently delete a password.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name of the branch'),
      action: z
        .enum(['list', 'create', 'get', 'update', 'renew', 'delete'])
        .describe('Action to perform'),
      passwordId: z
        .string()
        .optional()
        .describe('Password ID (required for get, update, renew, delete)'),
      name: z
        .string()
        .optional()
        .describe('Display name for the password (used with create/update)'),
      replica: z
        .boolean()
        .optional()
        .describe('Whether this is a read replica password (used with create)'),
      ttl: z
        .number()
        .optional()
        .describe('Time-to-live in seconds for the password (used with create)'),
      cidrs: z
        .array(z.string())
        .optional()
        .describe('Allowed IP/CIDR ranges (used with create/update)'),
      directVtgate: z
        .boolean()
        .optional()
        .describe('Create a direct vtgate password (used with create)'),
      page: z.number().optional().describe('Page number for list pagination'),
      perPage: z.number().optional().describe('Results per page for list pagination')
    })
  )
  .output(
    z.object({
      passwords: z
        .array(
          z.object({
            passwordId: z.string(),
            name: z.string().optional(),
            username: z.string().optional(),
            plainText: z
              .string()
              .optional()
              .describe('Plaintext password (only available on creation)'),
            accessHostUrl: z.string().optional(),
            accessHostRegionalUrl: z.string().optional(),
            directVtgate: z.boolean().optional(),
            expired: z.boolean().optional(),
            expiresAt: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      password: z
        .object({
          passwordId: z.string(),
          name: z.string().optional(),
          username: z.string().optional(),
          plainText: z.string().optional(),
          accessHostUrl: z.string().optional(),
          accessHostRegionalUrl: z.string().optional(),
          directVtgate: z.boolean().optional(),
          expired: z.boolean().optional(),
          expiresAt: z.string().optional(),
          cidrs: z.array(z.string()).optional(),
          replica: z.boolean().optional(),
          renewable: z.boolean().optional(),
          createdAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      currentPage: z.number().optional(),
      nextPage: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let { databaseName, branchName, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listPasswords(databaseName, branchName, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let passwords = result.data.map((p: any) => ({
        passwordId: p.id,
        name: p.name,
        username: p.username,
        accessHostUrl: p.access_host_url,
        accessHostRegionalUrl: p.access_host_regional_url,
        directVtgate: p.direct_vtgate,
        expired: p.expired,
        expiresAt: p.expires_at,
        createdAt: p.created_at
      }));

      return {
        output: { passwords, currentPage: result.currentPage, nextPage: result.nextPage },
        message: `Found **${passwords.length}** password(s) for branch **${branchName}**.`
      };
    }

    if (action === 'delete') {
      let passwordId = requireField(ctx.input.passwordId, 'passwordId', 'delete action');
      await client.deletePassword(databaseName, branchName, passwordId);
      return {
        output: { deleted: true },
        message: `Deleted password **${passwordId}** from branch **${branchName}**.`
      };
    }

    let pw: any;
    switch (action) {
      case 'create':
        pw = await client.createPassword(databaseName, branchName, {
          name: ctx.input.name,
          replica: ctx.input.replica,
          ttl: ctx.input.ttl,
          cidrs: ctx.input.cidrs,
          directVtgate: ctx.input.directVtgate
        });
        break;
      case 'get':
        pw = await client.getPassword(
          databaseName,
          branchName,
          requireField(ctx.input.passwordId, 'passwordId', 'get action')
        );
        break;
      case 'update':
        requireAtLeastOne(
          { name: ctx.input.name, cidrs: ctx.input.cidrs },
          'Provide name or cidrs when updating a PlanetScale password.'
        );
        pw = await client.updatePassword(
          databaseName,
          branchName,
          requireField(ctx.input.passwordId, 'passwordId', 'update action'),
          {
            name: ctx.input.name,
            cidrs: ctx.input.cidrs
          }
        );
        break;
      case 'renew':
        pw = await client.renewPassword(
          databaseName,
          branchName,
          requireField(ctx.input.passwordId, 'passwordId', 'renew action')
        );
        break;
    }

    return {
      output: {
        password: {
          passwordId: pw.id,
          name: pw.name,
          username: pw.username,
          plainText: pw.plain_text,
          accessHostUrl: pw.access_host_url,
          accessHostRegionalUrl: pw.access_host_regional_url,
          directVtgate: pw.direct_vtgate,
          expired: pw.expired,
          expiresAt: pw.expires_at,
          cidrs: pw.cidrs,
          replica: pw.replica,
          renewable: pw.renewable,
          createdAt: pw.created_at
        }
      },
      message:
        action === 'create'
          ? `Created password **${pw.name || pw.id}** for branch **${branchName}**.`
          : `${action === 'get' ? 'Retrieved' : action === 'update' ? 'Updated' : 'Renewed'} password **${pw.name || pw.id}** for branch **${branchName}**.`
    };
  });
