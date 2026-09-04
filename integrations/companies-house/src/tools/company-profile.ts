import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import { companyNumberSchema, companyProfileOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCompanyProfile = SlateTool.create(spec, {
  name: 'Get Company Profile',
  key: 'get_company_profile',
  description:
    'Get the current Companies House profile for a company, including status, type, dates, registered office, accounts, confirmation statement, previous names, and links.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.')
    })
  )
  .output(companyProfileOutputSchema)
  .handleInvocation(async ctx => {
    let profile = await new CompaniesHouseClient(ctx.auth).getCompanyProfile(
      ctx.input.companyNumber
    );
    return {
      output: profile,
      message: `Retrieved the profile for **${profile.name}**.`
    };
  })
  .build();
