import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  streetAddress1: z.string().optional().describe('Street address line 1'),
  streetAddress2: z.string().optional().describe('Street address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('Two-letter state code (e.g., NY, CA)'),
  postalCode: z.string().optional().describe('ZIP or postal code')
});

let personSchema = z.object({
  firstName: z.string().optional().describe('First name of business owner/officer'),
  lastName: z.string().optional().describe('Last name of business owner/officer'),
  ssn: z
    .string()
    .optional()
    .describe(
      'Social Security Number (9 digits, no dashes). Requires SSN verification add-on.'
    )
});

let screeningPersonSchema = z.object({
  firstName: z.string().optional().describe('First name of person to screen'),
  lastName: z.string().optional().describe('Last name of person to screen'),
  dob: z
    .string()
    .optional()
    .describe('Date of birth in YYYY-MM-DD format (improves screening accuracy)')
});

let taskResultSchema = z.object({
  taskName: z.string().optional().describe('Verification task name'),
  status: z.string().optional().describe('Task status: "success" or "failure"'),
  result: z.string().optional().describe('Task result detail'),
  reason: z.string().optional().describe('Explanation of the result')
});

let riskSummarySchema = z.object({
  overallRiskRating: z.string().optional().describe('Overall risk rating: "high" or "low"'),
  legalExistenceRiskRating: z
    .string()
    .optional()
    .describe('Legal existence risk: "high" or "low"'),
  activityRiskRating: z.string().optional().describe('Activity risk: "high" or "low"'),
  watchlistRiskRating: z.string().optional().describe('Watchlist risk: "high" or "low"'),
  tasks: z.array(taskResultSchema).optional().describe('Individual verification task results')
});

export let verifyBusiness = SlateTool.create(spec, {
  name: 'Verify Business (KYB)',
  key: 'verify_business',
  description: `Perform Know Your Business (KYB) verification on a U.S. business. Verifies business identity against authoritative data sources including Secretary of State records.

Returns a risk summary with individual verification task results (name verification, address verification, SoS checks), matched legal entities, brands, and optionally OFAC watchlist screening and TIN/SSN verification.`,
  instructions: [
    'Provide at least two of: business name, address, or person.',
    'For the "identify" package, only identity confirmation is returned. For "verify" (default), full verification details are included.',
    'OFAC watchlist screening, TIN verification, and SSN verification are add-on features that must be enabled on your Enigma account.'
  ],
  constraints: [
    'Only supports U.S. businesses.',
    'Maximum of 2 names, 2 addresses, 1 website, 1 person, 1 TIN, and 4 persons to screen per request.',
    'Address objects require at least one of: city, state, or postalCode.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Business name (legal or operating/DBA)'),
      website: z.string().optional().describe('Business website URL'),
      address: addressSchema.optional().describe('Business address'),
      tin: z
        .string()
        .optional()
        .describe('Tax Identification Number (9 digits). Requires TIN verification add-on.'),
      person: personSchema
        .optional()
        .describe('Person associated with the business (e.g., owner or officer)'),
      personsToScreen: z
        .array(screeningPersonSchema)
        .max(4)
        .optional()
        .describe(
          'Persons to screen against OFAC watchlists (max 4). Requires watchlist add-on.'
        ),
      verificationPackage: z
        .enum(['identify', 'verify'])
        .default('verify')
        .describe('"identify" for identity confirmation or "verify" for full verification'),
      addOns: z
        .array(
          z.enum(['watchlist', 'tin_verification', 'ssn_verification', 'business_bankruptcy'])
        )
        .optional()
        .describe(
          'Additional verification attributes to include. Must be enabled on your Enigma account.'
        ),
      matchThreshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Minimum confidence score (0-1). Default is 0.5.'),
      topN: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum number of matches to return. Default is 1.')
    })
  )
  .output(
    z.object({
      responseId: z.string().optional().describe('Unique response identifier'),
      riskSummary: riskSummarySchema
        .optional()
        .describe('Overall risk assessment and verification task results'),
      bestMatch: z
        .object({
          matchConfidence: z
            .number()
            .optional()
            .describe('Confidence score of the best match'),
          matchedFields: z.any().optional().describe('Fields that matched')
        })
        .optional()
        .describe('Best matching business profile'),
      legalEntities: z
        .array(
          z.object({
            enigmaId: z.string().optional().describe('Legal entity Enigma ID'),
            matchConfidence: z.number().optional().describe('Match confidence score'),
            matchedFields: z.any().optional().describe('Fields that matched'),
            registrations: z
              .any()
              .optional()
              .describe('Secretary of State registration records'),
            dataSources: z.array(z.string()).optional().describe('Data sources used')
          })
        )
        .optional()
        .describe('Matched legal entities with registration data'),
      brands: z
        .array(
          z.object({
            enigmaId: z.string().optional().describe('Brand Enigma ID'),
            matchConfidence: z.number().optional().describe('Match confidence score'),
            matchedFields: z.any().optional().describe('Fields that matched'),
            names: z.any().optional().describe('Brand names'),
            addresses: z.any().optional().describe('Brand addresses'),
            industries: z.any().optional().describe('Industry classifications'),
            websites: z.any().optional().describe('Brand websites'),
            activities: z.any().optional().describe('Business activities and compliance risk')
          })
        )
        .optional()
        .describe('Matched brands with firmographic data'),
      watchlists: z
        .array(
          z.object({
            enigmaId: z.string().optional().describe('Watchlist entity Enigma ID'),
            matchConfidence: z.number().optional().describe('Match confidence score'),
            matchedFields: z.any().optional().describe('Fields that matched'),
            watchlistEntity: z
              .object({
                watchlistName: z
                  .string()
                  .optional()
                  .describe('Name of the watchlist (e.g., SDN, Non-SDN)'),
                entityType: z
                  .string()
                  .optional()
                  .describe('Entity type: "organization" or "person"'),
                fullName: z.string().optional().describe('Full name on the watchlist'),
                organizationName: z
                  .string()
                  .optional()
                  .describe('Organization name on the watchlist'),
                dob: z.string().optional().describe('Date of birth on the watchlist'),
                fullAddress: z.string().optional().describe('Address on the watchlist')
              })
              .optional()
              .describe('Watchlist entity details')
          })
        )
        .optional()
        .describe('OFAC watchlist screening results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyBusiness(
      {
        name: ctx.input.name,
        website: ctx.input.website,
        address: ctx.input.address,
        tin: ctx.input.tin,
        person: ctx.input.person,
        personsToScreen: ctx.input.personsToScreen
      },
      {
        package: ctx.input.verificationPackage,
        attrs: ctx.input.addOns,
        matchThreshold: ctx.input.matchThreshold,
        topN: ctx.input.topN
      }
    );

    let riskSummary = result.risk_summary
      ? {
          overallRiskRating: result.risk_summary.overall_risk_rating,
          legalExistenceRiskRating: result.risk_summary.legal_existence_risk_rating,
          activityRiskRating: result.risk_summary.activity_risk_rating,
          watchlistRiskRating: result.risk_summary.watchlist_risk_rating,
          tasks: result.risk_summary.tasks?.map((t: Record<string, unknown>) => ({
            taskName: t.task_name,
            status: t.status,
            result: t.result,
            reason: t.reason
          }))
        }
      : undefined;

    let bestMatch = result.data?.best_match
      ? {
          matchConfidence: result.data.best_match.match_confidence,
          matchedFields: result.data.best_match.matched_fields
        }
      : undefined;

    let legalEntities = result.data?.legal_entities?.map((le: Record<string, unknown>) => ({
      enigmaId: le.enigma_id,
      matchConfidence: le.match_confidence,
      matchedFields: le.matched_fields,
      registrations: le.registrations,
      dataSources: le.data_sources
    }));

    let brands = result.data?.brands?.map((b: Record<string, unknown>) => ({
      enigmaId: b.enigma_id,
      matchConfidence: b.match_confidence,
      matchedFields: b.matched_fields,
      names: b.names,
      addresses: b.addresses,
      industries: b.industries,
      websites: b.websites,
      activities: b.activities
    }));

    let watchlists = result.data?.watchlists?.map((w: Record<string, unknown>) => {
      let entity = w.watchlist_entity as Record<string, unknown> | undefined;
      return {
        enigmaId: w.enigma_id,
        matchConfidence: w.match_confidence,
        matchedFields: w.matched_fields,
        watchlistEntity: entity
          ? {
              watchlistName: entity.watchlist_name,
              entityType: entity.entity_type,
              fullName: entity.full_name,
              organizationName: entity.organization_name,
              dob: entity.dob,
              fullAddress: entity.full_address
            }
          : undefined
      };
    });

    let overallRisk = riskSummary?.overallRiskRating || 'unknown';
    let taskSummary =
      riskSummary?.tasks
        ?.map((t: Record<string, unknown>) => `${t.taskName}: ${t.status}`)
        .join(', ') || 'no tasks';

    return {
      output: {
        responseId: result.response_id,
        riskSummary,
        bestMatch,
        legalEntities,
        brands,
        watchlists
      },
      message: `KYB verification complete. Overall risk: **${overallRisk}**. Tasks: ${taskSummary}.${watchlists?.length ? ` Watchlist hits: **${watchlists.length}**` : ''}`
    };
  })
  .build();
