import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific Duo user, including associated phones, tokens, groups, and WebAuthn credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Duo user ID to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      email: z.string().optional(),
      realname: z.string().optional(),
      firstname: z.string().optional(),
      lastname: z.string().optional(),
      status: z.string(),
      isEnrolled: z.boolean(),
      lastLogin: z.number().nullable().optional(),
      created: z.number().optional(),
      notes: z.string().optional(),
      phones: z
        .array(
          z.object({
            phoneId: z.string(),
            number: z.string().optional(),
            name: z.string().optional(),
            type: z.string().optional(),
            platform: z.string().optional(),
            activated: z.boolean().optional()
          })
        )
        .optional(),
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            name: z.string()
          })
        )
        .optional(),
      tokens: z
        .array(
          z.object({
            tokenId: z.string(),
            serial: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.getUser(ctx.input.userId);
    let u = result.response;

    let phones = (u.phones || []).map((p: any) => ({
      phoneId: p.phone_id,
      number: p.number || undefined,
      name: p.name || undefined,
      type: p.type || undefined,
      platform: p.platform || undefined,
      activated: p.activated
    }));

    let groups = (u.groups || []).map((g: any) => ({
      groupId: g.group_id,
      name: g.name
    }));

    let tokens = (u.tokens || []).map((t: any) => ({
      tokenId: t.token_id,
      serial: t.serial || undefined,
      type: t.type || undefined
    }));

    return {
      output: {
        userId: u.user_id,
        username: u.username,
        email: u.email || undefined,
        realname: u.realname || undefined,
        firstname: u.firstname || undefined,
        lastname: u.lastname || undefined,
        status: u.status,
        isEnrolled: u.is_enrolled,
        lastLogin: u.last_login ?? null,
        created: u.created,
        notes: u.notes || undefined,
        phones,
        groups,
        tokens
      },
      message: `Retrieved user **${u.username}** (status: ${u.status}, enrolled: ${u.is_enrolled}).`
    };
  })
  .build();
