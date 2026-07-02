import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let validateIban = SlateTool.create(spec, {
  name: 'Validate IBAN',
  key: 'validate_iban',
  description: `Validates an International Bank Account Number (IBAN) and returns details about the associated bank and country. Use this to verify IBAN correctness before processing payments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ibanNumber: z.string().describe('The IBAN to validate (e.g. "DE89370400440532013000")')
    })
  )
  .output(
    z.object({
      iban: z.string().optional().describe('The validated IBAN'),
      isValid: z.boolean().optional().describe('Whether the IBAN is valid'),
      countryCode: z.string().optional().describe('Country code from the IBAN'),
      countryName: z.string().optional().describe('Country name'),
      bankName: z.string().optional().describe('Name of the bank'),
      bankCity: z.string().optional().describe('City where the bank is located'),
      bankBic: z.string().optional().describe('BIC/SWIFT code of the bank'),
      bankBranch: z.string().optional().describe('Bank branch name'),
      bankAddress: z.string().optional().describe('Bank address'),
      bankUrl: z.string().optional().describe('Bank website URL'),
      sepaCompliant: z.boolean().optional().describe('Whether the account is SEPA compliant')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.validateIban({ ibanNumber: ctx.input.ibanNumber });

    let output = {
      iban: result.iban ?? ctx.input.ibanNumber,
      isValid: result.is_valid ?? undefined,
      countryCode: result.country?.code ?? result.country_code ?? undefined,
      countryName: result.country?.name ?? result.country_name ?? undefined,
      bankName: result.bank_data?.name ?? result.bank_name ?? undefined,
      bankCity: result.bank_data?.city ?? result.bank_city ?? undefined,
      bankBic: result.bank_data?.bic ?? result.bank_bic ?? undefined,
      bankBranch: result.bank_data?.branch ?? undefined,
      bankAddress: result.bank_data?.address ?? undefined,
      bankUrl: result.bank_data?.url ?? undefined,
      sepaCompliant: result.is_sepa ?? undefined
    };

    return {
      output,
      message: `IBAN **${output.iban}** is **${output.isValid ? 'valid' : 'invalid'}**${output.bankName ? ` — ${output.bankName}` : ''}${output.countryName ? `, ${output.countryName}` : ''}.`
    };
  })
  .build();
