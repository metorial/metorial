import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let getCompanyInfo = SlateTool.create(spec, {
  name: 'Get Company Info',
  key: 'get_company_info',
  description: `Retrieves the company profile information from QuickBooks, including name, address, contact details, fiscal year, and industry type.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companyName: z.string().describe('Company name'),
      legalName: z.string().optional().describe('Legal company name'),
      email: z.string().optional().describe('Company email'),
      phone: z.string().optional().describe('Company phone'),
      webAddress: z.string().optional().describe('Company website'),
      fiscalYearStartMonth: z.string().optional().describe('Fiscal year start month'),
      country: z.string().optional().describe('Country'),
      address: z.any().optional().describe('Company address'),
      industry: z.string().optional().describe('Industry type')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let info = await client.getCompanyInfo();

    return {
      output: {
        companyName: info.CompanyName,
        legalName: info.LegalName,
        email: info.Email?.Address,
        phone: info.PrimaryPhone?.FreeFormNumber,
        webAddress: info.WebAddr?.URI,
        fiscalYearStartMonth: info.FiscalYearStartMonth,
        country: info.Country,
        address: info.CompanyAddr,
        industry: info.IndustryType
      },
      message: `Retrieved company info for **${info.CompanyName}**${info.Country ? ` (${info.Country})` : ''}.`
    };
  })
  .build();
