import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inviteMember = SlateTool.create(spec, {
  name: 'Invite Member',
  key: 'invite_member',
  description: `Invite a new member to the Bitwarden organization by email. You can assign a role, grant access to all collections, or specify individual collection assignments.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to invite'),
      type: z
        .number()
        .default(2)
        .describe('Role to assign: 0=Owner, 1=Admin, 2=User, 3=Manager'),
      accessAll: z
        .boolean()
        .default(false)
        .describe('Whether to grant access to all collections'),
      externalId: z.string().optional().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID to assign'),
            readOnly: z.boolean().default(false).describe('Whether access is read-only')
          })
        )
        .optional()
        .describe('Specific collections to assign access to')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the newly invited member'),
      email: z.string().describe('Email of the invited member'),
      status: z.number().describe('Member status (0=Invited)'),
      type: z.number().describe('Assigned role')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.inviteMember({
      email: ctx.input.email,
      type: ctx.input.type,
      accessAll: ctx.input.accessAll,
      externalId: ctx.input.externalId,
      collections: ctx.input.collections?.map(c => ({
        id: c.collectionId,
        readOnly: c.readOnly
      }))
    });

    return {
      output: {
        memberId: result.id,
        email: result.email,
        status: result.status,
        type: result.type
      },
      message: `Invited **${ctx.input.email}** to the organization.`
    };
  })
  .build();
