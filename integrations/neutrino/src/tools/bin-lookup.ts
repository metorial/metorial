import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let binLookupTool = SlateTool.create(spec, {
  name: 'BIN Lookup',
  key: 'bin_lookup',
  description: `Look up a Bank Identification Number (BIN) or Issuer Identification Number (IIN) to identify the card brand, type, issuer, and country. Optionally provide a customer IP for fraud detection with IP geolocation and blocklist checks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      binNumber: z
        .string()
        .describe('The BIN/IIN number (first 6, 8, or 10 digits of a card number)'),
      customerIp: z
        .string()
        .optional()
        .describe('Customer IP address for enhanced fraud detection')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the BIN/IIN is valid'),
      binNumber: z.string().describe('The BIN number'),
      cardBrand: z.string().describe('Card brand (e.g., Visa, Mastercard)'),
      cardType: z.string().describe('Card type: DEBIT, CREDIT, or CHARGE CARD'),
      cardCategory: z
        .string()
        .describe('Card category (e.g., CLASSIC, BUSINESS, PLATINUM, PREPAID)'),
      issuer: z.string().describe('Card issuer name'),
      issuerWebsite: z.string().describe('Issuer website URL'),
      issuerPhone: z.string().describe('Issuer phone number'),
      country: z.string().describe('Issuer country name'),
      countryCode: z.string().describe('Issuer ISO 2-letter country code'),
      isCommercial: z.boolean().describe('Whether this is a commercial/business card'),
      isPrepaid: z.boolean().describe('Whether this is a prepaid card'),
      ipMatchesBin: z.boolean().describe('Whether customer IP country matches BIN country'),
      ipCountry: z.string().describe('Customer IP country (if customerIp provided)'),
      ipBlocklisted: z
        .boolean()
        .describe('Whether customer IP is blocklisted (if customerIp provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.binLookup({
      binNumber: ctx.input.binNumber,
      customerIp: ctx.input.customerIp
    });

    return {
      output: {
        valid: result.valid ?? false,
        binNumber: result.binNumber ?? ctx.input.binNumber,
        cardBrand: result.cardBrand ?? '',
        cardType: result.cardType ?? '',
        cardCategory: result.cardCategory ?? '',
        issuer: result.issuer ?? '',
        issuerWebsite: result.issuerWebsite ?? '',
        issuerPhone: result.issuerPhone ?? '',
        country: result.country ?? '',
        countryCode: result.countryCode ?? '',
        isCommercial: result.isCommercial ?? false,
        isPrepaid: result.isPrepaid ?? false,
        ipMatchesBin: result.ipMatchesBin ?? false,
        ipCountry: result.ipCountry ?? '',
        ipBlocklisted: result.ipBlocklisted ?? false
      },
      message: result.valid
        ? `**${result.cardBrand} ${result.cardType}** (${result.cardCategory}) issued by ${result.issuer || 'unknown'} in ${result.country}.${ctx.input.customerIp ? (result.ipMatchesBin ? ' IP matches BIN country.' : ' ⚠️ IP does NOT match BIN country.') : ''}${result.ipBlocklisted ? ' ⚠️ Customer IP is blocklisted.' : ''}`
        : `BIN **${ctx.input.binNumber}** is not valid or not found.`
    };
  })
  .build();
