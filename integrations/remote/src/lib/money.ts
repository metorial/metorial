import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError } from 'slates';

// Documented integer-hundredth fields from expense, incentive, payslip and cost DTOs.
// Counts, rates, percentages and form-schema numeric metadata are separate values.
export const monetaryFields = new Set([
  'amount',
  'tax_amount',
  'converted_amount',
  'converted_tax_amount',
  'net_pay_converted_amount',
  'net_pay_source_amount',
  'quoted_amount',
  'annual_amount',
  'monthly_amount',
  'annual_gross_salary',
  'annual_gross_salary_in_employer_currency',
  'annual_total_cost',
  'annual_total_cost_in_employer_currency',
  'annual_benefits_total',
  'annual_contributions_total',
  'annual_indirect_tax',
  'annual_management_fee',
  'annual_total',
  'extra_statutory_payments_total',
  'fringe_benefits_tax_total',
  'monthly_benefits_total',
  'monthly_contributions_total',
  'monthly_fringe_benefits_tax_total',
  'monthly_gross_salary',
  'monthly_indirect_tax',
  'monthly_management_fee',
  'monthly_tce',
  'monthly_total'
]);

export function validateMonetaryNumber(value: number): void {
  if (!Number.isSafeInteger(value))
    throw createApiServiceError(
      'Remote returned a monetary value outside exact integer hundredths. Read the record before continuing; the amount was not rounded.',
      { reason: 'remote_money_response' }
    );
}

function exactInteger(source: string, value: number): boolean {
  let [coefficient = '', exponent = '0'] = source.toLowerCase().split('e');
  let negative = coefficient.startsWith('-');
  let [whole = '', fraction = ''] = (negative ? coefficient.slice(1) : coefficient).split('.');
  let digits = (whole + fraction).replace(/^0+/, '') || '0';
  if (digits === '0') return value === 0;
  let scale = Number(exponent) - fraction.length;
  while (digits.endsWith('0')) {
    digits = digits.slice(0, -1);
    scale++;
  }
  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 15 || digits.length + scale > 16)
    return false;
  return BigInt(`${negative ? '-' : ''}${digits}${'0'.repeat(scale)}`) === BigInt(value);
}

export function parseRemoteResponse(body: unknown): unknown {
  if (typeof body !== 'string') return body;
  if (!body.trim()) return undefined;
  try {
    let previous = '',
      key = '';
    for (let match of body.matchAll(
      /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\]:,]|true|false|null/g
    )) {
      let token = match[0];
      if (token === ':' && previous.startsWith('"')) key = JSON.parse(previous);
      else if (token !== ':' && key) {
        if (monetaryFields.has(key) && /^-?\d/.test(token)) {
          let value = Number(token);
          validateMonetaryNumber(value);
          if (!exactInteger(token, value))
            throw createApiServiceError(
              'Remote returned a monetary number that cannot be read as exact integer hundredths. The amount was not rounded.',
              { reason: 'remote_money_response' }
            );
        }
        key = '';
      }
      previous = token;
    }
    return JSON.parse(body);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw createApiServiceError('Remote returned invalid JSON.', {
      reason: 'remote_response'
    });
  }
}
