import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { permissionsSchema } from '../lib/contracts';
import { spec } from '../spec';

export let inviteMember = SlateTool.create(spec, {
  name: 'Invite Member',
  key: 'invite_member',
  description: `Invite a new member to the Bitwarden organization by email. You can assign a role, specify individual collection assignments and supported permission flags. The current Public API does not accept the legacy accessAll flag.`,
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
        .describe(
          'Role to assign: 0=Owner, 1=Admin, 2=User, 4=Custom; legacy role 3 is unsupported'
        ),
      accessAll: z
        .boolean()
        .default(false)
        .describe(
          'Legacy field: false only. Use explicit collection assignments; true is unsupported by the current Public API.'
        ),
      permissions: permissionsSchema
        .optional()
        .describe('Explicit complete Custom-role permissions; required when type is 4.'),
      externalId: z.string().optional().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID to assign'),
            readOnly: z.boolean().default(false).describe('Whether access is read-only'),
            hidePasswords: z
              .boolean()
              .optional()
              .describe(
                'Hide passwords permission; omitted values preserve existing assignment settings on updates.'
              ),
            manage: z
              .boolean()
              .optional()
              .describe(
                'Manage collection permission; omitted values preserve existing assignment settings on updates.'
              )
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
      ...ctx.auth
    });

    let result = await client.inviteMember({
      permissions: ctx.input.permissions,
      email: ctx.input.email,
      type: ctx.input.type,
      accessAll: ctx.input.accessAll,
      externalId: ctx.input.externalId,
      collections: ctx.input.collections?.map(c => ({
        id: c.collectionId,
        readOnly: c.readOnly,
        hidePasswords: c.hidePasswords,
        manage: c.manage
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
