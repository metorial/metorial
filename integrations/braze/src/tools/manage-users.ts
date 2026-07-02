import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError, requireBrazeArray } from '../lib/errors';
import { spec } from '../spec';

let userAliasSchema = z.object({
  aliasName: z.string().describe('Alias name'),
  aliasLabel: z.string().describe('Alias label')
});

let prioritizationSchema = z
  .array(
    z.enum(['identified', 'unidentified', 'most_recently_updated', 'least_recently_updated'])
  )
  .describe('Braze prioritization order for identifying email-only or phone-only users');

export let manageUserIdentity = SlateTool.create(spec, {
  name: 'Manage User Identity',
  key: 'manage_user_identity',
  description: `Create Braze user aliases or identify alias-only, email-only, or phone-only users by assigning them an external ID. Use this for identity resolution workflows before tracking or messaging users.`,
  instructions: [
    'Use action "create_aliases" to add aliases to existing external IDs.',
    'Use action "identify_aliases" to assign external IDs to alias-only users.',
    'Use action "identify_emails" or "identify_phones" to identify email-only or phone-only users with prioritization.'
  ],
  constraints: ['Maximum 50 identity operations per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create_aliases', 'identify_aliases', 'identify_emails', 'identify_phones'])
        .describe('Identity operation to perform'),
      aliases: z
        .array(
          z.object({
            externalId: z.string().describe('External user ID'),
            aliasName: z.string().describe('Alias name'),
            aliasLabel: z.string().describe('Alias label')
          })
        )
        .optional()
        .describe('Aliases to create for existing external IDs'),
      aliasesToIdentify: z
        .array(
          z.object({
            externalId: z.string().describe('External user ID to assign'),
            userAlias: userAliasSchema.describe('Existing alias-only user alias')
          })
        )
        .optional()
        .describe('Alias-only users to identify with external IDs'),
      emailsToIdentify: z
        .array(
          z.object({
            externalId: z.string().describe('External user ID to assign'),
            email: z.string().describe('Email-only user address to identify'),
            prioritization: prioritizationSchema
          })
        )
        .optional()
        .describe('Email-only users to identify with external IDs'),
      phoneNumbersToIdentify: z
        .array(
          z.object({
            externalId: z.string().describe('External user ID to assign'),
            phone: z.string().describe('Phone-only user number to identify'),
            prioritization: prioritizationSchema
          })
        )
        .optional()
        .describe('Phone-only users to identify with external IDs')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Response status from Braze'),
      errors: z.array(z.any()).optional().describe('Errors encountered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    switch (ctx.input.action) {
      case 'create_aliases': {
        let aliases = requireBrazeArray(ctx.input.aliases, 'aliases', 'create_aliases');
        if (aliases.length > 50) {
          throw brazeServiceError(
            'manage_user_identity accepts at most 50 aliases per request.'
          );
        }
        let result = await client.createUserAliases(aliases);

        return {
          output: {
            message: result.message,
            errors: result.errors
          },
          message: `Created **${aliases.length}** user alias(es).`
        };
      }
      case 'identify_aliases': {
        let aliasesToIdentify = requireBrazeArray(
          ctx.input.aliasesToIdentify,
          'aliasesToIdentify',
          'identify_aliases'
        );
        if (aliasesToIdentify.length > 50) {
          throw brazeServiceError(
            'manage_user_identity accepts at most 50 aliases per request.'
          );
        }
        let result = await client.identifyUsers({ aliasesToIdentify });

        return {
          output: {
            message: result.message,
            errors: result.errors
          },
          message: `Identified **${aliasesToIdentify.length}** user alias(es).`
        };
      }
      case 'identify_emails': {
        let emailsToIdentify = requireBrazeArray(
          ctx.input.emailsToIdentify,
          'emailsToIdentify',
          'identify_emails'
        );
        if (emailsToIdentify.length > 50) {
          throw brazeServiceError(
            'manage_user_identity accepts at most 50 emails per request.'
          );
        }
        let result = await client.identifyUsers({ emailsToIdentify });

        return {
          output: {
            message: result.message,
            errors: result.errors
          },
          message: `Identified **${emailsToIdentify.length}** email-only user(s).`
        };
      }
      case 'identify_phones': {
        let phoneNumbersToIdentify = requireBrazeArray(
          ctx.input.phoneNumbersToIdentify,
          'phoneNumbersToIdentify',
          'identify_phones'
        );
        if (phoneNumbersToIdentify.length > 50) {
          throw brazeServiceError(
            'manage_user_identity accepts at most 50 phone numbers per request.'
          );
        }
        let result = await client.identifyUsers({ phoneNumbersToIdentify });

        return {
          output: {
            message: result.message,
            errors: result.errors
          },
          message: `Identified **${phoneNumbersToIdentify.length}** phone-only user(s).`
        };
      }
    }
  })
  .build();

export let deleteUsers = SlateTool.create(spec, {
  name: 'Delete Users',
  key: 'delete_users',
  description: `Permanently delete user profiles from Braze by external IDs, Braze IDs, or user aliases. This is irreversible and will remove all data associated with the user profiles.`,
  constraints: [
    'Maximum 50 users per request.',
    'Shares a rate limit of 20,000 requests per minute with other user management endpoints.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      externalIds: z.array(z.string()).optional().describe('External user IDs to delete'),
      brazeIds: z.array(z.string()).optional().describe('Braze internal user IDs to delete'),
      userAliases: z
        .array(
          z.object({
            aliasName: z.string().describe('Alias name'),
            aliasLabel: z.string().describe('Alias label')
          })
        )
        .optional()
        .describe('User aliases to delete')
    })
  )
  .output(
    z.object({
      deleted: z.number().describe('Number of user profiles queued for deletion'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let count =
      (ctx.input.externalIds?.length ?? 0) +
      (ctx.input.brazeIds?.length ?? 0) +
      (ctx.input.userAliases?.length ?? 0);

    if (count === 0) {
      throw brazeServiceError('Provide externalIds, brazeIds, or userAliases to delete.');
    }

    if (count > 50) {
      throw brazeServiceError('delete_users accepts at most 50 users per request.');
    }

    let result = await client.deleteUsers({
      externalIds: ctx.input.externalIds,
      brazeIds: ctx.input.brazeIds,
      userAliases: ctx.input.userAliases
    });

    return {
      output: {
        deleted: result.deleted ?? 0,
        message: result.message
      },
      message: `Queued **${result.deleted ?? 0}** user profile(s) for deletion.`
    };
  })
  .build();

export let mergeUsers = SlateTool.create(spec, {
  name: 'Merge Users',
  key: 'merge_users',
  description: `Merge one user profile into another in Braze. The source user's data is merged into the target user, and the source profile is removed. Useful for deduplicating user profiles.`,
  instructions: [
    'Each merge requires an identifier for the user to keep and the user to merge (remove).',
    'Identifiers can be external_id, user_alias, or braze_id objects.'
  ],
  constraints: [
    'Maximum 50 merge operations per request.',
    'Shares a rate limit of 20,000 requests per minute with other user management endpoints.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mergeUpdates: z
        .array(
          z.object({
            identifierToKeep: z
              .record(z.string(), z.any())
              .describe(
                'Identifier of the user profile to keep (e.g. { external_id: "keep_id" })'
              ),
            identifierToMerge: z
              .record(z.string(), z.any())
              .describe(
                'Identifier of the user profile to merge and remove (e.g. { external_id: "merge_id" })'
              )
          })
        )
        .describe('List of merge operations to perform')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Response status from Braze'),
      errors: z.array(z.any()).optional().describe('Errors encountered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let mergeUpdates = requireBrazeArray(ctx.input.mergeUpdates, 'mergeUpdates');
    if (mergeUpdates.length > 50) {
      throw brazeServiceError('merge_users accepts at most 50 merge operations per request.');
    }

    let result = await client.mergeUsers(mergeUpdates);

    return {
      output: {
        message: result.message,
        errors: result.errors
      },
      message: `Processed **${mergeUpdates.length}** user merge operation(s).`
    };
  })
  .build();
