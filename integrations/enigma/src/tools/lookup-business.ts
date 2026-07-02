import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupBusiness = SlateTool.create(spec, {
  name: 'Lookup Business',
  key: 'lookup_business',
  description: `Retrieve detailed attributes for a business using its Enigma ID. Returns business identity, financial health, industry classification, associated people, addresses, and more.

Specify which attributes to retrieve, or leave empty for default attributes. Supports time-series data (merchant transaction signals) with configurable lookback periods.`,
  instructions: [
    'First use the Match Business tool to obtain an Enigma ID, then use this tool to retrieve attributes.',
    'Request only the attributes you need to minimize costs, as premium attributes are charged per attribute.'
  ],
  constraints: [
    'Enigma IDs are not persistent over time. If you receive a 404, re-match the business to get the current ID.',
    'Time-series data (merchant transaction signals) can go back to January 2017.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      enigmaId: z
        .string()
        .describe(
          'The Enigma ID of the business to look up (obtained from the Match Business tool)'
        ),
      attributes: z
        .array(z.string())
        .optional()
        .describe(
          'Specific attributes to retrieve (e.g., "names", "addresses", "websites", "industries", "associated_people", "phone_numbers", "corporate_structure", "operating_status", "headcount", "business_bankruptcy", "state_registrations", "verification_score"). Leave empty for default attributes.'
        ),
      lookbackMonths: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'Number of months of historical data to retrieve for time-series attributes (e.g., merchant transaction signals). Omit for most recent month only.'
        )
    })
  )
  .output(
    z.object({
      enigmaId: z.string().describe('The Enigma ID of the business'),
      names: z.any().optional().describe('Business names (legal and operating/DBA)'),
      addresses: z.any().optional().describe('Business addresses'),
      websites: z.any().optional().describe('Business websites'),
      phoneNumbers: z.any().optional().describe('Business phone numbers'),
      industries: z
        .any()
        .optional()
        .describe('Industry classifications (NAICS, SIC, MCC codes)'),
      associatedPeople: z.any().optional().describe('People associated with the business'),
      operatingStatus: z.any().optional().describe('Business operating status'),
      corporateStructure: z.any().optional().describe('Corporate structure information'),
      headcount: z.any().optional().describe('Estimated employee headcount'),
      yearIncorporated: z.any().optional().describe('Year the business was incorporated'),
      companyDescription: z.any().optional().describe('Description of the business'),
      verificationScore: z.any().optional().describe('Business verification score (0-1)'),
      stateRegistrations: z.any().optional().describe('State registration filings'),
      businessBankruptcy: z.any().optional().describe('Bankruptcy records'),
      businessLocationEnigmaIds: z
        .any()
        .optional()
        .describe('Associated business location IDs'),
      dataSources: z.any().optional().describe('Data sources used for this profile'),
      rawAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('All raw attributes returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.lookupBusiness(ctx.input.enigmaId, {
      attributes: ctx.input.attributes,
      lookbackMonths: ctx.input.lookbackMonths
    });

    let businessName = result.names?.[0]?.name || result.names?.[0] || ctx.input.enigmaId;
    let attributeCount = ctx.input.attributes?.length || 0;

    return {
      output: {
        enigmaId: result.enigma_id || ctx.input.enigmaId,
        names: result.names,
        addresses: result.addresses,
        websites: result.websites,
        phoneNumbers: result.phone_numbers,
        industries: result.industries,
        associatedPeople: result.associated_people,
        operatingStatus: result.operating_status,
        corporateStructure: result.corporate_structure,
        headcount: result.headcount,
        yearIncorporated: result.year_incorporated,
        companyDescription: result.company_description,
        verificationScore: result.verification_score,
        stateRegistrations: result.state_registrations,
        businessBankruptcy: result.business_bankruptcy,
        businessLocationEnigmaIds: result.business_location_enigma_ids,
        dataSources: result.data_sources,
        rawAttributes: result
      },
      message: `Retrieved ${attributeCount > 0 ? `${attributeCount} attribute(s)` : 'default attributes'} for business **${businessName}** (ID: \`${ctx.input.enigmaId}\`).`
    };
  })
  .build();
