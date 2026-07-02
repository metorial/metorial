import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeAddress = SlateTool.create(spec, {
  name: 'Parse Address from Text',
  key: 'recognize_address',
  description: `Extract structured address data from unstructured text such as emails, SMS messages, support tickets, or other documents. Returns a parsed address with a confidence score. Currently supports the US, Canada, Australia, New Zealand, UK, and Ireland.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Unstructured text containing an address to extract')
    })
  )
  .output(
    z.object({
      score: z.number().describe('Confidence score of the address recognition (0-1)'),
      address: z.object({
        name: z.string().optional().describe('Recognized name'),
        companyName: z.string().optional().describe('Recognized company name'),
        phone: z.string().optional().describe('Recognized phone number'),
        addressLine1: z.string().optional().describe('First line of the street address'),
        addressLine2: z.string().optional().describe('Second line of the street address'),
        cityLocality: z.string().optional().describe('City or locality'),
        stateProvince: z.string().optional().describe('State or province'),
        postalCode: z.string().optional().describe('Postal or ZIP code'),
        countryCode: z.string().optional().describe('Two-letter ISO country code')
      }),
      entities: z.array(
        z.object({
          type: z.string().describe('Entity type (e.g. address_line, city_locality)'),
          score: z.number().describe('Entity confidence score'),
          text: z.string().describe('Matched text from the input'),
          startIndex: z.number().describe('Start position in the input text'),
          endIndex: z.number().describe('End position in the input text')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.recognizeAddress(ctx.input.text);

    return {
      output: {
        score: result.score,
        address: {
          name: result.address?.name,
          companyName: result.address?.company_name,
          phone: result.address?.phone,
          addressLine1: result.address?.address_line1,
          addressLine2: result.address?.address_line2,
          cityLocality: result.address?.city_locality,
          stateProvince: result.address?.state_province,
          postalCode: result.address?.postal_code,
          countryCode: result.address?.country_code
        },
        entities: result.entities.map(e => ({
          type: e.type,
          score: e.score,
          text: e.text,
          startIndex: e.start_index,
          endIndex: e.end_index
        }))
      },
      message: `Parsed address with **${Math.round(result.score * 100)}%** confidence from the provided text.`
    };
  })
  .build();
