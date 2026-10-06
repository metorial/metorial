import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

const legacy = [
  'list_surveys',
  'get_survey',
  'create_survey',
  'update_survey',
  'delete_survey',
  'create_collector',
  'update_collector',
  'list_collectors',
  'delete_collector',
  'get_responses',
  'get_response',
  'list_contact_lists',
  'create_contact_list',
  'list_contacts',
  'create_contact',
  'create_contacts_bulk',
  'delete_contact_list',
  'send_invitation',
  'get_current_user'
];
let action = (key: string) => {
  let result = provider.actions.find(action => action.key === key);
  if (!result) throw new Error(`Missing schema ${key}`);
  return result;
};
describeMcpCompatibleToolSchemas('SurveyMonkey object input schemas', provider.actions);
describe('SurveyMonkey compatibility contracts', () => {
  it('retains nineteen legacy keys, twenty-three public tools and one reserved file helper', () => {
    expect(legacy.every(key => provider.actions.some(action => action.key === key))).toBe(
      true
    );
    expect(provider.actions).toHaveLength(24);
    expect(
      provider.actions
        .filter(action => !action.key.startsWith('metorial$'))
        .every(action => `surveymonkey-${action.key}`.length < 60)
    ).toBe(true);
  });
  it('preserves existing create survey and copy fields', () => {
    expect(
      action('create_survey').inputSchema.parse({
        title: 'schema',
        fromTemplateId: '1',
        nickname: '',
        language: 'en',
        folderId: '0'
      })
    ).toMatchObject({ title: 'schema', fromTemplateId: '1', nickname: '', folderId: '0' });
  });
  it('retains all six native collector variants and zero/false settings', () => {
    for (let type of [
      'weblink',
      'email',
      'sms',
      'popup_invitation',
      'popup_survey',
      'embedded_survey'
    ])
      expect(
        action('create_collector').inputSchema.parse({
          surveyId: '1',
          type,
          name: 'schema',
          responseLimit: 0,
          allowMultipleResponses: false
        })
      ).toMatchObject({ type, responseLimit: 0, allowMultipleResponses: false });
  });
  it('preserves the invitation send default while adding explicit recovery branches', () => {
    expect(
      action('send_invitation').inputSchema.parse({ collectorId: '1', contactListIds: ['2'] })
    ).toMatchObject({ action: 'send', messageType: 'invite', contactListIds: ['2'] });
    for (let actionName of ['prepare', 'resume', 'get', 'delete'])
      expect(
        action('send_invitation').inputSchema.safeParse({
          collectorId: '1',
          messageId: '2',
          action: actionName
        }).success
      ).toBe(true);
  });
  it('preserves contact names and permits native absent optional names', () => {
    expect(
      action('create_contact').inputSchema.parse({
        contactListId: '1',
        firstName: '',
        lastName: '',
        email: 'schema@example.test'
      })
    ).toMatchObject({ firstName: '', lastName: '' });
    expect(
      action('create_contact').inputSchema.safeParse({
        contactListId: '1',
        email: 'schema@example.test'
      }).success
    ).toBe(true);
  });
  it('uses exact string IDs and bounded native response pages', () => {
    expect(
      action('get_responses').inputSchema.safeParse({
        surveyId: '9007199254740993',
        perPage: 101
      }).success
    ).toBe(false);
    expect(
      action('get_responses').inputSchema.parse({
        surveyId: '9007199254740993',
        perPage: 100,
        simple: false
      })
    ).toMatchObject({ surveyId: '9007199254740993', simple: false });
  });
  it('keeps auth-scoped regional configuration and no resource IDs in config', () => {
    expect(spec.configSchema.parse({})).toEqual({});
    expect(
      action('get_response').inputSchema.parse({
        surveyId: '1',
        responseId: '2',
        includeFiles: true
      })
    ).toMatchObject({ includeFiles: true });
  });
  it('bounds local export and preserves structured output metadata', () => {
    expect(action('export_responses').inputSchema.parse({ surveyId: '1' })).toMatchObject({
      format: 'json',
      maxPages: 10
    });
    expect(
      action('export_responses').inputSchema.safeParse({ surveyId: '1', maxPages: 101 })
        .success
    ).toBe(false);
  });
});
