import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let listPhones = SlateTool.create(spec, {
  name: 'List Phones',
  key: 'list_phones',
  description: `Retrieve a list of phones registered in Duo Security. Phones are MFA devices associated with users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of phones to return (default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      phones: z.array(
        z.object({
          phoneId: z.string(),
          number: z.string().optional(),
          name: z.string().optional(),
          type: z.string().optional(),
          platform: z.string().optional(),
          activated: z.boolean().optional(),
          model: z.string().optional(),
          lastSeen: z.string().optional()
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

    let result = await client.listPhones({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let phones = (result.response || []).map((p: any) => ({
      phoneId: p.phone_id,
      number: p.number || undefined,
      name: p.name || undefined,
      type: p.type || undefined,
      platform: p.platform || undefined,
      activated: p.activated,
      model: p.model || undefined,
      lastSeen: p.last_seen || undefined
    }));

    let totalObjects = result.metadata?.total_objects;
    let hasMore =
      totalObjects !== undefined
        ? (ctx.input.offset ?? 0) + phones.length < totalObjects
        : false;

    return {
      output: { phones, totalObjects, hasMore },
      message: `Found **${phones.length}** phone(s).`
    };
  })
  .build();

export let createPhone = SlateTool.create(spec, {
  name: 'Create Phone',
  key: 'create_phone',
  description: `Register a new phone in Duo Security for use as an MFA device.`
})
  .input(
    z.object({
      number: z
        .string()
        .optional()
        .describe('Phone number in E.164 format (e.g., +15555550100)'),
      name: z.string().optional().describe('Display name for the phone'),
      type: z.enum(['Mobile', 'Landline']).optional().describe('Phone type'),
      platform: z
        .enum([
          'Google Android',
          'Apple iOS',
          'Windows Phone',
          'RIM Blackberry',
          'Java ME',
          'Palm webOS',
          'Symbian OS',
          'Windows Mobile',
          'Generic Smartphone',
          'Unknown'
        ])
        .optional()
        .describe('Mobile platform')
    })
  )
  .output(
    z.object({
      phoneId: z.string(),
      number: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
      platform: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.createPhone({
      number: ctx.input.number,
      name: ctx.input.name,
      type: ctx.input.type,
      platform: ctx.input.platform
    });

    let p = result.response;
    return {
      output: {
        phoneId: p.phone_id,
        number: p.number || undefined,
        name: p.name || undefined,
        type: p.type || undefined,
        platform: p.platform || undefined
      },
      message: `Created phone **${p.phone_id}**${p.number ? ` (${p.number})` : ''}.`
    };
  })
  .build();

export let deletePhone = SlateTool.create(spec, {
  name: 'Delete Phone',
  key: 'delete_phone',
  description: `Delete a phone from Duo Security. The phone will be disassociated from all users.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      phoneId: z.string().describe('The Duo phone ID to delete')
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

    await client.deletePhone(ctx.input.phoneId);
    return {
      output: { deleted: true },
      message: `Deleted phone \`${ctx.input.phoneId}\`.`
    };
  })
  .build();
