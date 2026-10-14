import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  regionCode: z.string().optional(),
  countryCode: z.string().describe('ISO 3166-1 alpha-2 country code')
});

export let manageCompany = SlateTool.create(spec, {
  name: 'Manage Company',
  key: 'manage_company',
  description: `Create, update, delete, or list company profiles. Companies can be linked to reservations for corporate bookings. Supports searching by text and filtering by property.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      companyId: z.string().optional().describe('Company ID (for get, update, delete)'),
      propertyId: z
        .string()
        .optional()
        .describe('Property ID from list_properties (for create and list).'),
      name: z.string().optional().describe('Company name (for create and update)'),
      code: z.string().optional().describe('Short company code (required for create)'),
      canCheckOutOnAr: z
        .boolean()
        .optional()
        .describe('Allow checkout on accounts receivable for create; defaults to false.'),
      taxId: z.string().optional().describe('Tax ID (for create and update)'),
      address: addressSchema.optional().describe('Company address (for create and update)'),
      textSearch: z.string().optional().describe('Search text (for list)'),
      pageNumber: z.number().optional(),
      pageSize: z.number().optional()
    })
  )
  .output(
    z.object({
      action: z.string(),
      success: z.boolean(),
      companyId: z.string().optional(),
      company: z
        .object({
          companyId: z.string().optional(),
          name: z.string().optional(),
          code: z.string().optional(),
          taxId: z.string().optional(),
          address: z.any().optional(),
          propertyId: z.string().optional(),
          created: z.string().optional()
        })
        .passthrough()
        .optional(),
      companies: z
        .array(
          z
            .object({
              companyId: z.string(),
              name: z.string().optional(),
              code: z.string().optional(),
              propertyId: z.string().optional()
            })
            .passthrough()
        )
        .optional(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let { action } = ctx.input;

    switch (action) {
      case 'list': {
        let result = await client.listCompanies({
          propertyId: ctx.input.propertyId || ctx.config.propertyId,
          textSearch: ctx.input.textSearch,
          pageNumber: ctx.input.pageNumber,
          pageSize: ctx.input.pageSize
        });
        let companies = (result.companies || []).map((c: any) => ({
          companyId: c.id ?? undefined,
          name: c.name ?? undefined,
          code: c.code ?? undefined,
          propertyId: c.propertyId ?? c.property?.id
        }));
        return {
          output: {
            action,
            success: true,
            companies,
            count: result.count ?? companies.length
          },
          message: `Found **${result.count ?? companies.length}** companies.`
        };
      }
      case 'get': {
        if (!ctx.input.companyId) throw createApiServiceError('companyId is required');
        let c = await client.getCompany(ctx.input.companyId);
        return {
          output: {
            action,
            success: true,
            companyId: c.id ?? undefined,
            company: {
              companyId: c.id ?? undefined,
              name: c.name ?? undefined,
              code: c.code ?? undefined,
              taxId: c.taxId ?? undefined,
              address: c.address ?? undefined,
              propertyId: c.propertyId ?? c.property?.id,
              created: c.created ?? undefined
            }
          },
          message: `Company **${c.name}** (${c.id}).`
        };
      }
      case 'create': {
        if (!ctx.input.name)
          throw createApiServiceError('name is required to create a company');
        if (!ctx.input.code)
          throw createApiServiceError('code is required to create a company.');
        if (!ctx.input.address)
          throw createApiServiceError('address is required to create a company.');
        let propertyId = ctx.input.propertyId || ctx.config.propertyId;
        if (!propertyId)
          throw createApiServiceError('propertyId is required to create a company');
        let result = await client.createCompany({
          name: ctx.input.name,
          propertyId,
          code: ctx.input.code,
          canCheckOutOnAr: ctx.input.canCheckOutOnAr,
          taxId: ctx.input.taxId,
          address: ctx.input.address
        });
        return {
          output: { action, success: true, companyId: result.id },
          message: `Created company **${ctx.input.name}** (${result.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.companyId)
          throw createApiServiceError('companyId is required to update');
        let body: Record<string, any> = {};
        if (ctx.input.name !== undefined) body.name = ctx.input.name;
        if (ctx.input.taxId !== undefined) body.taxId = ctx.input.taxId;
        if (ctx.input.address) body.address = ctx.input.address;
        if (!Object.keys(body).length)
          throw createApiServiceError('Provide name, taxId, or address to update.');
        await client.updateCompany(ctx.input.companyId, body);
        return {
          output: { action, success: true, companyId: ctx.input.companyId },
          message: `Updated company **${ctx.input.companyId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.companyId)
          throw createApiServiceError('companyId is required to delete');
        await client.deleteCompany(ctx.input.companyId);
        return {
          output: { action, success: true, companyId: ctx.input.companyId },
          message: `Deleted company **${ctx.input.companyId}**.`
        };
      }
    }
  })
  .build();
