import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleSlidesActionScopes } from './scopes';

describe('google-slides provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-slides',
        name: 'Google Slides',
        description:
          'Create, read, edit, and delete Google Slides presentations. Create and manipulate slides with predefined or custom layouts. Insert, style, and replace text across slides, including bulk placeholder replacement for template-based generation. Add and position shapes, text boxes, lines, and images. Embed and refresh charts linked to Google Sheets. Manage speaker notes, duplicate or reorder slides, and perform batch updates combining multiple operations in a single call. Supports automated report and deck generation using templates with placeholder text and image substitution.'
      },
      toolIds: [
        'create_presentation',
        'get_presentation',
        'get_slide_thumbnail',
        'manage_slides',
        'edit_text',
        'replace_text',
        'add_image',
        'add_shape',
        'manage_speaker_notes',
        'embed_sheets_chart',
        'batch_update',
        'delete_element'
      ],
      triggerIds: ['inbound_webhook', 'presentation_changed'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'create_presentation', readOnly: false, destructive: false },
        { id: 'get_presentation', readOnly: true, destructive: false },
        { id: 'get_slide_thumbnail', readOnly: true, destructive: false },
        { id: 'manage_slides', readOnly: false, destructive: true },
        { id: 'edit_text', readOnly: false, destructive: true },
        { id: 'replace_text', readOnly: false, destructive: true },
        { id: 'add_image', readOnly: false, destructive: true },
        { id: 'add_shape', readOnly: false, destructive: false },
        { id: 'manage_speaker_notes', readOnly: false, destructive: false },
        { id: 'embed_sheets_chart', readOnly: false, destructive: false },
        { id: 'batch_update', readOnly: false, destructive: true },
        { id: 'delete_element', readOnly: false, destructive: true }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'presentation_changed', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(14);

    let expectedScopes = {
      create_presentation: googleSlidesActionScopes.createPresentation,
      get_presentation: googleSlidesActionScopes.getPresentation,
      get_slide_thumbnail: googleSlidesActionScopes.getSlideThumbnail,
      manage_slides: googleSlidesActionScopes.manageSlides,
      edit_text: googleSlidesActionScopes.editText,
      replace_text: googleSlidesActionScopes.replaceText,
      add_image: googleSlidesActionScopes.addImage,
      add_shape: googleSlidesActionScopes.addShape,
      manage_speaker_notes: googleSlidesActionScopes.manageSpeakerNotes,
      embed_sheets_chart: googleSlidesActionScopes.embedSheetsChart,
      batch_update: googleSlidesActionScopes.batchUpdate,
      delete_element: googleSlidesActionScopes.deleteElement,
      inbound_webhook: googleSlidesActionScopes.inboundWebhook,
      presentation_changed: googleSlidesActionScopes.presentationChanged
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Presentations')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});
