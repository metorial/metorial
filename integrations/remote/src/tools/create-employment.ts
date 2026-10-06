import { pickDefined } from 'slates';
import { z } from 'zod';
import { single } from '../lib/client';
import { countryForm, validateForm } from '../lib/forms';
import { remoteTool } from '../lib/tool';
import {
  country,
  date,
  fail,
  id,
  isRecord,
  type RecordData,
  recordSchema,
  required
} from '../lib/validation';
export let createEmployment = remoteTool(
  {
    name: 'Create Employment',
    key: 'create_employment',
    description:
      'Create a country-specific employment record. Discover requirements with get_country_form_schema first. Creation does not complete onboarding or send an enrollment invitation.',
    tags: { destructive: false }
  },
  z.object({
    countryCode: z.string(),
    fullName: z.string().optional(),
    jobTitle: z.string().optional(),
    provisionalStartDate: z.string().optional(),
    basicInformation: recordSchema.optional(),
    companyId: z.string().optional(),
    type: z.string().optional(),
    seniorityDate: z.string().optional(),
    externalId: z.string().optional(),
    engagedByLegalEntityId: z.string().optional(),
    billToLegalEntityId: z.string().optional()
  }),
  z.object({ employment: recordSchema }),
  async (client, input) => {
    let code = country(input.countryCode);
    let basic: RecordData = { ...input.basicInformation };
    for (let [key, value] of [
      ['name', input.fullName],
      ['job_title', input.jobTitle],
      ['provisional_start_date', input.provisionalStartDate]
    ] as const)
      if (value !== undefined) {
        if (basic[key] !== undefined && basic[key] !== value)
          fail(
            `Conflicting basicInformation.${key} and dedicated field. Provide one consistent value.`
          );
        basic[key] = value;
      }
    if (input.provisionalStartDate !== undefined)
      date(input.provisionalStartDate, 'Provisional start date');
    if (input.seniorityDate !== undefined) {
      basic.seniority_date = date(input.seniorityDate, 'Seniority date');
      basic.has_seniority_date = 'yes';
    }
    let type = input.type ?? 'employee';
    if (!['employee', 'contractor', 'global_payroll_employee', 'hris'].includes(type))
      fail(
        'Use a documented employment type: employee, contractor, global_payroll_employee, or hris.'
      );
    let { identity } = await client.getIdentity();
    if (!isRecord(identity.company))
      fail('Employment creation requires a company-scoped connection.');
    if (input.companyId !== undefined && id(input.companyId) !== identity.company.id)
      fail(
        'companyId does not match the currently authorized company. Reconnect to the intended company.'
      );
    if (type === 'global_payroll_employee' && !input.engagedByLegalEntityId)
      fail(
        'Global Payroll employees require engagedByLegalEntityId for an enabled company legal entity.'
      );
    let form =
      type === 'contractor'
        ? 'contractor_basic_information'
        : type === 'global_payroll_employee'
          ? 'global_payroll_basic_information'
          : 'employment_basic_information';
    let current = await countryForm(client, code, form);
    basic = validateForm(basic, current.schema, 'Basic information');
    let body = pickDefined({
      country_code: code,
      basic_information: basic,
      company_id: input.companyId,
      type,
      external_id: input.externalId,
      engaged_by_legal_entity_id:
        input.engagedByLegalEntityId === undefined
          ? undefined
          : id(input.engagedByLegalEntityId),
      bill_to_legal_entity_id:
        input.billToLegalEntityId === undefined ? undefined : id(input.billToLegalEntityId)
    });
    let employment = single(
      await client.request('post', '/employments', body, {
        json_schema_version: current.version
      }),
      'employment'
    );
    required(employment.id, 'Created employment ID');
    return {
      output: { employment },
      message:
        'Remote created the employment record. Onboarding and enrollment remain separate steps.'
    };
  }
);
