import { describe, expect, it } from 'vitest';
import {
  formatCustomField,
  formatEnumOption,
  manageCustomFieldsOutputSchema
} from './custom-field-format';

let rawEnumOption = {
  gid: 'enum-option-123',
  resource_type: 'enum_option',
  name: 'In progress',
  color: null,
  enabled: true
};

let formattedEnumOption = {
  enumOptionId: 'enum-option-123',
  gid: 'enum-option-123',
  resourceType: 'enum_option',
  resource_type: 'enum_option',
  name: 'In progress',
  color: null,
  enabled: true
};

describe('custom field enum option formatting', () => {
  it('maps a standalone Asana enum option to the additive public output shape', () => {
    expect(formatEnumOption(rawEnumOption)).toEqual(formattedEnumOption);
  });

  it('maps enum options nested in an Asana custom field', () => {
    expect(
      formatCustomField({
        gid: 'custom-field-456',
        enum_options: [rawEnumOption]
      }).enumOptions
    ).toEqual([formattedEnumOption]);
  });

  it('supports compact Asana enum option responses', () => {
    let enumOption = formatEnumOption({ gid: 'enum-option-compact' });

    expect(manageCustomFieldsOutputSchema.parse({ enumOption }).enumOption).toEqual({
      enumOptionId: 'enum-option-compact',
      gid: 'enum-option-compact'
    });
  });
});
