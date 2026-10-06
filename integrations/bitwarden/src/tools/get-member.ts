import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMember = SlateTool.create(spec, {
  name: 'Get Member',
  key: 'get_member',
  description: `Retrieve detailed information about a specific organization member, including their role, status, collection assignments, and group memberships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      memberId: z.string().describe('ID of the member to retrieve')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('Unique ID of the member'),
      userId: z.string().nullable().describe('Bitwarden user ID'),
      name: z.string().nullable().describe('Display name'),
      email: z.string().describe('Email address'),
      twoFactorEnabled: z.boolean().describe('Whether 2FA is enabled'),
      status: z
        .number()
        .describe('Member status: 0=Invited, 1=Accepted, 2=Confirmed, 3=Staged, -1=Revoked'),
      type: z
        .number()
        .describe('Role: 0=Owner, 1=Admin, 2=User, 4=Custom; legacy role 3 is unsupported'),
      accessAll: z
        .boolean()
        .nullable()
        .describe(
          'Legacy accessAll response, null when the current Public API does not expose this flag; collection assignments govern access'
        ),
      externalId: z.string().nullable().describe('External ID for directory sync'),
      collectionsAvailable: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider exposed this association field; false means the array does not establish current assignments.'
        ),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            readOnly: z.boolean().describe('Whether access is read-only'),
            hidePasswords: z.boolean().nullable().optional(),
            manage: z.boolean().nullable().optional()
          })
        )
        .describe('Assigned collections'),
      groupIds: z.array(z.string()).describe('IDs of groups this member belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let member = await client.getMember(ctx.input.memberId);
    let groupIds = await client.getMemberGroupIds(ctx.input.memberId);

    let output = {
      memberId: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      twoFactorEnabled: member.twoFactorEnabled,
      status: member.status,
      type: member.type,
      accessAll: member.accessAll,
      externalId: member.externalId,
      collectionsAvailable: member.collections !== undefined,
      collections: (member.collections ?? []).map(c => ({
        collectionId: c.id,
        readOnly: c.readOnly,
        hidePasswords: c.hidePasswords,
        manage: c.manage
      })),
      groupIds
    };

    return {
      output,
      message: `Retrieved member **${member.email}** (${member.name ?? 'no name'}).`
    };
  })
  .build();
