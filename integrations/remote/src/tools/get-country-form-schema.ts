import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCountryFormSchema = SlateTool.create(spec, {
  name: 'Get Country Form Schema',
  key: 'get_country_form_schema',
  description: `Retrieve the country-specific JSON form schema for creating or updating employments. Each country has different required fields for employment creation. Use this before creating an employment to discover the required and optional fields for a specific country.`,
  instructions: [
    'Common form types: "employment_basic_information", "employment_details", "personal_information", "administrative_details", "contract_amendment".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z.string().describe('ISO country code (e.g., GBR, DEU, USA)'),
      form: z
        .string()
        .describe(
          'Form type to retrieve (e.g., employment_basic_information, employment_details, personal_information, administrative_details, contract_amendment)'
        )
    })
  )
  .output(
    z.object({
      schema: z.record(z.string(), z.any()).describe('Country-specific JSON form schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.getCountryFormSchema(ctx.input.countryCode, ctx.input.form);
    let schema = result?.data ?? result;

    return {
      output: {
        schema
      },
      message: `Retrieved **${ctx.input.form}** schema for **${ctx.input.countryCode}**.`
    };
  });
