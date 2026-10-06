import { z } from 'zod';
import { single } from '../lib/client';
import { countryForm, validateForm } from '../lib/forms';
import { remoteTool } from '../lib/tool';
import {
  country,
  fail,
  id,
  isRecord,
  nonempty,
  type RecordData,
  recordSchema,
  rejectFields
} from '../lib/validation';
export let updateEmployment = remoteTool(
  {
    name: 'Update Employment',
    key: 'update_employment',
    description:
      'Update supported country-specific forms on an employment. Supplied partial forms are merged with a fresh record. Optional enrollment invitation is a separate operation; an invitation failure may follow a successful update.',
    tags: { destructive: true }
  },
  z.object({
    employmentId: z.string(),
    basicInformation: recordSchema.optional(),
    personalInformation: recordSchema
      .optional()
      .describe('Country personal_details fields; merged with the current form.'),
    employmentDetails: recordSchema
      .optional()
      .describe(
        'Legacy unsupported section. Use basicInformation or additive contractDetails with the current form schema.'
      ),
    administrativeDetails: recordSchema.optional(),
    invite: z.boolean().optional(),
    contractDetails: recordSchema.optional()
  }),
  z.object({
    employment: recordSchema,
    invited: z.boolean().optional(),
    updateApplied: z.boolean().optional(),
    invitationStatus: z.enum(['not_requested', 'accepted']).optional()
  }),
  async (client, input) => {
    rejectFields(
      input,
      ['employmentDetails'],
      'Remote does not document an employment_details update section. Use basicInformation or contractDetails with the current country form schema.'
    );
    let employmentId = id(input.employmentId);
    let current = await client.employment(employmentId);
    let code =
      typeof current.country_code === 'string'
        ? country(current.country_code)
        : country(isRecord(current.country) ? current.country.code : undefined);
    let body: RecordData = {};
    let query: RecordData = {};
    let basicForm =
      current.type === 'contractor'
        ? 'contractor_basic_information'
        : current.type === 'global_payroll_employee'
          ? 'global_payroll_basic_information'
          : 'employment_basic_information';
    for (let [value, key, form] of [
      [input.basicInformation, 'basic_information', basicForm],
      [input.personalInformation, 'personal_details', 'personal_details'],
      [input.administrativeDetails, 'administrative_details', 'administrative_details'],
      [input.contractDetails, 'contract_details', 'contract_details']
    ] as const) {
      if (value === undefined) continue;
      nonempty(value, key);
      let schema = await countryForm(client, code, form, employmentId);
      let hydrated = { ...(isRecord(current[key]) ? current[key] : {}), ...value };
      body[key] = validateForm(hydrated, schema.schema, key);
      if (schema.version !== undefined)
        query[
          `${key === 'basic_information' ? 'employment_basic_information' : key}_json_schema_version`
        ] = schema.version;
    }
    if (!Object.keys(body).length && !input.invite)
      fail('Provide at least one supported form update or invite: true.');
    let employment = Object.keys(body).length
      ? single(
          await client.request('patch', `/employments/${employmentId}`, body, query),
          'employment',
          employmentId
        )
      : current;
    if (input.invite) {
      try {
        await client.post(`/employments/${employmentId}/invite`);
      } catch {
        fail(
          `Enrollment invitation failed for employment ${employmentId}. ${Object.keys(body).length ? 'The employment update was already accepted. Read get_employment before retrying; do not recreate the record.' : 'Read get_employment and verify onboarding prerequisites before retrying the invitation.'}`
        );
      }
      employment = await client.employment(employmentId);
    }
    return {
      output: {
        employment,
        invited: Boolean(input.invite),
        updateApplied: Object.keys(body).length > 0,
        invitationStatus: input.invite ? ('accepted' as const) : ('not_requested' as const)
      },
      message: input.invite
        ? 'Remote accepted the enrollment invitation request; email receipt is not confirmed.'
        : 'Remote accepted the employment update.'
    };
  }
);
