import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let linkContacts = SlateTool.create(spec, {
  name: 'Link Contacts',
  key: 'link_contacts',
  description: `Link or unlink people, companies, and deals in CentralStationCRM. Create associations between a person and a company, or between a deal and people/companies.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['link', 'unlink'])
        .describe('Whether to create or remove the association'),
      linkType: z
        .enum(['person_company', 'deal_person', 'deal_company'])
        .describe('Type of association to manage'),
      personId: z
        .number()
        .optional()
        .describe('ID of the person (required for person_company and deal_person)'),
      companyId: z
        .number()
        .optional()
        .describe('ID of the company (required for person_company and deal_company)'),
      dealId: z
        .number()
        .optional()
        .describe('ID of the deal (required for deal_person and deal_company)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let { action, linkType, personId, companyId, dealId } = ctx.input;

    if (linkType === 'person_company') {
      if (!personId || !companyId)
        throw new Error('personId and companyId are required for person_company link');
      if (action === 'link') {
        await client.linkPersonToCompany(personId, companyId);
      } else {
        await client.unlinkPersonFromCompany(personId, companyId);
      }
    } else if (linkType === 'deal_person') {
      if (!dealId || !personId)
        throw new Error('dealId and personId are required for deal_person link');
      if (action === 'link') {
        await client.linkDealToPerson(dealId, personId);
      } else {
        await client.unlinkDealFromPerson(dealId, personId);
      }
    } else {
      if (!dealId || !companyId)
        throw new Error('dealId and companyId are required for deal_company link');
      if (action === 'link') {
        await client.linkDealToCompany(dealId, companyId);
      } else {
        await client.unlinkDealFromCompany(dealId, companyId);
      }
    }

    let description = linkType.replace('_', ' ↔ ');
    return {
      output: { success: true },
      message: `${action === 'link' ? 'Linked' : 'Unlinked'} ${description}.`
    };
  })
  .build();
