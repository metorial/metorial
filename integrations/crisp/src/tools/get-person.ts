import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve a full contact profile from the Crisp CRM by people ID. Returns profile details, custom data, segments, and subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      peopleId: z.string().describe('The people profile ID')
    })
  )
  .output(
    z.object({
      peopleId: z.string().describe('People profile ID'),
      email: z.string().optional().describe('Contact email'),
      nickname: z.string().optional().describe('Contact nickname'),
      avatar: z.string().optional().describe('Contact avatar URL'),
      phone: z.string().optional().describe('Contact phone number'),
      address: z.string().optional().describe('Contact address'),
      segments: z.array(z.string()).optional().describe('Contact segments/tags'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom data key-value pairs'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let p = await client.getPeopleProfile(ctx.input.peopleId);

    return {
      output: {
        peopleId: p.people_id,
        email: p.email,
        nickname: p.person?.nickname,
        avatar: p.person?.avatar,
        phone: p.phone,
        address: p.address,
        segments: p.segments,
        customData: p.data,
        createdAt: p.created_at ? String(p.created_at) : undefined,
        updatedAt: p.updated_at ? String(p.updated_at) : undefined
      },
      message: `Retrieved contact **${p.person?.nickname || p.email || ctx.input.peopleId}**.`
    };
  })
  .build();
