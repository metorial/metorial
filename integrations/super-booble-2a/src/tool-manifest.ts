import type { SuperGoogleToolManifestEntry } from '@slates/super-google-tools';

export type SuperGoogle2ASourceIntegration =
  | 'google-docs'
  | 'google-sheets'
  | 'google-slides'
  | 'google-forms'
  | 'google-calendar'
  | 'google-meet'
  | 'google-contacts'
  | 'google-tasks'
  | 'google-ads'
  | 'google-search-console'
  | 'google-tag-manager';

let include = (
  sourceIntegration: SuperGoogle2ASourceIntegration,
  sourceKeys: readonly string[]
): SuperGoogleToolManifestEntry[] =>
  sourceKeys.map(sourceKey => ({ sourceIntegration, sourceKey }));

export let superGoogle2AToolManifest = [
  // The Drive-backed Docs and Sheets tools are included: this aggregate requests drive.file
  // (no YouTube scope is requested next to it), which satisfies each of their scope clauses for
  // files created or opened through this connection.
  ...include('google-docs', [
    'create_document',
    'get_document',
    'edit_document',
    'merge_template',
    'create_document_markdown',
    'update_document_markdown',
    'list_documents'
  ]),
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'manage_named_ranges',
    exposedKey: 'docs_manage_named_ranges'
  },
  ...include('google-sheets', [
    'create_spreadsheet',
    'get_spreadsheet',
    'update_spreadsheet',
    'read_cells',
    'write_cells',
    'clear_cells',
    'manage_sheets',
    'format_cells',
    'create_chart',
    'create_pivot_table',
    'set_data_validation',
    'manage_protected_ranges',
    'create_filter_view',
    'merge_cells',
    'delete_spreadsheet'
  ]),
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'batch_update',
    exposedKey: 'sheets_batch_update'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'manage_named_ranges',
    exposedKey: 'sheets_manage_named_ranges'
  },
  ...include('google-slides', [
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
    'delete_element'
  ]),
  {
    sourceIntegration: 'google-slides',
    sourceKey: 'batch_update',
    exposedKey: 'slides_batch_update'
  },
  ...include('google-forms', [
    'create_form',
    'get_form',
    'update_form',
    'set_publish_settings',
    'manage_watches'
  ]),
  {
    sourceIntegration: 'google-forms',
    sourceKey: 'get_response',
    scopes: {
      AND: [{ OR: ['https://www.googleapis.com/auth/forms.responses.readonly'] }]
    }
  },
  {
    sourceIntegration: 'google-forms',
    sourceKey: 'list_responses',
    scopes: {
      AND: [{ OR: ['https://www.googleapis.com/auth/forms.responses.readonly'] }]
    }
  },
  ...include('google-calendar', [
    'create_event',
    'list_events',
    'get_event',
    'respond_to_event',
    'update_event',
    'batch_modify_events',
    'delete_event',
    'quick_add_event',
    'list_calendars',
    'manage_calendar',
    'find_free_busy',
    'manage_sharing',
    'get_colors',
    'get_settings'
  ]),
  ...include('google-meet', [
    'create_space',
    'get_space',
    'update_space',
    'end_active_conference',
    'add_member',
    'get_member',
    'list_members',
    'remove_member',
    'list_conference_records',
    'get_conference_record',
    'get_participant',
    'list_participants',
    'get_participant_session',
    'get_participant_sessions',
    'list_recordings',
    'get_recording',
    'list_smart_notes',
    'get_smart_note',
    'list_transcripts',
    'get_transcript',
    'get_transcript_entry',
    'list_transcript_entries'
  ]),
  ...include('google-contacts', [
    'create_contact',
    'get_contact',
    'update_contact',
    'delete_contact',
    'list_contacts',
    'search_contacts',
    'create_contact_group',
    'update_contact_group',
    'delete_contact_group',
    'list_contact_groups',
    'get_contact_group',
    'modify_group_members',
    'list_other_contacts',
    'search_other_contacts',
    'copy_other_contact',
    'search_directory',
    'get_my_profile',
    'manage_contact_photo',
    'batch_modify_contacts'
  ]),
  ...include('google-tasks', [
    'list_task_lists',
    'create_task_list',
    'update_task_list',
    'delete_task_list',
    'list_tasks',
    'get_task',
    'create_task',
    'update_task',
    'delete_task',
    'move_task',
    'clear_completed_tasks'
  ]),
  {
    sourceIntegration: 'google-ads',
    sourceKey: 'list_accounts',
    exposedKey: 'ads_list_accounts'
  },
  ...include('google-ads', [
    'search_reports',
    'manage_campaigns',
    'manage_ad_groups',
    'manage_ads',
    'manage_keywords',
    'manage_bidding_strategies',
    'manage_conversion_actions',
    'generate_keyword_ideas',
    'upload_offline_conversions',
    'manage_audience_lists'
  ]),
  ...include('google-search-console', [
    'query_search_analytics',
    'list_sites',
    'manage_site',
    'manage_sitemap',
    'inspect_url'
  ]),
  {
    sourceIntegration: 'google-tag-manager',
    sourceKey: 'list_accounts',
    exposedKey: 'tag_manager_list_accounts'
  },
  ...include('google-tag-manager', [
    'manage_container',
    'manage_workspace',
    'manage_tag',
    'manage_trigger',
    'manage_variable',
    'manage_version',
    'manage_environment',
    'manage_folder',
    'manage_user_permission'
  ])
] satisfies SuperGoogleToolManifestEntry[];

export let superGoogle2AIncludedToolManifest = superGoogle2AToolManifest.flatMap(entry =>
  entry.status === 'omitted'
    ? []
    : [
        {
          sourceIntegration: entry.sourceIntegration as SuperGoogle2ASourceIntegration,
          sourceKey: entry.sourceKey,
          exposedKey: entry.exposedKey ?? entry.sourceKey
        }
      ]
);

export let superGoogle2AOmittedToolManifest = superGoogle2AToolManifest.flatMap(entry =>
  entry.status === 'omitted' ? [entry] : []
);
