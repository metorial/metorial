import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an organization member's role, collection assignments, external ID, and/or group memberships. Provide only the fields you wish to change; unchanged fields should match current values.`,
  instructions: [
    'The type and accessAll fields are required by the API. If you only want to update groups, you should still pass the current type and accessAll values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().describe('ID of the member to update'),
      type: z.number().describe('Role: 0=Owner, 1=Admin, 2=User, 3=Manager'),
      accessAll: z.boolean().describe('Whether the member has access to all collections'),
      externalId: z.string().optional().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            readOnly: z.boolean().default(false).describe('Whether access is read-only')
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
      accessAll: z.boolean().describe('Updated access-all flag'),
      externalId: z.string().nullable().describe('Updated external ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.updateMember(ctx.input.memberId, {
      type: ctx.input.type,
      accessAll: ctx.input.accessAll,
      externalId: ctx.input.externalId,
      collections: ctx.input.collections?.map(c => ({
        id: c.collectionId,
        readOnly: c.readOnly
      }))
    });

    if (ctx.input.groupIds) {
      await client.updateMemberGroupIds(ctx.input.memberId, ctx.input.groupIds);
    }

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
