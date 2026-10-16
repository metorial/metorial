import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCountryInfoTool = SlateTool.create(spec, {
  name: 'Get Country Information',
  key: 'get_country_info',
  description:
    'Look up country names, ISO codes, currency, calling code and administrative languages for localisation and country validation.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      code: z
        .string()
        .min(1)
        .describe(
          'ISO 3166-1 Alpha-2, Alpha-3 or numeric country code, such as AU, AUS or 036'
        )
    })
  )
  .output(
    z
      .object({
        isoAlpha2: z.string(),
        isoAlpha3: z.string(),
        name: z.string(),
        m49Code: z.number().optional(),
        isoName: z.string().optional(),
        isoNameFull: z.string().optional(),
        callingCode: z.string().optional(),
        countryFlagEmoji: z.string().optional(),
        unRegion: z.string().optional(),
        isIndependent: z.boolean().optional(),
        currency: z
          .object({
            numericCode: z.number().optional(),
            code: z.string().optional(),
            name: z.string().optional(),
            minorUnits: z.number().optional()
          })
          .passthrough()
          .optional(),
        isoAdminLanguages: z
          .array(
            z
              .object({
                isoAlpha2: z.string().optional(),
                isoAlpha3: z.string().optional(),
                isoName: z.string().optional(),
                nativeName: z.string().optional()
              })
              .passthrough()
          )
          .optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    }).countryInfo(ctx.input);
    return { output: result, message: `Retrieved country information for ${ctx.input.code}.` };
  })
  .build();
