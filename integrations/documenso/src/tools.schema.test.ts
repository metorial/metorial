import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Documenso input schemas', provider.actions);
const legacy = [
  'find_envelopes',
  'get_envelope',
  'create_envelope',
  'update_envelope',
  'delete_envelope',
  'distribute_envelope',
  'duplicate_envelope',
  'manage_recipients',
  'manage_fields',
  'use_template',
  'manage_folders',
  'get_audit_log'
];
describe('Documenso compatibility contracts', () => {
  it('preserves twelve released keys and adds only consolidated PDF delivery', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...legacy, 'download_envelope_file'].sort()
    );
  });
  it('keeps production identifiers below sixty characters', () => {
    for (const a of provider.actions) expect(`documenso-${a.key}`.length).toBeLessThan(60);
  });
  it.each(['list', 'create', 'update', 'delete'])('preserves folder action %s', action =>
    expect(
      provider.actions.find(a => a.key === 'manage_folders')!.inputSchema.safeParse({ action })
        .success
    ).toBe(true));
  it('preserves numeric recipient/field IDs and existing coordinate names', () => {
    const a = provider.actions.find(a => a.key === 'manage_fields')!;
    expect(
      a.inputSchema.safeParse({
        envelopeId: 'env_1',
        fieldsToCreate: [
          {
            type: 'TEXT',
            recipientId: 123,
            pageNumber: 1,
            pageX: 0,
            pageY: 0,
            width: 10,
            height: 10
          }
        ]
      }).success
    ).toBe(true);
    expect(
      a.inputSchema.safeParse({
        envelopeId: 'env_1',
        fieldsToCreate: [
          {
            type: 'TEXT',
            recipientId: '123',
            pageNumber: 1,
            pageX: 0,
            pageY: 0,
            width: 10,
            height: 10
          }
        ]
      }).success
    ).toBe(false);
  });
  it('preserves DOCUMENT defaults and optional recipient name/role', () => {
    const a = provider.actions.find(a => a.key === 'create_envelope')!;
    expect(
      a.inputSchema.parse({
        title: 'Controlled draft',
        recipients: [{ email: 'test@example.invalid' }]
      })
    ).toMatchObject({ type: 'DOCUMENT', recipients: [{ email: 'test@example.invalid' }] });
  });
  it.each([
    'SIGNATURE',
    'INITIALS',
    'NAME',
    'EMAIL',
    'DATE',
    'TEXT',
    'NUMBER',
    'CHECKBOX',
    'RADIO',
    'DROPDOWN'
  ])('preserves field type %s', type =>
    expect(
      provider.actions
        .find(a => a.key === 'manage_fields')!
        .inputSchema.safeParse({ envelopeId: 'env_1', fieldsToUpdate: [{ fieldId: 1, type }] })
        .success
    ).toBe(true));
});
