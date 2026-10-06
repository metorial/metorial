import { z } from 'zod';
import { jurisdictionOutput, mapJurisdiction } from '../lib/schemas';
import { tool } from '../lib/tool';
import { countryInput, idInput, invalid, pageInput, pageOutput } from '../lib/validation';
export const listJurisdictions = tool({
  name: 'List Tax Jurisdictions',
  key: 'list_jurisdictions',
  description:
    'List the provider jurisdiction catalog, optionally filtered by country or region, or retrieve one with jurisdictionId alone. Catalog presence does not prove registration or a tax obligation.',
  readOnly: true,
  input: {
    ...pageInput,
    country: countryInput.optional(),
    region: z.string().optional(),
    jurisdictionId: idInput.optional()
  },
  output: { jurisdictions: z.array(z.object(jurisdictionOutput)), ...pageOutput },
  run: async (input, client) => {
    if (input.jurisdictionId) {
      if (Object.entries(input).some(([k, v]) => k !== 'jurisdictionId' && v !== undefined))
        throw invalid('Use jurisdictionId alone for an exact catalog read.');
      return {
        jurisdictions: [
          mapJurisdiction(await client.get('jurisdictions', input.jurisdictionId))
        ]
      };
    }
    return {
      jurisdictions: (
        await client.list('jurisdictions', input, {
          country: input.country,
          region: input.region
        })
      ).map(mapJurisdiction),
      ...client.pagination
    };
  }
});
export const createJurisdiction = tool({
  name: 'Create Tax Jurisdiction (Compatibility)',
  key: 'create_jurisdiction',
  description:
    'Call the historical jurisdiction creation route. This mutation is not documented by the current API; account support varies. A returned record does not prove legal registration. For current registrations, use the provider tax-ID workflow.',
  input: {
    country: countryInput,
    region: z.string().optional(),
    taxAccountNumber: z.string().optional()
  },
  output: jurisdictionOutput,
  run: async (input, client) =>
    mapJurisdiction(
      await client.create(
        'jurisdictions.json',
        {
          country: input.country,
          region: input.region,
          tax_account_number: input.taxAccountNumber
        },
        true
      )
    )
});
export const deleteJurisdiction = tool({
  name: 'Delete Tax Jurisdiction (Compatibility)',
  key: 'delete_jurisdiction',
  description:
    'Call the historical jurisdiction deletion route. Use only a verified legacy registration ID, never a current catalog ID. Current API support is undocumented, and success does not prove removal of a legal registration.',
  destructive: true,
  input: { jurisdictionId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.remove('jurisdictions', input.jurisdictionId, true);
    return { success: true };
  }
});
