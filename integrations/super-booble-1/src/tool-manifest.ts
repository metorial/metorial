import type {
  SuperGoogleOmittedToolManifestEntry,
  SuperGoogleToolManifestEntry
} from '@slates/super-google-tools';

let omitGoogleContactsTool = (
  sourceKey: string,
  reason: string
): SuperGoogleOmittedToolManifestEntry => ({
  sourceIntegration: 'google-contacts',
  sourceKey,
  status: 'omitted',
  reason
});

let contactsWriteReason =
  'Changing saved contacts or contact groups needs the contacts scope, which is outside the aggregate OAuth scope set.';

let contactsReadDuplicateReason = (gmailToolKey: string) =>
  `Saved contacts are already covered by the Gmail ${gmailToolKey} tool under contacts.readonly.`;

let contactGroupsReadReason =
  'Contact groups are left out to keep the aggregate focused on contact lookup; the contact group write tools are outside the aggregate OAuth scope set.';

export let superGoogle1ToolManifest: SuperGoogleToolManifestEntry[] = [
  { sourceIntegration: 'gmail', sourceKey: 'send_email' },
  { sourceIntegration: 'gmail', sourceKey: 'forward_message' },
  {
    sourceIntegration: 'gmail',
    sourceKey: 'search_messages',
    exposedKey: 'gmail_search_messages'
  },
  { sourceIntegration: 'gmail', sourceKey: 'get_message' },
  { sourceIntegration: 'gmail', sourceKey: 'get_profile' },
  { sourceIntegration: 'gmail', sourceKey: 'modify_message' },
  { sourceIntegration: 'gmail', sourceKey: 'delete_messages_permanently' },
  { sourceIntegration: 'gmail', sourceKey: 'manage_draft' },
  { sourceIntegration: 'gmail', sourceKey: 'manage_labels' },
  { sourceIntegration: 'gmail', sourceKey: 'manage_thread' },
  { sourceIntegration: 'gmail', sourceKey: 'delete_thread_permanently' },
  { sourceIntegration: 'gmail', sourceKey: 'manage_settings' },
  { sourceIntegration: 'gmail', sourceKey: 'get_attachment' },
  { sourceIntegration: 'gmail', sourceKey: 'list_google_contacts' },
  { sourceIntegration: 'gmail', sourceKey: 'search_google_contacts' },
  { sourceIntegration: 'gmail', sourceKey: 'get_google_contact' },
  { sourceIntegration: 'gmail', sourceKey: 'import_message' },
  { sourceIntegration: 'gmail', sourceKey: 'insert_message' },

  { sourceIntegration: 'google-drive', sourceKey: 'search_files' },
  { sourceIntegration: 'google-drive', sourceKey: 'get_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'create_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'upload_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'download_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'export_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'get_about' },
  { sourceIntegration: 'google-drive', sourceKey: 'update_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'copy_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'delete_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_permissions' },
  { sourceIntegration: 'google-drive', sourceKey: 'share_file' },
  { sourceIntegration: 'google-drive', sourceKey: 'update_permission' },
  { sourceIntegration: 'google-drive', sourceKey: 'remove_permission' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_comments' },
  { sourceIntegration: 'google-drive', sourceKey: 'create_comment' },
  { sourceIntegration: 'google-drive', sourceKey: 'reply_to_comment' },
  { sourceIntegration: 'google-drive', sourceKey: 'update_comment' },
  { sourceIntegration: 'google-drive', sourceKey: 'delete_comment' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_revisions' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_shared_drives' },
  { sourceIntegration: 'google-drive', sourceKey: 'create_shared_drive' },
  { sourceIntegration: 'google-drive', sourceKey: 'update_shared_drive' },
  { sourceIntegration: 'google-drive', sourceKey: 'delete_shared_drive' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_changes' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_drive_apps' },
  { sourceIntegration: 'google-drive', sourceKey: 'get_drive_app' },
  { sourceIntegration: 'google-drive', sourceKey: 'list_drive_labels' },
  { sourceIntegration: 'google-drive', sourceKey: 'get_drive_label' },

  {
    sourceIntegration: 'google-docs',
    sourceKey: 'create_document',
    status: 'omitted',
    reason: 'This Google Docs tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'create_document_markdown',
    instructions: [
      'Use this when Markdown conversion is needed; the result is a native Google Docs document, not a Markdown file stored in Drive.'
    ]
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'get_document',
    status: 'omitted',
    reason: 'This Google Docs tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'edit_document',
    status: 'omitted',
    reason: 'This Google Docs tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'merge_template',
    status: 'omitted',
    reason: 'This Google Docs tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'list_documents',
    instructions: [
      "Results include Google Docs documents visible through the connected account's granted Drive access."
    ],
    scopes: { AND: [{ OR: ['https://www.googleapis.com/auth/drive'] }] }
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'manage_named_ranges',
    status: 'omitted',
    reason: 'This Google Docs tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-docs',
    sourceKey: 'update_document_markdown',
    instructions: [
      'This is a full-content replacement; use a targeted document-editing workflow for partial changes.',
      'Existing body content is removed when Google Drive imports the supplied Markdown.',
      'The connected account must have access to the target document.'
    ]
  },

  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'create_spreadsheet',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'get_spreadsheet',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'update_spreadsheet',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'delete_spreadsheet',
    constraints: [
      'This permanently deletes the file and cannot be recovered.',
      'The connected account must have permission to delete the spreadsheet.'
    ],
    scopes: { AND: [{ OR: ['https://www.googleapis.com/auth/drive'] }] }
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'read_cells',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'write_cells',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'clear_cells',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'manage_sheets',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'format_cells',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'create_chart',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'create_pivot_table',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'set_data_validation',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'manage_protected_ranges',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'create_filter_view',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'merge_cells',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'batch_update',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },
  {
    sourceIntegration: 'google-sheets',
    sourceKey: 'manage_named_ranges',
    status: 'omitted',
    reason: 'This Google Sheets tool remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.'
  },

  { sourceIntegration: 'google-chat', sourceKey: 'send_message' },
  { sourceIntegration: 'google-chat', sourceKey: 'list_messages' },
  {
    sourceIntegration: 'google-chat',
    sourceKey: 'search_messages',
    exposedKey: 'chat_search_messages'
  },
  { sourceIntegration: 'google-chat', sourceKey: 'search_conversations' },
  { sourceIntegration: 'google-chat', sourceKey: 'manage_space' },
  { sourceIntegration: 'google-chat', sourceKey: 'manage_member' },
  { sourceIntegration: 'google-chat', sourceKey: 'manage_message' },
  { sourceIntegration: 'google-chat', sourceKey: 'manage_reaction' },
  { sourceIntegration: 'google-chat', sourceKey: 'find_direct_message' },
  {
    sourceIntegration: 'google-chat',
    sourceKey: 'get_attachment',
    status: 'omitted',
    reason:
      'This source tool needs a Google Chat app service account (chat.bot), which is outside the aggregate OAuth scope set.'
  },
  { sourceIntegration: 'google-chat', sourceKey: 'download_attachment' },
  { sourceIntegration: 'google-chat', sourceKey: 'upload_attachment' },
  { sourceIntegration: 'google-chat', sourceKey: 'list_space_events' },
  { sourceIntegration: 'google-chat', sourceKey: 'get_space_read_state' },
  { sourceIntegration: 'google-chat', sourceKey: 'get_thread_read_state' },
  { sourceIntegration: 'google-chat', sourceKey: 'update_space_read_state' },
  { sourceIntegration: 'google-chat', sourceKey: 'get_space_notification_setting' },
  { sourceIntegration: 'google-chat', sourceKey: 'update_space_notification_setting' },
  { sourceIntegration: 'google-chat', sourceKey: 'list_sections' },
  { sourceIntegration: 'google-chat', sourceKey: 'list_section_items' },
  { sourceIntegration: 'google-chat', sourceKey: 'manage_section' },
  { sourceIntegration: 'google-chat', sourceKey: 'move_section_item' },
  { sourceIntegration: 'google-chat', sourceKey: 'list_custom_emojis' },
  { sourceIntegration: 'google-chat', sourceKey: 'get_custom_emoji' },
  { sourceIntegration: 'google-chat', sourceKey: 'manage_custom_emoji' },
  { sourceIntegration: 'google-chat', sourceKey: 'search_spaces_admin' },

  omitGoogleContactsTool('create_contact', contactsWriteReason),
  omitGoogleContactsTool('get_contact', contactsReadDuplicateReason('get_google_contact')),
  omitGoogleContactsTool('update_contact', contactsWriteReason),
  omitGoogleContactsTool('delete_contact', contactsWriteReason),
  omitGoogleContactsTool('list_contacts', contactsReadDuplicateReason('list_google_contacts')),
  omitGoogleContactsTool(
    'search_contacts',
    contactsReadDuplicateReason('search_google_contacts')
  ),
  omitGoogleContactsTool('create_contact_group', contactsWriteReason),
  omitGoogleContactsTool('update_contact_group', contactsWriteReason),
  omitGoogleContactsTool('delete_contact_group', contactsWriteReason),
  omitGoogleContactsTool('list_contact_groups', contactGroupsReadReason),
  omitGoogleContactsTool('get_contact_group', contactGroupsReadReason),
  omitGoogleContactsTool('modify_group_members', contactsWriteReason),
  { sourceIntegration: 'google-contacts', sourceKey: 'list_other_contacts' },
  { sourceIntegration: 'google-contacts', sourceKey: 'search_other_contacts' },
  omitGoogleContactsTool(
    'copy_other_contact',
    'Copying an other contact into My Contacts needs the contacts scope, which is outside the aggregate OAuth scope set.'
  ),
  omitGoogleContactsTool(
    'search_directory',
    'Directory search needs directory.readonly, which is outside the aggregate OAuth scope set.'
  ),
  omitGoogleContactsTool(
    'get_my_profile',
    'Left out to keep the aggregate focused; the account email is available through the Gmail get_profile tool.'
  ),
  omitGoogleContactsTool('manage_contact_photo', contactsWriteReason),
  omitGoogleContactsTool('batch_modify_contacts', contactsWriteReason)
];

export let superGoogle1ExpectedToolKeys = superGoogle1ToolManifest.flatMap(entry =>
  entry.status === 'omitted' ? [] : [entry.exposedKey ?? entry.sourceKey]
);
