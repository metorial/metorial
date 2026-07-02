import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collectionAssociationSchema = z.object({
  collectionId: z.string().describe('ID of the collection'),
  readOnly: z.boolean().describe('Whether access is read-only')
});

let memberSchema = z.object({
  memberId: z.string().describe('Unique ID of the member in the organization'),
  userId: z.string().nullable().describe('Bitwarden user ID, null if not yet accepted'),
  name: z.string().nullable().describe('Display name of the member'),
  email: z.string().describe('Email address of the member'),
  twoFactorEnabled: z.boolean().describe('Whether two-factor authentication is enabled'),
  status: z.number().describe('Member status: 0=Invited, 1=Accepted, 2=Confirmed, -1=Revoked'),
  type: z.number().describe('Member role: 0=Owner, 1=Admin, 2=User, 3=Manager'),
  accessAll: z.boolean().describe('Whether the member has access to all collections'),
  externalId: z.string().nullable().describe('External identifier for directory sync'),
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
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
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
      collections: m.collections.map(c => ({
        collectionId: c.id,
        readOnly: c.readOnly
      }))
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** organization member(s).`
    };
  })
  .build();
