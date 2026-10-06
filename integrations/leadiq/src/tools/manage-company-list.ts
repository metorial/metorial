import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  companyEntrySchema,
  companyListIdSchema,
  companyListSchema,
  saveCompanySchema
} from '../lib/company-list-schemas';
import { spec } from '../spec';

export const manageCompanyList = SlateTool.create(spec, {
  key: 'manage_company_list',
  name: 'Manage Company List',
  description:
    'Create, rename, delete, or manage saved company entries in a company list. Discover existing lists with list_company_lists. Saving manual company values does not enrich them or consume credits.',
  instructions: [
    'create requires name; update requires listId and name or description. An empty description clears it.',
    'add_companies requires listId and up to 100 companies; matching entries are updated using companyId, domain, LinkedIn URL, then exact name. Omitted fields are preserved.',
    'remove_company requires companyEntryId from get_company_list, rather than a data-company ID.',
    'delete permanently removes the list and its saved company entries. Lists containing prospects cannot be deleted through this operation.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'add_companies', 'remove_company']),
      listId: companyListIdSchema.optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      companies: z.array(saveCompanySchema).optional(),
      companyEntryId: z.string().optional()
    })
  )
  .output(
    z.object({
      list: companyListSchema.optional(),
      removedEntry: companyEntrySchema.optional(),
      deleted: z
        .object({ id: z.string(), name: z.string(), deletedCompanies: z.number() })
        .optional(),
      saved: z
        .object({
          succeeded: z.array(companyEntrySchema),
          created: z.number(),
          updated: z.number(),
          failed: z.array(z.object({ index: z.number(), reason: z.string() }))
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let fail = (message: string): never => {
      throw createApiServiceError(message, { reason: 'invalid_input' });
    };
    if (input.action !== 'create' && !input.listId?.trim())
      fail('listId is required; discover it with list_company_lists.');
    let allowed = new Set(
      input.action === 'create'
        ? ['action', 'name', 'description']
        : input.action === 'update'
          ? ['action', 'listId', 'name', 'description']
          : input.action === 'add_companies'
            ? ['action', 'listId', 'companies']
            : input.action === 'remove_company'
              ? ['action', 'listId', 'companyEntryId']
              : ['action', 'listId']
    );
    if (Object.entries(input).some(([key, value]) => value !== undefined && !allowed.has(key)))
      fail('Provide only the fields documented for the selected action.');
    if (input.action === 'create' && !input.name?.trim())
      fail('A non-empty name is required to create a company list.');
    if (
      input.action === 'update' &&
      input.name === undefined &&
      input.description === undefined
    )
      fail('Provide name or description to update.');
    if (input.name !== undefined && !input.name.trim()) fail('List name cannot be empty.');
    if (input.action === 'remove_company' && !input.companyEntryId?.trim())
      fail('companyEntryId is required; use the saved entry id from get_company_list.');
    if (input.action === 'add_companies') {
      let companies = input.companies ?? [];
      if (!companies.length || companies.length > 100)
        fail('Provide between 1 and 100 companies.');
      for (let company of companies)
        if (
          ![company.companyId, company.name, company.domain, company.linkedinUrl].some(value =>
            value?.trim()
          )
        )
          fail('Each company needs companyId, name, domain or linkedinUrl.');
    }
    let client = new Client({ token: ctx.auth.token });
    const checked = <T>(schema: z.ZodType<T>, value: unknown): T => {
      const parsed = schema.safeParse(value);
      if (!parsed.success)
        throw createApiServiceError(
          'LeadIQ returned an invalid company-list operation result; completion is unconfirmed.',
          { reason: 'invalid_api_response' }
        );
      return parsed.data;
    };
    if (input.action === 'create')
      return {
        output: {
          list: checked(
            companyListSchema,
            await client.createCompanyList({
              name: input.name!,
              ...(input.description !== undefined ? { description: input.description } : {})
            })
          )
        },
        message: 'Company list created.'
      };
    if (input.action === 'update') {
      const list = checked(
        companyListSchema,
        await client.updateCompanyList(
          input.listId!,
          pickDefined({ name: input.name, description: input.description })
        )
      );
      if (list.id !== input.listId)
        throw createApiServiceError(
          'LeadIQ update confirmation did not match the requested list.',
          { reason: 'invalid_api_response' }
        );
      return { output: { list }, message: 'Company list updated.' };
    }
    if (input.action === 'delete') {
      const deleted = checked(
        z.object({ id: z.string(), name: z.string(), deletedCompanies: z.number() }),
        await client.deleteCompanyList(input.listId!)
      );
      if (deleted.id !== input.listId)
        throw createApiServiceError(
          'LeadIQ deletion confirmation did not match the requested list.',
          { reason: 'invalid_api_response' }
        );
      return { output: { deleted }, message: 'Company list deletion confirmed.' };
    }
    if (input.action === 'remove_company') {
      const removedEntry = checked(
        companyEntrySchema,
        await client.removeCompanyFromCompanyList(input.listId!, input.companyEntryId!)
      );
      if (removedEntry.id !== input.companyEntryId)
        throw createApiServiceError(
          'LeadIQ removal confirmation did not match the requested entry.',
          { reason: 'invalid_api_response' }
        );
      return { output: { removedEntry }, message: 'Saved company entry removed.' };
    }
    const saved = checked(
      z.object({
        succeeded: z.array(companyEntrySchema),
        created: z.number(),
        updated: z.number(),
        failed: z.array(z.object({ index: z.number(), reason: z.string() }))
      }),
      await client.addCompaniesToCompanyList(input.listId!, input.companies!)
    );
    return {
      output: { saved },
      message: `Company save completed: ${saved.created} created, ${saved.updated} updated, ${saved.failed.length} failed. Inspect failed before assuming all entries were saved.`
    };
  })
  .build();
