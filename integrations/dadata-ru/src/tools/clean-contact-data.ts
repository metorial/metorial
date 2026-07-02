import { SlateTool } from 'slates';
import { z } from 'zod';
import { CleanerClient } from '../lib/client';
import { spec } from '../spec';

let cleanedNameSchema = z.object({
  source: z.string().describe('Original input'),
  result: z.string().nullable().describe('Standardized name (nominative case)'),
  resultGenitive: z.string().nullable().describe('Name in genitive case'),
  resultDative: z.string().nullable().describe('Name in dative case'),
  resultAblative: z.string().nullable().describe('Name in instrumental case'),
  surname: z.string().nullable().describe('Surname'),
  name: z.string().nullable().describe('First name'),
  patronymic: z.string().nullable().describe('Patronymic'),
  gender: z.string().nullable().describe('Gender: М (male), Ж (female), НД (not determined)'),
  qualityCode: z.number().nullable().describe('Quality: 0=confident, 1=needs review')
});

let cleanedPhoneSchema = z.object({
  source: z.string().describe('Original input'),
  phone: z.string().nullable().describe('Standardized phone number'),
  phoneType: z.string().nullable().describe('Type: Мобильный, Стационарный, etc.'),
  countryCode: z.string().nullable().describe('Country code'),
  cityCode: z.string().nullable().describe('City/area code'),
  number: z.string().nullable().describe('Phone number without codes'),
  extension: z.string().nullable().describe('Extension number'),
  provider: z.string().nullable().describe('Telecom provider'),
  country: z.string().nullable().describe('Country'),
  region: z.string().nullable().describe('Region'),
  city: z.string().nullable().describe('City'),
  timezone: z.string().nullable().describe('Timezone'),
  qualityCode: z
    .number()
    .nullable()
    .describe('Quality: 0=confident, 1=uncertain, 2=invalid, 3=multiple')
});

let cleanedEmailSchema = z.object({
  source: z.string().describe('Original input'),
  email: z.string().nullable().describe('Corrected email'),
  local: z.string().nullable().describe('Local part (before @)'),
  domain: z.string().nullable().describe('Domain (after @)'),
  emailType: z.string().nullable().describe('Type: PERSONAL, CORPORATE, ROLE, DISPOSABLE'),
  qualityCode: z
    .number()
    .nullable()
    .describe('Quality: 0=valid, 1=invalid, 2=empty, 3=disposable, 4=corrected')
});

let cleanedPassportSchema = z.object({
  source: z.string().describe('Original input'),
  series: z.string().nullable().describe('Passport series'),
  number: z.string().nullable().describe('Passport number'),
  qualityCode: z.number().nullable().describe('Quality code')
});

let cleanedBirthdateSchema = z.object({
  source: z.string().describe('Original input'),
  birthdate: z.string().nullable().describe('Standardized birthdate'),
  qualityCode: z.number().nullable().describe('Quality code')
});

let cleanedVehicleSchema = z.object({
  source: z.string().describe('Original input'),
  result: z.string().nullable().describe('Standardized brand and model'),
  brand: z.string().nullable().describe('Vehicle brand'),
  model: z.string().nullable().describe('Vehicle model'),
  qualityCode: z.number().nullable().describe('Quality code')
});

export let cleanContactData = SlateTool.create(spec, {
  name: 'Clean Contact Data',
  key: 'clean_contact_data',
  description: `Standardizes and validates contact data including personal names, phone numbers, emails, passport numbers, birthdates, and vehicle identifiers.
Corrects common errors, normalizes formatting, and provides quality codes indicating confidence level. For names, also provides declension cases (genitive, dative, instrumental).
Specify the data type and the raw input to clean.`,
  constraints: [
    'Requires both API Key and Secret Key.',
    'Rate limit: 20 requests/sec per IP.',
    'One item per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z
        .enum(['name', 'phone', 'email', 'passport', 'birthdate', 'vehicle'])
        .describe('Type of contact data to clean'),
      value: z.string().describe('Raw input string to standardize')
    })
  )
  .output(
    z.object({
      cleanedName: cleanedNameSchema
        .nullable()
        .describe('Cleaned name result (when dataType is "name")'),
      cleanedPhone: cleanedPhoneSchema
        .nullable()
        .describe('Cleaned phone result (when dataType is "phone")'),
      cleanedEmail: cleanedEmailSchema
        .nullable()
        .describe('Cleaned email result (when dataType is "email")'),
      cleanedPassport: cleanedPassportSchema
        .nullable()
        .describe('Cleaned passport result (when dataType is "passport")'),
      cleanedBirthdate: cleanedBirthdateSchema
        .nullable()
        .describe('Cleaned birthdate result (when dataType is "birthdate")'),
      cleanedVehicle: cleanedVehicleSchema
        .nullable()
        .describe('Cleaned vehicle result (when dataType is "vehicle")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CleanerClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let result: any;
    switch (ctx.input.dataType) {
      case 'name':
        result = await client.cleanName(ctx.input.value);
        break;
      case 'phone':
        result = await client.cleanPhone(ctx.input.value);
        break;
      case 'email':
        result = await client.cleanEmail(ctx.input.value);
        break;
      case 'passport':
        result = await client.cleanPassport(ctx.input.value);
        break;
      case 'birthdate':
        result = await client.cleanBirthdate(ctx.input.value);
        break;
      case 'vehicle':
        result = await client.cleanVehicle(ctx.input.value);
        break;
    }

    let r = Array.isArray(result) ? result[0] : result;

    let output: any = {
      cleanedName: null,
      cleanedPhone: null,
      cleanedEmail: null,
      cleanedPassport: null,
      cleanedBirthdate: null,
      cleanedVehicle: null
    };

    let message = '';

    switch (ctx.input.dataType) {
      case 'name':
        output.cleanedName = {
          source: r?.source || ctx.input.value,
          result: r?.result ?? null,
          resultGenitive: r?.result_genitive ?? null,
          resultDative: r?.result_dative ?? null,
          resultAblative: r?.result_ablative ?? null,
          surname: r?.surname ?? null,
          name: r?.name ?? null,
          patronymic: r?.patronymic ?? null,
          gender: r?.gender ?? null,
          qualityCode: r?.qc ?? null
        };
        message = r?.result
          ? `Cleaned name: **${r.result}** (gender: ${r.gender || 'N/A'})`
          : `Could not clean name "${ctx.input.value}".`;
        break;
      case 'phone':
        output.cleanedPhone = {
          source: r?.source || ctx.input.value,
          phone: r?.phone ?? null,
          phoneType: r?.type ?? null,
          countryCode: r?.country_code ?? null,
          cityCode: r?.city_code ?? null,
          number: r?.number ?? null,
          extension: r?.extension ?? null,
          provider: r?.provider ?? null,
          country: r?.country ?? null,
          region: r?.region ?? null,
          city: r?.city ?? null,
          timezone: r?.timezone ?? null,
          qualityCode: r?.qc ?? null
        };
        message = r?.phone
          ? `Cleaned phone: **${r.phone}** (${r.type || 'unknown type'})`
          : `Could not clean phone "${ctx.input.value}".`;
        break;
      case 'email':
        output.cleanedEmail = {
          source: r?.source || ctx.input.value,
          email: r?.email ?? null,
          local: r?.local ?? null,
          domain: r?.domain ?? null,
          emailType: r?.type ?? null,
          qualityCode: r?.qc ?? null
        };
        message = r?.email
          ? `Cleaned email: **${r.email}** (${r.type || 'unknown type'})`
          : `Could not clean email "${ctx.input.value}".`;
        break;
      case 'passport':
        output.cleanedPassport = {
          source: r?.source || ctx.input.value,
          series: r?.series ?? null,
          number: r?.number ?? null,
          qualityCode: r?.qc ?? null
        };
        message = r?.series
          ? `Cleaned passport: series **${r.series}**, number **${r.number}**`
          : `Could not clean passport "${ctx.input.value}".`;
        break;
      case 'birthdate':
        output.cleanedBirthdate = {
          source: r?.source || ctx.input.value,
          birthdate: r?.birthdate ?? null,
          qualityCode: r?.qc ?? null
        };
        message = r?.birthdate
          ? `Cleaned birthdate: **${r.birthdate}**`
          : `Could not clean birthdate "${ctx.input.value}".`;
        break;
      case 'vehicle':
        output.cleanedVehicle = {
          source: r?.source || ctx.input.value,
          result: r?.result ?? null,
          brand: r?.brand ?? null,
          model: r?.model ?? null,
          qualityCode: r?.qc ?? null
        };
        message = r?.result
          ? `Cleaned vehicle: **${r.result}**`
          : `Could not clean vehicle "${ctx.input.value}".`;
        break;
    }

    return { output, message };
  })
  .build();
