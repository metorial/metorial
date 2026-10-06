import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collectionAssociationSchema = z.object({
  collectionId: z.string().describe('ID of the collection'),
  readOnly: z.boolean().describe('Whether access is read-only'),
  hidePasswords: z.boolean().nullable().optional(),
  manage: z.boolean().nullable().optional()
});

let memberSchema = z.object({
  memberId: z.string().describe('Unique ID of the member in the organization'),
  userId: z.string().nullable().describe('Bitwarden user ID, null if not yet accepted'),
  name: z.string().nullable().describe('Display name of the member'),
  email: z.string().describe('Email address of the member'),
  twoFactorEnabled: z.boolean().describe('Whether two-factor authentication is enabled'),
  status: z
    .number()
    .describe('Member status: 0=Invited, 1=Accepted, 2=Confirmed, 3=Staged, -1=Revoked'),
  type: z
    .number()
    .describe('Member role: 0=Owner, 1=Admin, 2=User, 4=Custom; legacy role 3 is unsupported'),
  accessAll: z
    .boolean()
    .nullable()
    .describe(
      'Legacy accessAll response, null when the current Public API does not expose this flag; collection assignments govern access'
    ),
  externalId: z.string().nullable().describe('External identifier for directory sync'),
  collectionsAvailable: z
    .boolean()
    .optional()
    .describe(
      'Whether the provider exposed this association field; false means the array does not establish current assignments.'
    ),
  collections: z
    .array(collectionAssociationSchema)
    .describe('Collections assigned to this member')
});

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List all members of the Bitwarden organization. Returns each member's role, status, email, two-factor authentication state, and collection assignments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of organization members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let members = await client.listMembers();

    let mapped = members.map(m => ({
      memberId: m.id,
      userId: m.userId,
      name: m.name,
      email: m.email,
      twoFactorEnabled: m.twoFactorEnabled,
      status: m.status,
      type: m.type,
      accessAll: m.accessAll,
      externalId: m.externalId,
      collectionsAvailable: m.collections !== undefined,
      collections: (m.collections ?? []).map(c => ({
        collectionId: c.id,
        readOnly: c.readOnly,
        hidePasswords: c.hidePasswords,
        manage: c.manage
      }))
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** organization member(s).`
    };
  })
  .build();
