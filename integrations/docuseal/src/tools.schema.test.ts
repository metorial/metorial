import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('DocuSeal input schemas', provider.actions);
describe('DocuSeal public compatibility', () => {
  it('retains fifteen keys and two approved additions', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual([
      'archive_submission',
      'archive_template',
      'clone_template',
      'create_submission',
      'create_submission_from_pdf',
      'create_template',
      'download_submission_documents',
      'get_submission',
      'get_submitter',
      'get_template',
      'list_submissions',
      'list_submitters',
      'list_templates',
      'merge_templates',
      'update_submission',
      'update_submitter',
      'update_template'
    ]);
    for (const action of provider.actions)
      expect(`docuseal-${action.key}`.length).toBeLessThan(60);
  });
  for (const [key, input] of [
    [
      'create_template',
      {
        sourceType: 'html',
        name: 'Synthetic',
        html: '<text-field name="Text"/>',
        sharedLink: false
      }
    ],
    [
      'create_template',
      {
        sourceType: 'pdf',
        name: 'Synthetic',
        documents: [{ file: 'AA==', fields: [{ arbitrary_field: true }] }],
        removeTags: false
      }
    ],
    ['update_template', { templateId: 1, externalId: 'legacy', roles: ['Signer'] }],
    [
      'create_submission',
      {
        templateId: 1,
        submitters: [
          {
            email: 'controlled@example.invalid',
            values: { camelCase: { exact_Key: true } },
            completed: false,
            requirePhone2fa: false
          }
        ],
        sendEmail: false,
        sendSms: false,
        variables: { preserveKey: true }
      }
    ],
    [
      'create_submission_from_pdf',
      {
        documents: [{ name: 'PDF', file: 'AA==' }],
        submitters: [{ email: 'controlled@example.invalid' }]
      }
    ],
    ['list_templates', { after: 1, limit: 100, archived: false }],
    ['list_submissions', { status: 'declined', templateId: 1 }],
    ['list_submitters', { externalId: 'legacy', completedBefore: '2026-10-01T00:00:00Z' }],
    ['get_submission', { submissionId: 1, mergeDocuments: true }],
    [
      'update_submitter',
      { submitterId: 1, completed: false, sendEmail: false, values: { camelCase: true } }
    ],
    ['update_submission', { submissionId: 1, expireAt: null, archived: false }]
  ] as const)
    it(`accepts compatible ${key} shape ${JSON.stringify(input)}`, () => {
      const action = provider.actions.find(action => action.key === key);
      expect(action).toBeDefined();
      expect(action?.inputSchema.safeParse(input).success).toBe(true);
    });
});
