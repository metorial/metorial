import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company record. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('Company name'),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional()
        })
        .optional()
        .describe('Address'),
      countryCode: z.string().optional().describe('Country code'),
      website: z.string().optional().describe('Website'),
      notes: z.string().optional().describe('Notes'),
      ownerId: z.number().optional().describe('Owner user ID'),
      isHot: z.boolean().optional().describe('Whether hot'),
      keyTechnologies: z.string().optional().describe('Key technologies')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('Updated company ID'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.address) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode
      };
    }
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;
    if (ctx.input.keyTechnologies) body.key_technologies = ctx.input.keyTechnologies;

    await client.updateCompany(ctx.input.companyId, body);

    return {
      output: {
        companyId: ctx.input.companyId,
        updated: true
      },
      message: `Updated company **${ctx.input.companyId}**.`
    };
  })
  .build();
