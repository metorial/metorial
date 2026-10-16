import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let externalUserInput = z.object({
  externalId: z.string().describe('Unique external identifier for the user'),
  email: z.string().optional().describe('Email address of the user'),
  name: z.string().optional().describe('Display name of the user'),
  accountExternalId: z.string().optional().describe("External ID of the user's account"),
  accountName: z.string().optional().describe("Name of the user's account")
});

export let importExternalUsers = SlateTool.create(spec, {
  name: 'Import External Users',
  key: 'import_external_users',
  description: `Bulk import external users into UserVoice. Associates users from your system with UserVoice users for feedback tracking. Each user can optionally embed an associated external account.`,
  constraints: ['Maximum 1,000 users per import call.']
})
  .input(
    z.object({
      users: z
        .array(externalUserInput)
        .min(1)
        .max(1000)
        .describe('Array of external users to import')
    })
  )
  .output(
    z.object({
      importedCount: z.number().optional().describe('Number of users processed'),
      success: z.boolean().optional().describe('Whether the import was successful'),
      response: z.unknown().optional().describe('Provider import response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain,
      legacySubdomain: ctx.config.subdomain
    });

    let apiUsers = ctx.input.users.map(u => {
      let user: Record<string, any> = {
        external_id: u.externalId
      };
      if (u.email !== undefined) user.email = u.email;
      if (u.name !== undefined) user.name = u.name;
      if (u.accountExternalId !== undefined) {
        user.account = {
          external_id: u.accountExternalId,
          name: u.accountName
        };
      }
      return user;
    });

    let result = await client.importExternalUsers(apiUsers);

    return {
      output: {
        importedCount:
          typeof result?.imported_count === 'number' ? result.imported_count : undefined,
        success: typeof result?.success === 'boolean' ? result.success : undefined,
        response: result
      },
      message: `Completed the external user import request.`
    };
  })
  .build();
