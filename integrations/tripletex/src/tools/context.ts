import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  commonParams,
  companyIdFor,
  createClient,
  listMetadataSchema,
  listOutput,
  pagingInputShape,
  rawRecordSchema
} from './shared';

let companySchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  organizationNumber: z.string().optional(),
  email: z.string().optional(),
  raw: rawRecordSchema
});

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Inspect the current Tripletex session, selected company context, employee, and optionally accountant client companies with login access.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: pagingInputShape.companyId,
      fields: pagingInputShape.fields,
      includeAccessibleCompanies: z
        .boolean()
        .optional()
        .describe('When true, also calls /company/>withLoginAccess for accountant clients.'),
      from: pagingInputShape.from,
      count: pagingInputShape.count,
      sorting: pagingInputShape.sorting
    })
  )
  .output(
    z.object({
      employeeId: z.number().optional(),
      actualEmployeeId: z.number().optional(),
      companyId: z.number().optional(),
      language: z.string().optional(),
      loggedInWithConnect: z.boolean().optional(),
      employeeIsProxy: z.boolean().optional(),
      employee: rawRecordSchema.optional(),
      company: rawRecordSchema.optional(),
      accessibleCompanies: z.array(companySchema).optional(),
      ...listMetadataSchema,
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let raw = asRecord(
      await client.whoAmI(
        {
          fields: ctx.input.fields
        },
        companyId
      )
    );

    let accessibleCompanies: z.infer<typeof companySchema>[] | undefined;
    let listMeta: Partial<{
      from: number;
      count: number;
      fullResultSize: number;
      versionDigest: string | null;
    }> = {};

    if (ctx.input.includeAccessibleCompanies) {
      let companiesResponse = await client.listAccessibleCompanies(
        commonParams(ctx.input),
        companyId
      );
      let companies = (companiesResponse.values ?? []).map(value => {
        let record = asRecord(value);
        return {
          id: asNumber(record.id),
          name: asString(record.name),
          displayName: asString(record.displayName),
          organizationNumber: asString(record.organizationNumber),
          email: asString(record.email),
          raw: record
        };
      });
      accessibleCompanies = companies;
      listMeta = listOutput(companiesResponse);
    }

    return {
      output: {
        employeeId: asNumber(raw.employeeId),
        actualEmployeeId: asNumber(raw.actualEmployeeId),
        companyId: asNumber(raw.companyId),
        language: asString(raw.language),
        loggedInWithConnect: asBoolean(raw.loggedInWithConnect),
        employeeIsProxy: asBoolean(raw.employeeIsProxy),
        employee: asRecord(raw.employee),
        company: asRecord(raw.company),
        accessibleCompanies,
        ...listMeta,
        raw
      },
      message: `Tripletex session is authenticated for company **${raw.companyId ?? companyId ?? '0'}**.`
    };
  })
  .build();
