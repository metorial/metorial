import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let newCompany = SlateTrigger.create(spec, {
  name: 'New Company',
  key: 'new_company',
  description: 'Triggers when a new company is created in Streamtime.'
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company'),
      companyName: z.string().describe('Name of the company'),
      raw: z.record(z.string(), z.any()).describe('Full company data')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the new company'),
      companyName: z.string().describe('Name of the company'),
      raw: z.record(z.string(), z.any()).describe('Full company data from the API')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new StreamtimeClient({ token: ctx.auth.token });
      let state = ctx.state as { knownCompanyIds?: number[] } | null;
      let knownCompanyIds = state?.knownCompanyIds || [];

      // Use search to find companies - searchView for companies
      let searchBody: Record<string, any> = {
        searchView: 2
      };

      let result = await client.search(searchBody);
      let companies: any[] = Array.isArray(result)
        ? result
        : result.data || result.results || [];

      let newCompanies =
        knownCompanyIds.length === 0
          ? []
          : companies.filter((c: any) => !knownCompanyIds.includes(c.id));

      let allIds = companies.map((c: any) => c.id);

      return {
        inputs: newCompanies.map((c: any) => ({
          companyId: c.id,
          companyName: c.name || '',
          raw: c
        })),
        updatedState: {
          knownCompanyIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'company.created',
        id: String(ctx.input.companyId),
        output: {
          companyId: ctx.input.companyId,
          companyName: ctx.input.companyName,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
