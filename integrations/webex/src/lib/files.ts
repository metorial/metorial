import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { WebexClient } from './client';
import { API_ORIGIN, protect, required } from './http';

export const recordingReference = z.object({
  recordingId: z.string(),
  personId: z.string(),
  orgId: z.string().optional(),
  siteUrl: z.string(),
  meetingId: z.string(),
  timeRecorded: z.string(),
  format: z.string(),
  sizeBytes: z.number().optional(),
  hostEmail: z.string().optional()
});
function https(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Webex returned an invalid download URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port)
    throw createApiServiceError('Webex returned an unsafe download URL.');
  return url;
}
export function messageUrl(value: string, token: string) {
  protect(value, [token]);
  const url = https(value);
  if (url.origin !== API_ORIGIN || !/^\/v1\/contents\/[^/]+$/.test(url.pathname) || url.search)
    throw createApiServiceError(
      'This message file is not a supported authenticated Webex content URL. Use the Webex client; file scanning restrictions are not bypassed.'
    );
  return url.toString();
}
export function recordingUrl(value: string, site: string, token: string) {
  protect(value, [token]);
  const url = https(value);
  if (
    !/^[a-z0-9-]+\.webex\.com$/i.test(site) ||
    url.hostname !== site.toLowerCase() ||
    url.pathname !== '/nbr/MultiThreadDownloadServlet'
  )
    throw createApiServiceError(
      'Webex did not return a direct recording file on its exact authorized site. Use the recording playback/download page.'
    );
  return url.toString();
}
export async function recordingFile(
  client: WebexClient,
  token: string,
  recordingId: string,
  hostEmail?: string
) {
  const person = await client.getMe(),
    recording = await client.getRecording(recordingId, { hostEmail });
  if (recording.status !== 'available')
    throw createApiServiceError('The recording is not available for download.');
  const siteUrl = required(recording.siteUrl, 'recording site URL'),
    links = recording.temporaryDirectDownloadLinks;
  const url = recordingUrl(
    required(
      links?.recordingDownloadLink,
      'direct recording download link; downloading may be disabled'
    ),
    siteUrl,
    token
  );
  const expiresAt = required(links?.expiration, 'recording download expiration');
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())
    throw createApiServiceError(
      'Webex returned an expired or invalid recording download link. Request the recording again.'
    );
  const reference = recordingReference.parse({
    recordingId: recording.id,
    personId: person.id,
    orgId: person.orgId,
    siteUrl,
    meetingId: required(recording.meetingId, 'recording meeting ID'),
    timeRecorded: required(recording.timeRecorded, 'recorded time'),
    format: required(recording.format, 'recording format'),
    sizeBytes: recording.sizeBytes,
    hostEmail
  });
  return { url, expiresAt, reference };
}
