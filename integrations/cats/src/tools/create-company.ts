import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company (client organization) record in CATS. Companies represent the organizations your agency works with.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional()
        })
        .optional()
        .describe('Company address'),
      countryCode: z.string().optional().describe('ISO 3166 Alpha-2 country code'),
      website: z.string().optional().describe('Company website'),
      notes: z.string().optional().describe('Notes'),
      phone: z.string().optional().describe('Main phone number'),
      faxNumber: z.string().optional().describe('Fax number'),
      ownerId: z.number().optional().describe('Owner user ID'),
      isHot: z.boolean().optional().describe('Mark as hot'),
      keyTechnologies: z.string().optional().describe('Key technologies')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the created company'),
      name: z.string().optional().describe('Company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.ownerId === undefined)
      throw createApiServiceError(
        'ownerId is required by CATS. Call list_users to discover user IDs.'
      );

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.address !== undefined) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode
      };
    }
    if (ctx.input.countryCode !== undefined) body.country_code = ctx.input.countryCode;
    if (ctx.input.website !== undefined) body.website = ctx.input.website;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    let phones: { number: string; type: string }[] = [];
    if (ctx.input.phone !== undefined) phones.push({ number: ctx.input.phone, type: 'main' });
    if (ctx.input.faxNumber !== undefined)
      phones.push({ number: ctx.input.faxNumber, type: 'fax' });
    if (phones.length) body.phones = phones;
    if (ctx.input.ownerId !== undefined) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;
    if (ctx.input.keyTechnologies !== undefined)
      body.key_technologies = ctx.input.keyTechnologies;

    let result = await client.createCompany(body);
    let companyId = requiredId(result?.id, 'created record');

    return {
      output: {
        companyId,
        name: ctx.input.name
      },
      message: `Created company **${ctx.input.name}** (ID: ${companyId}).`
    };
  })
  .build();
