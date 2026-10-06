import { z } from 'zod';
import { remoteTool } from '../lib/tool';
import { country, fail, id, integer, record, recordSchema, required } from '../lib/validation';
export let getCountryFormSchema = remoteTool(
  {
    name: 'Get Country Form Schema',
    key: 'get_country_form_schema',
    description:
      'Retrieve the current country form schema, or discover required cost-estimate fields for a region from list_countries. Keep the returned schema version with form submissions.',
    tags: { readOnly: true }
  },
  z.object({
    countryCode: z.string().optional().describe('Three-letter country code for country_form.'),
    form: z
      .string()
      .optional()
      .describe(
        'Current form name from list_countries, such as employment_basic_information, personal_details, administrative_details, or contract_details.'
      ),
    action: z.enum(['country_form', 'cost_region_fields']).optional(),
    regionSlug: z
      .string()
      .optional()
      .describe('Region slug from list_countries with catalog cost_calculator.'),
    employmentId: z.string().optional(),
    jsonSchemaVersion: z.number().optional(),
    jurisdiction: z.string().optional(),
    skipBenefits: z.boolean().optional()
  }),
  z.object({ schema: recordSchema, version: z.number().optional() }),
  async (client, input) => {
    let value: unknown;
    if (input.action === 'cost_region_fields')
      value = await client.get(
        `/cost-calculator/regions/${id(input.regionSlug, 'Region slug')}/fields`
      );
    else {
      let form = id(input.form, 'Form name');
      if (['personal_information', 'employment_details', 'contract_amendment'].includes(form))
        fail(
          'Use a current country form name from list_countries, such as personal_details or contract_details. Contract amendments have a separate schema API outside this tool.'
        );
      value = await client.get(`/countries/${country(input.countryCode)}/${form}`, {
        employment_id: input.employmentId === undefined ? undefined : id(input.employmentId),
        json_schema_version:
          input.jsonSchemaVersion === undefined
            ? undefined
            : integer(input.jsonSchemaVersion, 'Schema version', 1),
        jurisdiction: input.jurisdiction,
        skip_benefits: input.skipBenefits
      });
    }
    let data = record(record(value, 'form response').data, 'form data');
    let schema = record(data.schema ?? data, 'JSON schema');
    required(schema.type ?? 'object', 'Schema type');
    return {
      output: { schema, version: typeof data.version === 'number' ? data.version : undefined },
      message: 'Retrieved the current Remote JSON form schema.'
    };
  }
);
