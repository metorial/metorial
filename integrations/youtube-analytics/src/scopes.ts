import { allOf, anyOf } from 'slates';

export let youtubeAnalyticsScopes = {
  ytAnalyticsReadonly: 'https://www.googleapis.com/auth/yt-analytics.readonly',
  ytAnalyticsMonetaryReadonly:
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
  youtube: 'https://www.googleapis.com/auth/youtube',
  youtubeReadonly: 'https://www.googleapis.com/auth/youtube.readonly',
  youtubepartner: 'https://www.googleapis.com/auth/youtubepartner'
} as const;

let reportingApiAccess = allOf(
  [youtubeAnalyticsScopes.youtube, youtubeAnalyticsScopes.youtubeReadonly],
  [
    youtubeAnalyticsScopes.ytAnalyticsReadonly,
    youtubeAnalyticsScopes.ytAnalyticsMonetaryReadonly
  ]
);

export let youtubeAnalyticsActionScopes = {
  queryAnalytics: allOf(
    [youtubeAnalyticsScopes.youtube, youtubeAnalyticsScopes.youtubeReadonly],
    [
      youtubeAnalyticsScopes.ytAnalyticsReadonly,
      youtubeAnalyticsScopes.ytAnalyticsMonetaryReadonly
    ]
  ),
  manageGroups: allOf(
    [youtubeAnalyticsScopes.youtube, youtubeAnalyticsScopes.youtubeReadonly],
    [youtubeAnalyticsScopes.ytAnalyticsReadonly]
  ),
  manageGroupItems: allOf(
    [youtubeAnalyticsScopes.youtube, youtubeAnalyticsScopes.youtubeReadonly],
    [youtubeAnalyticsScopes.ytAnalyticsReadonly]
  ),
  manageReportingJobs: allOf(
    [
      youtubeAnalyticsScopes.youtube,
      youtubeAnalyticsScopes.youtubeReadonly,
      youtubeAnalyticsScopes.youtubepartner
    ],
    [
      youtubeAnalyticsScopes.ytAnalyticsReadonly,
      youtubeAnalyticsScopes.ytAnalyticsMonetaryReadonly
    ]
  ),
  listBulkReports: reportingApiAccess,
  listReportTypes: reportingApiAccess,
  downloadBulkReport: reportingApiAccess,
  newBulkReports: reportingApiAccess,
  inboundWebhook: anyOf(
    youtubeAnalyticsScopes.ytAnalyticsReadonly,
    youtubeAnalyticsScopes.youtubeReadonly,
    youtubeAnalyticsScopes.youtube
  )
} as const;
