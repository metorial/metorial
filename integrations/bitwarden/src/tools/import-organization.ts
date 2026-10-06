import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importOrganization = SlateTool.create(spec, {
  name: 'Import Organization Data',
  key: 'import_organization',
  description: `Bulk import members and groups from an external directory or system. This is useful for directory synchronization scenarios where you need to sync users and groups from an identity provider into Bitwarden.`,
  instructions: [
    'Set overwriteExisting to true to replace existing directory-synced data. Use with caution as this may remove existing members/groups.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      groups: z
        .array(
          z.object({
            name: z.string().describe('Group name (max 100 characters)'),
            externalId: z
              .string()
              .describe('External identifier for the group (max 300 characters)'),
            memberExternalIds: z
              .array(z.string())
              .describe('External IDs of members to include in this group')
          })
        )
        .default([])
        .describe('Groups to import'),
      members: z
        .array(
          z.object({
            email: z.string().nullable().describe('Email address of the member'),
            externalId: z
              .string()
              .describe('External identifier for the member (max 300 characters)'),
            deleted: z
              .boolean()
              .default(false)
              .describe('Whether the member should be marked as deleted')
          })
        )
        .default([])
        .describe('Members to import'),
      overwriteExisting: z
        .boolean()
        .default(false)
        .describe('Whether to overwrite existing directory-synced data')
    })
  )
  .output(
    z.object({
      imported: z.boolean().describe('Whether the import succeeded'),
      groupCount: z
        .number()
        .describe(
          'Number of group entries submitted; not an independent count of resulting groups'
        ),
      memberCount: z
        .number()
        .describe(
          'Number of member entries submitted; not an independent count of resulting members'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    await client.importOrganization({
      groups: ctx.input.groups,
      members: ctx.input.members.map(member => ({
        email: member.email,
        externalId: member.externalId,
        deleted: member.deleted
      })),
      overwriteExisting: ctx.input.overwriteExisting
    });

    return {
      output: {
        imported: true,
        groupCount: ctx.input.groups.length,
        memberCount: ctx.input.members.length
      },
      message: `Bitwarden acknowledged the import of **${ctx.input.groups.length}** group entries and **${ctx.input.members.length}** member entries. Verify resulting state before repeating this operation.`
    };
  })
  .build();
