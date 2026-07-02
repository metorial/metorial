import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve a list of Duo Security groups. Groups are used to organize users and apply policies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of groups to return (default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          status: z.string().optional(),
          pushEnabled: z.boolean().optional(),
          smsEnabled: z.boolean().optional(),
          voiceEnabled: z.boolean().optional(),
          mobileOtpEnabled: z.boolean().optional()
        })
      ),
      totalObjects: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.listGroups({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let groups = (result.response || []).map((g: any) => ({
      groupId: g.group_id,
      name: g.name,
      description: g.desc || undefined,
      status: g.status || undefined,
      pushEnabled: g.push_enabled,
      smsEnabled: g.sms_enabled,
      voiceEnabled: g.voice_enabled,
      mobileOtpEnabled: g.mobile_otp_enabled
    }));

    let totalObjects = result.metadata?.total_objects;
    let hasMore =
      totalObjects !== undefined
        ? (ctx.input.offset ?? 0) + groups.length < totalObjects
        : false;

    return {
      output: { groups, totalObjects, hasMore },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new Duo Security group for organizing users and applying access policies.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the group'),
      description: z.string().optional().describe('Description of the group'),
      status: z.enum(['Active', 'Bypass', 'Disabled']).optional().describe('Group status')
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.createGroup({
      name: ctx.input.name,
      desc: ctx.input.description,
      status: ctx.input.status
    });

    let g = result.response;
    return {
      output: {
        groupId: g.group_id,
        name: g.name,
        description: g.desc || undefined,
        status: g.status || undefined
      },
      message: `Created group **${g.name}**.`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a Duo Security group. Users in the group will be disassociated but not deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('The Duo group ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    await client.deleteGroup(ctx.input.groupId);
    return {
      output: { deleted: true },
      message: `Deleted group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
