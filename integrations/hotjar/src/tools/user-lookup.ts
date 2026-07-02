import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userLookup = SlateTool.create(spec, {
  name: 'User Lookup & Deletion',
  key: 'user_lookup',
  description: `Look up or delete a user's data in Hotjar for GDPR and privacy compliance. Searches by email address and/or site-specific user IDs. Can either generate a data report (sent via email) or immediately delete all matching data.`,
  instructions: [
    'At least one of `email` or `siteUserIdMap` must be provided.',
    'Set `deleteAllHits` to true to immediately delete all found data. Use with caution — this action is irreversible.',
    'When `deleteAllHits` is false, a data report link is emailed to the subject and the default recipient.',
    'The `organizationId` from global config is required. Set it in the Hotjar integration configuration.'
  ],
  constraints: [
    'Available on Observe and Ask Scale plans.',
    'Requires organization-level API credentials with user lookup scope.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'Hotjar Organization ID. Overrides the value from global config if provided.'
        ),
      email: z.string().optional().describe('Email address of the data subject to look up.'),
      siteUserIdMap: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Map of Hotjar site IDs to user IDs on your site. Used when user IDs were sent via the Identify API.'
        ),
      deleteAllHits: z
        .boolean()
        .default(false)
        .describe(
          'If true, immediately deletes all found data. If false, sends a data report via email.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was processed successfully.'),
      requestSummary: z.string().describe('Summary of the lookup/deletion request.')
    })
  )
  .handleInvocation(async ctx => {
    let organizationId = ctx.input.organizationId || ctx.config.organizationId;

    if (!organizationId) {
      throw new Error(
        'Organization ID is required. Provide it as input or set it in the global configuration.'
      );
    }

    if (!ctx.input.email && !ctx.input.siteUserIdMap) {
      throw new Error('At least one of email or siteUserIdMap must be provided.');
    }

    let client = new Client({ token: ctx.auth.token });

    let requestBody: {
      data_subject_email?: string;
      data_subject_site_id_to_user_id_map?: Record<string, string>;
      delete_all_hits: boolean;
    } = {
      delete_all_hits: ctx.input.deleteAllHits
    };

    if (ctx.input.email) {
      requestBody.data_subject_email = ctx.input.email;
    }

    if (ctx.input.siteUserIdMap) {
      requestBody.data_subject_site_id_to_user_id_map = ctx.input.siteUserIdMap;
    }

    await client.userLookup(organizationId, requestBody);

    let action = ctx.input.deleteAllHits ? 'deletion' : 'lookup';
    let identifiers = [
      ctx.input.email ? `email: ${ctx.input.email}` : null,
      ctx.input.siteUserIdMap
        ? `site user IDs: ${Object.keys(ctx.input.siteUserIdMap).length} site(s)`
        : null
    ]
      .filter(Boolean)
      .join(', ');

    let summary = ctx.input.deleteAllHits
      ? `User data deletion request submitted for ${identifiers}. All matching data will be permanently deleted.`
      : `User data lookup request submitted for ${identifiers}. A data report link will be emailed to the data subject and the default recipient.`;

    return {
      output: {
        success: true,
        requestSummary: summary
      },
      message: `User ${action} request processed successfully for ${identifiers}.`
    };
  })
  .build();
