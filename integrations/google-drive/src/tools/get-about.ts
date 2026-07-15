import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let getAboutTool = SlateTool.create(spec, {
  name: 'Get Drive Account Information',
  key: 'get_about',
  description:
    "Get information about the authenticated Google Drive user and the user's storage quota.",
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.getAbout)
  .input(z.object({}))
  .output(
    z.object({
      userId: z
        .string()
        .optional()
        .describe("Authenticated user's Drive permission ID, when Drive returns it"),
      displayName: z
        .string()
        .optional()
        .describe("Authenticated user's display name, when Drive returns it"),
      emailAddress: z
        .string()
        .optional()
        .describe("Authenticated user's email address, when Drive returns it"),
      storageQuotaLimit: z
        .string()
        .optional()
        .describe('Storage quota limit in bytes; absent for unlimited storage'),
      storageQuotaUsage: z.string().optional().describe('Total storage quota usage in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let about = await client.getAbout();

    let identity =
      about.displayName && about.emailAddress
        ? `**${about.displayName}** (${about.emailAddress})`
        : (about.displayName ?? about.emailAddress);

    return {
      output: about,
      message: identity
        ? `Authenticated as ${identity}.`
        : 'Retrieved Google Drive account information.'
    };
  })
  .build();
