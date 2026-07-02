import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError } from '../lib/errors';
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
      brazeId: z.string().optional().describe('Single Braze internal user ID to export'),
      deviceId: z.string().optional().describe('Single device ID to export'),
      email: z.string().optional().describe('Single email address to look up'),
      phone: z.string().optional().describe('Single phone number in E.164 format to look up'),
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

    let externalIdentifierCount =
      (ctx.input.externalIds?.length ?? 0) + (ctx.input.userAliases?.length ?? 0);
    let singleIdentifiers = [
      ctx.input.brazeId,
      ctx.input.deviceId,
      ctx.input.email,
      ctx.input.phone
    ].filter(Boolean);

    if (externalIdentifierCount === 0 && singleIdentifiers.length === 0) {
      throw brazeServiceError(
        'Provide externalIds, userAliases, brazeId, deviceId, email, or phone.'
      );
    }

    if (
      (ctx.input.externalIds?.length ?? 0) > 50 ||
      (ctx.input.userAliases?.length ?? 0) > 50
    ) {
      throw brazeServiceError('externalIds and userAliases can include at most 50 values.');
    }

    if (
      singleIdentifiers.length > 1 ||
      (singleIdentifiers.length === 1 && externalIdentifierCount > 0)
    ) {
      throw brazeServiceError(
        'Use only one singular identifier (brazeId, deviceId, email, or phone), and do not combine it with externalIds or userAliases.'
      );
    }

    let result = await client.exportUsersByIds({
      externalIds: ctx.input.externalIds,
      brazeId: ctx.input.brazeId,
      deviceId: ctx.input.deviceId,
      email: ctx.input.email,
      phone: ctx.input.phone,
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
