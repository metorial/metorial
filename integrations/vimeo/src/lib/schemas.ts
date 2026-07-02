import { z } from 'zod';

export let videoSchema = z.object({
  videoId: z.string().describe('Vimeo video ID'),
  uri: z.string().describe('URI of the video resource'),
  name: z.string().describe('Title of the video'),
  description: z.string().nullable().describe('Description of the video'),
  link: z.string().describe('URL of the video on Vimeo'),
  duration: z.number().describe('Duration of the video in seconds'),
  width: z.number().nullable().optional().describe('Width of the video in pixels'),
  height: z.number().nullable().optional().describe('Height of the video in pixels'),
  createdTime: z.string().describe('When the video was created'),
  modifiedTime: z.string().describe('When the video was last modified'),
  status: z.string().describe('Video status (e.g. available, uploading, transcoding)'),
  privacy: z
    .object({
      view: z.string().optional().describe('Who can view the video'),
      embed: z.string().optional().describe('Where the video can be embedded'),
      download: z.boolean().optional().describe('Whether the video can be downloaded'),
      comments: z.string().optional().describe('Who can comment on the video')
    })
    .optional()
    .describe('Privacy settings of the video'),
  tags: z.array(z.string()).optional().describe('Tags associated with the video'),
  embedHtml: z.string().nullable().optional().describe('HTML embed code for the video'),
  pictures: z.string().nullable().optional().describe('URL of the video thumbnail'),
  stats: z
    .object({
      plays: z.number().nullable().optional().describe('Number of plays')
    })
    .optional()
    .describe('Video playback statistics')
});

export let userSchema = z.object({
  userId: z.string().describe('Vimeo user ID'),
  uri: z.string().describe('URI of the user resource'),
  name: z.string().describe('Display name of the user'),
  bio: z.string().nullable().optional().describe('User biography'),
  link: z.string().describe('URL of the user profile on Vimeo'),
  location: z.string().nullable().optional().describe('User location'),
  email: z.string().nullable().optional().describe('User email address'),
  pictureUrl: z.string().nullable().optional().describe('URL of the user profile picture'),
  accountType: z.string().optional().describe('Account type (basic, plus, pro, etc.)'),
  createdTime: z.string().optional().describe('When the account was created')
});

export let showcaseSchema = z.object({
  showcaseId: z.string().describe('Vimeo showcase ID'),
  uri: z.string().describe('URI of the showcase resource'),
  name: z.string().describe('Name of the showcase'),
  description: z.string().nullable().optional().describe('Description of the showcase'),
  link: z.string().describe('URL of the showcase on Vimeo'),
  privacy: z.string().optional().describe('Privacy setting of the showcase'),
  createdTime: z.string().optional().describe('When the showcase was created'),
  modifiedTime: z.string().optional().describe('When the showcase was last modified'),
  videoCount: z.number().optional().describe('Number of videos in the showcase')
});

export let folderSchema = z.object({
  folderId: z.string().describe('Vimeo folder ID'),
  uri: z.string().describe('URI of the folder resource'),
  name: z.string().describe('Name of the folder'),
  createdTime: z.string().optional().describe('When the folder was created'),
  modifiedTime: z.string().optional().describe('When the folder was last modified'),
  videoCount: z.number().optional().describe('Number of videos in the folder')
});

export let channelSchema = z.object({
  channelId: z.string().describe('Vimeo channel ID'),
  uri: z.string().describe('URI of the channel resource'),
  name: z.string().describe('Name of the channel'),
  description: z.string().nullable().optional().describe('Description of the channel'),
  link: z.string().describe('URL of the channel on Vimeo'),
  privacy: z.string().optional().describe('Privacy setting of the channel'),
  createdTime: z.string().optional().describe('When the channel was created'),
  modifiedTime: z.string().optional().describe('When the channel was last modified'),
  videoCount: z.number().optional().describe('Number of videos in the channel')
});

export let paginationInputSchema = z.object({
  page: z.number().optional().describe('Page number (starts at 1)'),
  perPage: z.number().optional().describe('Number of results per page (max 100)')
});

export let paginationOutputSchema = z.object({
  total: z.number().describe('Total number of results'),
  page: z.number().describe('Current page number'),
  perPage: z.number().describe('Number of results per page')
});

// ─── Mapping helpers ──────────────────────────────────────

export let mapVideo = (v: any) => ({
  videoId: v.uri?.replace('/videos/', '') ?? '',
  uri: v.uri ?? '',
  name: v.name ?? '',
  description: v.description ?? null,
  link: v.link ?? '',
  duration: v.duration ?? 0,
  width: v.width ?? null,
  height: v.height ?? null,
  createdTime: v.created_time ?? '',
  modifiedTime: v.modified_time ?? '',
  status: v.status ?? v.transcode?.status ?? 'unknown',
  privacy: v.privacy
    ? {
        view: v.privacy.view,
        embed: v.privacy.embed,
        download: v.privacy.download,
        comments: v.privacy.comments
      }
    : undefined,
  tags: v.tags?.map((t: any) => t.canonical ?? t.name ?? t.tag) ?? [],
  embedHtml: v.embed?.html ?? null,
  pictures: v.pictures?.sizes?.[v.pictures.sizes.length - 1]?.link ?? null,
  stats: v.stats ? { plays: v.stats.plays ?? null } : undefined
});

export let mapUser = (u: any) => ({
  userId: u.uri?.replace('/users/', '') ?? '',
  uri: u.uri ?? '',
  name: u.name ?? '',
  bio: u.bio ?? null,
  link: u.link ?? '',
  location: u.location ?? null,
  email: u.email ?? null,
  pictureUrl: u.pictures?.sizes?.[u.pictures.sizes.length - 1]?.link ?? null,
  accountType: u.account ?? undefined,
  createdTime: u.created_time ?? undefined
});

export let mapShowcase = (s: any) => ({
  showcaseId: s.uri?.replace(/.*\/albums\//, '') ?? '',
  uri: s.uri ?? '',
  name: s.name ?? '',
  description: s.description ?? null,
  link: s.link ?? '',
  privacy: s.privacy?.view ?? undefined,
  createdTime: s.created_time ?? undefined,
  modifiedTime: s.modified_time ?? undefined,
  videoCount: s.metadata?.connections?.videos?.total ?? undefined
});

export let mapFolder = (f: any) => ({
  folderId: f.uri?.replace(/.*\/folders\//, '') ?? '',
  uri: f.uri ?? '',
  name: f.name ?? '',
  createdTime: f.created_time ?? undefined,
  modifiedTime: f.modified_time ?? undefined,
  videoCount: f.metadata?.connections?.videos?.total ?? undefined
});

export let mapChannel = (c: any) => ({
  channelId: c.uri?.replace('/channels/', '') ?? '',
  uri: c.uri ?? '',
  name: c.name ?? '',
  description: c.description ?? null,
  link: c.link ?? '',
  privacy: c.privacy?.view ?? undefined,
  createdTime: c.created_time ?? undefined,
  modifiedTime: c.modified_time ?? undefined,
  videoCount: c.metadata?.connections?.videos?.total ?? undefined
});
