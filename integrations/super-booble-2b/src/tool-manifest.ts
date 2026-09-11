import type { SuperGoogleToolManifestEntry } from '@slates/super-google-tools';

export type SuperGoogle2BSourceIntegration =
  | 'google-photos'
  | 'youtube'
  | 'youtube-analytics'
  | 'google-admin';

let include = (
  sourceIntegration: SuperGoogle2BSourceIntegration,
  sourceKeys: readonly string[]
): SuperGoogleToolManifestEntry[] =>
  sourceKeys.map(sourceKey => ({ sourceIntegration, sourceKey }));

export let superGoogle2BToolManifest = [
  ...include('google-photos', [
    'list_albums',
    'get_album',
    'create_album',
    'update_album',
    'manage_album_media',
    'add_album_enrichment',
    'get_media_item',
    'download_media_item',
    'search_media_items',
    'update_media_item',
    'upload_media',
    'create_picker_session',
    'get_picker_session',
    'list_picked_media',
    'delete_picker_session'
  ]),
  ...include('youtube', [
    'search_content',
    'list_videos',
    'get_video',
    'get_video_rating',
    'upload_video',
    'update_video',
    'delete_video',
    'rate_video',
    'get_channel',
    'update_channel',
    'manage_playlist',
    'list_playlists',
    'list_metadata',
    'manage_playlist_items',
    'manage_comments',
    'list_comments',
    'manage_subscriptions',
    'list_captions',
    'download_caption',
    'set_thumbnail',
    'list_activities'
  ]),
  ...include('youtube-analytics', [
    'query_analytics',
    'manage_groups',
    'manage_group_items',
    'manage_reporting_jobs',
    'list_bulk_reports',
    'list_report_types',
    'download_bulk_report'
  ]),
  ...include('google-admin', [
    'list_users',
    'get_user',
    'create_user',
    'update_user',
    'delete_user',
    'manage_user_aliases',
    'list_groups',
    'manage_group',
    'manage_group_members',
    'manage_org_units',
    'manage_roles',
    'manage_chromeos_devices',
    'manage_mobile_devices',
    'manage_domains',
    'get_activity_reports',
    'get_usage_reports',
    'manage_calendar_resources',
    'manage_licenses',
    'transfer_data',
    'get_customer_info'
  ])
  // google-admin does not register manage_alerts: the Alert Center API is service-account-only
  // and Google rejects its apps.alerts scope for user OAuth clients.
] satisfies SuperGoogleToolManifestEntry[];

export let superGoogle2BIncludedToolManifest = superGoogle2BToolManifest.flatMap(entry =>
  entry.status === 'omitted'
    ? []
    : [
        {
          sourceIntegration: entry.sourceIntegration as SuperGoogle2BSourceIntegration,
          sourceKey: entry.sourceKey,
          exposedKey: entry.exposedKey ?? entry.sourceKey
        }
      ]
);

export let superGoogle2BOmittedToolManifest = superGoogle2BToolManifest.flatMap(entry =>
  entry.status === 'omitted' ? [entry] : []
);
