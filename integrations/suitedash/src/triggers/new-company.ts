import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newCompany = SlateTrigger.create(spec, {
  name: 'New Company',
  key: 'new_company',
  description: '[Polling fallback] Triggers when a new company is created in SuiteDash CRM.'
})
  .input(
    z.object({
      companyUid: z.string().describe('UID of the company'),
      companyName: z.string().optional().describe('Name of the company'),
      createdAt: z.string().optional().describe('Timestamp when the company was created'),
      raw: z.record(z.string(), z.unknown()).describe('Full company record')
    })
  )
  .output(
    z.object({
      companyUid: z.string().describe('UID of the company'),
      companyName: z.string().optional().describe('Name of the company'),
      createdAt: z.string().optional().describe('Timestamp when the company was created'),
      raw: z.record(z.string(), z.unknown()).describe('Full company record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        publicId: ctx.auth.publicId,
        secretKey: ctx.auth.secretKey
      });

      let companies = await client.listAllCompanies();
      let state = ctx.input.state as Record<string, unknown> | null;
      let lastSeenTimestamp = state?.lastSeenTimestamp as string | undefined;

      let newCompanies = companies.filter(company => {
        let created = company.created as string | undefined;
        if (!created || !lastSeenTimestamp) return true;
        return created > lastSeenTimestamp;
      });

      let maxTimestamp = lastSeenTimestamp;
      for (let company of companies) {
        let created = company.created as string | undefined;
        if (created && (!maxTimestamp || created > maxTimestamp)) {
          maxTimestamp = created;
        }
      }

      let inputs = newCompanies.map(company => ({
        companyUid: (company.uid as string) ?? '',
        companyName: company.name as string | undefined,
        createdAt: company.created as string | undefined,
        raw: company
      }));

      return {
        inputs: lastSeenTimestamp ? inputs : [],
        updatedState: {
          lastSeenTimestamp: maxTimestamp ?? lastSeenTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'company.created',
        id: ctx.input.companyUid,
        output: {
          companyUid: ctx.input.companyUid,
          companyName: ctx.input.companyName,
          createdAt: ctx.input.createdAt,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
