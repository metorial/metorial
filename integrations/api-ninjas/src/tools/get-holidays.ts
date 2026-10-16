import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHolidays = SlateTool.create(spec, {
  name: 'Get Holidays',
  key: 'get_holidays',
  description:
    'Get holidays and observances for a country and year, with an optional holiday-type filter.',
  constraints: ['Free plans support the current year; other years require a premium plan.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      country: z
        .string()
        .describe('Country name or ISO two- or three-letter code, such as US'),
      year: z
        .number()
        .int()
        .min(2005)
        .max(2039)
        .optional()
        .describe('Calendar year; defaults to the current year'),
      type: z
        .string()
        .optional()
        .describe('Holiday type, such as PUBLIC_HOLIDAY, OBSERVANCE, or BANK_HOLIDAY')
    })
  )
  .output(
    z.object({
      holidays: z.array(
        z.object({
          name: z.string(),
          date: z.string(),
          country: z.string(),
          countryCode: z.string().optional(),
          year: z.number().optional(),
          day: z.string().optional(),
          type: z.string().optional(),
          raw: z.unknown().optional().describe('Original holiday response')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getHolidays(pickDefined(ctx.input));
    return {
      output: {
        holidays: result.map(
          (holiday: {
            name: string;
            date: string;
            country: string;
            iso?: string | null;
            year?: number | null;
            day?: string | null;
            type?: string | null;
          }) => ({
            name: holiday.name,
            date: holiday.date,
            country: holiday.country,
            countryCode: holiday.iso ?? undefined,
            year: holiday.year ?? undefined,
            day: holiday.day ?? undefined,
            type: holiday.type ?? undefined,
            raw: holiday
          })
        )
      },
      message: `Found ${result.length} holidays and observances for ${ctx.input.country}.`
    };
  })
  .build();
