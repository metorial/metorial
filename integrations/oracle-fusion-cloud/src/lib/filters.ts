import { createApiServiceError } from 'slates';
import { hasControlCharacters } from './urls';

let validateField = (field: string, allowedFields: readonly string[]) => {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field) || !allowedFields.includes(field)) {
    throw createApiServiceError(
      'The requested filter field is not supported for this resource.',
      { reason: 'oracle_fusion_invalid_filter' }
    );
  }
};

let quoteLiteral = (value: string) => {
  if (hasControlCharacters(value)) {
    throw createApiServiceError('Filter values cannot contain control characters.', {
      reason: 'oracle_fusion_invalid_filter'
    });
  }
  return `'${value.replaceAll("'", "''")}'`;
};

export let adfEquals = (
  field: string,
  value: string | number | boolean,
  allowedFields: readonly string[]
) => {
  validateField(field, allowedFields);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      throw createApiServiceError('The numeric filter value is outside the supported range.', {
        reason: 'oracle_fusion_invalid_filter'
      });
    }
    return `${field}=${value}`;
  }
  return `${field}=${quoteLiteral(String(value))}`;
};

export let adfComparison = (
  field: string,
  operator: '>=' | '<=' | '>' | '<',
  value: string | number,
  allowedFields: readonly string[]
) => {
  validateField(field, allowedFields);
  if (!['>=', '<=', '>', '<'].includes(operator)) {
    throw createApiServiceError('The comparison filter operator is not supported.', {
      reason: 'oracle_fusion_invalid_filter'
    });
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      throw createApiServiceError('The numeric filter value is outside the supported range.', {
        reason: 'oracle_fusion_invalid_filter'
      });
    }
    return `${field}${operator}${value}`;
  }
  return `${field}${operator}${quoteLiteral(value)}`;
};

export let adfIdEquals = (
  field: string,
  value: string | undefined,
  allowedFields: readonly string[]
): string | undefined => {
  if (value === undefined) return undefined;
  validateField(field, allowedFields);
  if (!/^[0-9]+$/.test(value)) {
    throw createApiServiceError('The identifier filter must contain decimal digits only.', {
      reason: 'oracle_fusion_invalid_filter'
    });
  }
  return `${field}=${value}`;
};

export let adfContains = (field: string, value: string, allowedFields: readonly string[]) => {
  validateField(field, allowedFields);
  // Framework 4 has no documented literal-wildcard escape for LIKE filters.
  if (/[%_*?\\]/.test(value)) {
    throw createApiServiceError(
      'Contains filters cannot include percent, underscore, asterisk, question mark, or backslash characters. Use an exact filter for these values.',
      { reason: 'oracle_fusion_invalid_filter' }
    );
  }
  return `${field} LIKE ${quoteLiteral(`%${value}%`)}`;
};

export let andFilters = (...terms: (string | undefined)[]): string | undefined => {
  let defined = terms.filter((term): term is string => Boolean(term));
  return defined.length ? defined.map(term => `(${term})`).join(' AND ') : undefined;
};
