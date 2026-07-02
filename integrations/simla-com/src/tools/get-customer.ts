import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a single customer's full profile by their internal ID or external ID. Returns all customer details including contact information, segments, custom fields, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The customer ID to look up'),
      lookupBy: z
        .enum(['id', 'externalId'])
        .default('id')
        .describe('Whether to look up by internal ID or external ID')
    })
  )
  .output(
    z.object({
      customerId: z.number().optional().describe('Internal customer ID'),
      externalId: z.string().optional().describe('External customer ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      patronymic: z.string().optional(),
      email: z.string().optional(),
      phones: z.array(z.object({ number: z.string().optional() })).optional(),
      sex: z.string().optional(),
      birthday: z.string().optional(),
      createdAt: z.string().optional(),
      address: z
        .object({
          countryIso: z.string().optional(),
          region: z.string().optional(),
          city: z.string().optional(),
          street: z.string().optional(),
          building: z.string().optional(),
          flat: z.string().optional(),
          text: z.string().optional()
        })
        .optional(),
      vip: z.boolean().optional(),
      bad: z.boolean().optional(),
      personalDiscount: z.number().optional(),
      cumulativeDiscount: z.number().optional(),
      segments: z
        .array(
          z.object({
            segmentId: z.number().optional(),
            code: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional(),
      managerId: z.number().optional(),
      tags: z
        .array(z.object({ name: z.string().optional(), color: z.string().optional() }))
        .optional(),
      customFields: z.record(z.string(), z.any()).optional(),
      contragent: z.record(z.string(), z.any()).optional(),
      site: z.string().optional(),
      source: z
        .object({
          source: z.string().optional(),
          medium: z.string().optional(),
          campaign: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let c = await client.getCustomer(ctx.input.customerId, ctx.input.lookupBy);

    let name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';

    return {
      output: {
        customerId: c.id,
        externalId: c.externalId,
        firstName: c.firstName,
        lastName: c.lastName,
        patronymic: c.patronymic,
        email: c.email,
        phones: c.phones,
        sex: c.sex,
        birthday: c.birthday,
        createdAt: c.createdAt,
        address: c.address
          ? {
              countryIso: c.address.countryIso,
              region: c.address.region,
              city: c.address.city,
              street: c.address.street,
              building: c.address.building,
              flat: c.address.flat,
              text: c.address.text
            }
          : undefined,
        vip: c.vip,
        bad: c.bad,
        personalDiscount: c.personalDiscount,
        cumulativeDiscount: c.cumulativeDiscount,
        segments: c.segments?.map(s => ({
          segmentId: s.id,
          code: s.code,
          name: s.name
        })),
        managerId: c.managerId,
        tags: c.tags,
        customFields: c.customFields,
        contragent: c.contragent,
        site: c.site,
        source: c.source
          ? {
              source: c.source.source,
              medium: c.source.medium,
              campaign: c.source.campaign
            }
          : undefined
      },
      message: `Retrieved customer **${name}** (ID: ${c.id}).`
    };
  })
  .build();
