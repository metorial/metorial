import { z } from 'zod';
import { tool } from '../lib/tool';
import { countryInput, object, stringValue, textInput } from '../lib/validation';
export const validateTaxId = tool({
  name: 'Validate Tax ID',
  key: 'validate_tax_id',
  description:
    'Ask the provider to validate a supported tax ID. A null result means the external validation service is unavailable and does not establish that the ID is invalid.',
  readOnly: true,
  input: { country: countryInput, taxId: textInput },
  output: {
    valid: z.boolean().nullable(),
    companyName: z.string().optional(),
    companyAddress: z.string().optional(),
    validationStatus: z.enum(['valid', 'invalid', 'unavailable'])
  },
  run: async (input, client) => {
    const r = object(
      await client.request('GET', 'tax_ids/validate', undefined, {
        country: input.country,
        tax_id: input.taxId
      })
    );
    return {
      valid: r.valid,
      companyName: stringValue(r.company_name),
      companyAddress: stringValue(r.company_address),
      validationStatus:
        r.valid === null ? 'unavailable' : r.valid === true ? 'valid' : 'invalid'
    };
  }
});
