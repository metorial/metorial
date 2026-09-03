import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  companyNumberSchema,
  companyOfficerListOutputSchema,
  officerAppointmentListOutputSchema,
  officerIdSchema,
  officerSearchOutputSchema,
  paginationFields,
  querySchema
} from '../lib/schemas';
import { spec } from '../spec';

export let searchOfficers = SlateTool.create(spec, {
  name: 'Search Officers',
  key: 'search_officers',
  description:
    'Search Companies House officer records by name and return appointment counts and links where published.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: querySchema.describe('Officer name to search for.'),
      ...paginationFields
    })
  )
  .output(officerSearchOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).searchOfficers(ctx.input);
    return {
      output: result,
      message: `Found **${result.totalResults}** matching officers.`
    };
  })
  .build();

export let listCompanyOfficers = SlateTool.create(spec, {
  name: 'List Company Officers',
  key: 'list_company_officers',
  description:
    'List the current and resigned officers for a Companies House company, with optional register-view ordering and filtering.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z
      .object({
        companyNumber: companyNumberSchema.describe('Companies House company number.'),
        orderBy: z
          .enum(['appointed_on', 'resigned_on', 'surname'])
          .optional()
          .describe('Provider ordering for register-view results.'),
        registerView: z.boolean().optional().describe('Request the provider register view.'),
        registerType: z
          .enum(['directors', 'secretaries', 'llp_members'])
          .optional()
          .describe('Register type. Requires registerView to be true.'),
        ...paginationFields
      })
      .superRefine((input, ctx) => {
        if (input.registerType !== undefined && input.registerView !== true) {
          ctx.addIssue({
            code: 'custom',
            path: ['registerView'],
            message: 'registerView must be true when registerType is supplied.'
          });
        }
      })
  )
  .output(companyOfficerListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).listCompanyOfficers(
      ctx.input.companyNumber,
      {
        itemsPerPage: ctx.input.itemsPerPage,
        startIndex: ctx.input.startIndex,
        orderBy: ctx.input.orderBy,
        registerView: ctx.input.registerView,
        registerType: ctx.input.registerType
      }
    );
    return {
      output: result,
      message: `Found **${result.totalResults}** officers for company **${result.companyNumber}**.`
    };
  })
  .build();

export let listOfficerAppointments = SlateTool.create(spec, {
  name: 'List Officer Appointments',
  key: 'list_officer_appointments',
  description:
    'List company appointments for a Companies House officer, including company status and appointment dates.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      officerId: officerIdSchema.describe(
        'Officer ID returned by search_officers or list_company_officers.'
      ),
      ...paginationFields
    })
  )
  .output(officerAppointmentListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).listOfficerAppointments(
      ctx.input.officerId,
      { itemsPerPage: ctx.input.itemsPerPage, startIndex: ctx.input.startIndex }
    );
    return {
      output: result,
      message: `Found **${result.totalResults}** appointments for **${result.name}**.`
    };
  })
  .build();
