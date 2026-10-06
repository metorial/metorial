import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { permissionsSchema } from '../lib/contracts';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an organization member's role, collection assignments, external ID, and/or group memberships. Omitted external ID, collections, groups and existing Custom permissions are read back and preserved in the native replacement PUT. Supplied assignment arrays replace that entire assignment set.`,
  instructions: [
    'The legacy type and accessAll inputs are retained. Use the current role and accessAll=false; current native API uses collections and groups. There is no atomic compare-and-swap: avoid concurrent changes while applying this read-then-replace operation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().describe('ID of the member to update'),
      type: z
        .number()
        .describe('Role: 0=Owner, 1=Admin, 2=User, 4=Custom; legacy role 3 is unsupported'),
      accessAll: z
        .boolean()
        .describe(
          'Legacy field: false only. Current Public API uses explicit collections; true is refused before any change.'
        ),
      permissions: permissionsSchema
        .optional()
        .describe(
          'Complete Custom-role permissions; omission preserves current Custom permissions. Required when changing another role to Custom.'
        ),
      externalId: z.string().optional().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
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
        .describe('Collection assignments to set'),
      groupIds: z.array(z.string()).optional().describe('Group IDs to assign this member to')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the updated member'),
      email: z.string().describe('Email of the member'),
      type: z.number().describe('Updated role'),
      accessAll: z
        .boolean()
        .nullable()
        .describe(
          'Legacy accessAll response; null when not exposed by the current Public API'
        ),
      externalId: z.string().nullable().describe('Updated external ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let result = await client.updateMember(ctx.input.memberId, {
      type: ctx.input.type,
      accessAll: ctx.input.accessAll,
      externalId: ctx.input.externalId,
      groupIds: ctx.input.groupIds,
      permissions: ctx.input.permissions,
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
        type: result.type,
        accessAll: result.accessAll,
        externalId: result.externalId
      },
      message: `Updated member **${result.email}**.`
    };
  })
  .build();
