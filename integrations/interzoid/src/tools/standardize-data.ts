import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let standardizeData = SlateTool.create(spec, {
  name: 'Standardize Data',
  key: 'standardize_data',
  description: `Standardize data values to consistent, canonical forms for improved data consistency and analysis.

Supports:
- **Company/Organization names** — Normalize "GE", "Gen. Electric", "GE Corp" to "General Electric"
- **Country names** — Normalize "UAE", "U.A.E." to "United Arab Emirates"
- **State/Province names** — Get two-letter abbreviations for state/province names
- **City names** — Normalize "SF", "S.F." to "San Francisco"`,
  instructions: [
    'For country, state, and city, you can optionally specify an algorithm: "narrow" (fast), "ai-plus" (better accuracy), or "ai-medium" (best accuracy, recommended).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum(['company', 'country', 'state', 'city'])
        .describe('The type of data to standardize'),
      value: z.string().describe('The data value to standardize'),
      algorithm: z
        .enum(['narrow', 'ai-plus', 'ai-medium'])
        .optional()
        .describe('Algorithm for country/state/city standardization. Defaults to ai-medium.')
    })
  )
  .output(
    z.object({
      standardizedValue: z
        .string()
        .describe('The standardized canonical form of the input value'),
      code: z.string().describe('API response status code'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let standardizedValue: string;
    let code: string;
    let credits: number;

    switch (ctx.input.category) {
      case 'company': {
        let r = await client.getCompanyStandard(ctx.input.value);
        standardizedValue = r.CompanyStandard;
        code = r.Code;
        credits = r.Credits;
        break;
      }
      case 'country': {
        let r = await client.getCountryStandard(ctx.input.value, ctx.input.algorithm);
        standardizedValue = r.CountryStandard;
        code = r.Code;
        credits = r.Credits;
        break;
      }
      case 'state': {
        let r = await client.getStateAbbreviation(ctx.input.value, ctx.input.algorithm);
        standardizedValue = r.StateAbbreviation;
        code = r.Code;
        credits = r.Credits;
        break;
      }
      case 'city': {
        let r = await client.getCityStandard(ctx.input.value, ctx.input.algorithm);
        standardizedValue = r.CityStandard;
        code = r.Code;
        credits = r.Credits;
        break;
      }
    }

    return {
      output: {
        standardizedValue,
        code,
        remainingCredits: credits
      },
      message: `Standardized ${ctx.input.category} "${ctx.input.value}" to **"${standardizedValue}"**`
    };
  })
  .build();
