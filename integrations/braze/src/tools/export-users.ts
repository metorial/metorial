import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let exportUsers = SlateTool.create(spec, {
  name: 'Export Users',
  key: 'export_users',
  description: `Export user profiles from Braze by identifiers (external IDs, Braze IDs, emails, phone numbers, or user aliases). Returns full user profile data including attributes, custom events summary, purchases, and device info. Optionally filter which fields to export.`,
  instructions: [
    'Provide at least one identifier type to look up users.',
    'Use fieldsToExport to limit the response to specific profile fields.'
  ],
  constraints: [
    'Rate limited to 250 requests per minute.',
    'Maximum of 50 identifiers per request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      externalIds: z.array(z.string()).optional().describe('External user IDs to export'),
      brazeIds: z.array(z.string()).optional().describe('Braze internal user IDs to export'),
      emails: z.array(z.string()).optional().describe('Email addresses to look up'),
      phones: z.array(z.string()).optional().describe('Phone numbers to look up'),
      userAliases: z
        .array(
          z.object({
            aliasName: z.string().describe('Alias name'),
            aliasLabel: z.string().describe('Alias label')
          })
        )
        .optional()
        .describe('User aliases to look up'),
      fieldsToExport: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to include in the export (e.g. external_id, first_name, email, custom_attributes)'
        )
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('Exported user profiles'),
      message: z.string().describe('Response status from Braze'),
      invalidIds: z.array(z.string()).optional().describe('IDs that could not be found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.exportUsersByIds({
      externalIds: ctx.input.externalIds,
      brazeIds: ctx.input.brazeIds,
      emails: ctx.input.emails,
      phones: ctx.input.phones,
      userAliases: ctx.input.userAliases,
      fieldsToExport: ctx.input.fieldsToExport
    });

    return {
      output: {
        users: result.users ?? [],
        message: result.message,
        invalidIds: result.invalid_user_ids
      },
      message: `Exported **${(result.users ?? []).length}** user profile(s).${result.invalid_user_ids?.length ? ` ${result.invalid_user_ids.length} ID(s) not found.` : ''}`
    };
  })
  .build();
