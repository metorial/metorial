import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  asBoolean,
  asRecord,
  asString,
  createClient,
  idFrom,
  nameFrom,
  rawRecordSchema
} from './shared';

let companySchema = z.object({
  id: z.number().optional(),
  companyKey: z.string().optional(),
  name: z.string().optional(),
  organizationNumber: z.string().optional(),
  isTest: z.boolean().optional(),
  raw: rawRecordSchema
});

let mapCompany = (value: unknown): z.infer<typeof companySchema> => {
  let record = asRecord(value);
  return {
    id: idFrom(record),
    companyKey: asString(record.CompanyKey ?? record.Key ?? record.companyKey ?? record.key),
    name: nameFrom(record),
    organizationNumber: asString(record.OrgNumber ?? record.OrganizationNumber),
    isTest: asBoolean(record.IsTest ?? record.isTest),
    raw: record
  };
};

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description:
    'List SpareBank 1 Regnskap companies available to the authenticated user so a CompanyKey can be selected for company-scoped tools.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companies: z.array(companySchema),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let companies = (await client.listCompanies()).map(mapCompany);

    return {
      output: {
        companies,
        returnedCount: companies.length
      },
      message: `Found **${companies.length}** SpareBank 1 Regnskap compan${companies.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
