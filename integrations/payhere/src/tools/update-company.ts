import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update the current company's profile settings, including display name, legal name, address, contact information, and branding options shown on receipts and payment pages.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Company display name'),
      legalName: z.string().optional().describe('Legal name shown on receipts'),
      address: z.string().optional().describe('Company address shown on receipts'),
      supportEmail: z.string().optional().describe('Support email shown in receipts'),
      website: z.string().optional().describe('Company website shown in receipts'),
      buttonColor: z
        .string()
        .optional()
        .describe('Hex color code for pay button (e.g. "#ff6600")'),
      buttonText: z
        .string()
        .optional()
        .describe('Button text color: empty for auto, "white" or "black"')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Company identifier'),
      name: z.string().describe('Company name'),
      legalName: z.string().nullable(),
      slug: z.string(),
      countryCode: z.string(),
      currency: z.string(),
      supportEmail: z.string().nullable(),
      website: z.string().nullable(),
      address: z.string().nullable(),
      buttonColor: z.string(),
      buttonText: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let company = await client.updateCompany(ctx.input);

    return {
      output: {
        companyId: company.companyId,
        name: company.name,
        legalName: company.legalName,
        slug: company.slug,
        countryCode: company.countryCode,
        currency: company.currency,
        supportEmail: company.supportEmail,
        website: company.website,
        address: company.address,
        buttonColor: company.buttonColor,
        buttonText: company.buttonText,
        updatedAt: company.updatedAt
      },
      message: `Updated company **${company.name}**.`
    };
  })
  .build();
