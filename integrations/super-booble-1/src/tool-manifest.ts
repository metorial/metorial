import type { SuperGoogleToolManifestEntry } from '@slates/super-google-tools';

export let superGoogle1ToolManifest = [
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
      'This source tool is service-account-only and requires chat.bot, which is outside the aggregate user OAuth scope set.'
  },
  { sourceIntegration: 'google-chat', sourceKey: 'download_attachment' },
  { sourceIntegration: 'google-chat', sourceKey: 'upload_attachment' },
  { sourceIntegration: 'google-chat', sourceKey: 'list_space_events' }
] satisfies SuperGoogleToolManifestEntry[];

export let superGoogle1ExpectedToolKeys = superGoogle1ToolManifest.flatMap(entry =>
  entry.status === 'omitted' ? [] : [entry.exposedKey ?? entry.sourceKey]
);
