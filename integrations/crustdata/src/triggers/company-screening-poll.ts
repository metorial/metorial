import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let companyScreeningPoll = SlateTrigger.create(spec, {
  name: 'New Companies Matching Criteria',
  key: 'new_companies_matching_criteria',
  description:
    'Polls for new companies that match specified screening criteria. Detects when new companies appear in search results based on filters like headcount, funding, industry, and growth metrics.'
})
  .input(
    z.object({
      companyId: z.string().describe('Crustdata company ID.'),
      companyName: z.string().describe('Company name.'),
      companyDomain: z.string().optional().describe('Company website domain.'),
      companyData: z.record(z.string(), z.unknown()).describe('Full company data record.')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('Crustdata company ID.'),
      companyName: z.string().describe('Company name.'),
      companyDomain: z.string().optional().describe('Company website domain.'),
      companyData: z.record(z.string(), z.unknown()).describe('Full company data record.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new CrustdataClient(ctx.auth.token);
      let state = (ctx.state as { seenIds?: string[] } | null) ?? {};
      let seenIds = new Set<string>(state.seenIds ?? []);

      // Default screening: get recently added/updated companies
      let result = await client.screenCompanies({
        filters: {
          op: 'and',
          conditions: [{ column: 'headcount', type: '>=', value: 1, allowNull: false }]
        },
        offset: 0,
        count: 100,
        sorts: [{ column: 'headcount', direction: 'desc' }]
      });

      let companies = Array.isArray(result) ? result : (result.data ?? result.companies ?? []);

      let newCompanies = companies.filter((c: Record<string, unknown>) => {
        let id = String(c.company_id ?? c.id ?? '');
        return id && !seenIds.has(id);
      });

      let allIds = companies
        .map((c: Record<string, unknown>) => String(c.company_id ?? c.id ?? ''))
        .filter(Boolean);

      let inputs = newCompanies.map((c: Record<string, unknown>) => ({
        companyId: String(c.company_id ?? c.id ?? ''),
        companyName: String(c.company_name ?? c.name ?? ''),
        companyDomain:
          (c.company_website_domain as string | undefined) ?? (c.domain as string | undefined),
        companyData: c
      }));

      return {
        inputs,
        updatedState: {
          seenIds: [...new Set([...Array.from(seenIds), ...allIds])].slice(-10000)
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'company.discovered',
        id: ctx.input.companyId,
        output: {
          companyId: ctx.input.companyId,
          companyName: ctx.input.companyName,
          companyDomain: ctx.input.companyDomain,
          companyData: ctx.input.companyData
        }
      };
    }
  })
  .build();
