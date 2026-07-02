import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

let holidaySchema = z.object({
  name: z.string().optional().describe('Name of the holiday'),
  nameLocal: z.string().optional().describe('Local name of the holiday'),
  language: z.string().optional().describe('Language of the local name'),
  description: z.string().optional().describe('Description of the holiday'),
  country: z.string().optional().describe('Country code'),
  location: z.string().optional().describe('Specific location/region for the holiday'),
  type: z.string().optional().describe('Type of holiday (e.g. national, local, observance)'),
  date: z.string().optional().describe('Date of the holiday in YYYY-MM-DD format'),
  dateYear: z.string().optional().describe('Year'),
  dateMonth: z.string().optional().describe('Month'),
  dateDay: z.string().optional().describe('Day'),
  weekDay: z.string().optional().describe('Day of the week')
});

export let publicHolidays = SlateTool.create(spec, {
  name: 'Public Holidays',
  key: 'public_holidays',
  description: `Retrieves public holidays for any country. Filter by year, month, or specific day to find national holidays, observances, and local celebrations.`,
  instructions: [
    'Use 2-letter ISO country codes (e.g. US, GB, DE, FR).',
    'If year is omitted, the current year is used.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      country: z.string().describe('ISO 3166-1 alpha-2 country code (e.g. "US", "GB", "DE")'),
      year: z
        .number()
        .optional()
        .describe('Year to filter holidays (e.g. 2024). Defaults to current year.'),
      month: z.number().optional().describe('Month to filter holidays (1-12)'),
      day: z.number().optional().describe('Day to filter holidays (1-31)')
    })
  )
  .output(
    z.object({
      holidays: z.array(holidaySchema).describe('List of matching public holidays'),
      totalCount: z.number().describe('Total number of holidays returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.getHolidays({
      country: ctx.input.country,
      year: ctx.input.year,
      month: ctx.input.month,
      day: ctx.input.day
    });

    let holidays = Array.isArray(result) ? result : [];

    let mappedHolidays = holidays.map((h: any) => ({
      name: h.name ?? undefined,
      nameLocal: h.name_local ?? undefined,
      language: h.language ?? undefined,
      description: h.description ?? undefined,
      country: h.country ?? undefined,
      location: h.location ?? undefined,
      type: h.type ?? undefined,
      date: h.date ?? undefined,
      dateYear: h.date_year ?? undefined,
      dateMonth: h.date_month ?? undefined,
      dateDay: h.date_day ?? undefined,
      weekDay: h.week_day ?? undefined
    }));

    return {
      output: {
        holidays: mappedHolidays,
        totalCount: mappedHolidays.length
      },
      message: `Found **${mappedHolidays.length}** public holiday(s) for **${ctx.input.country}**${ctx.input.year ? ` in ${ctx.input.year}` : ''}.`
    };
  })
  .build();
