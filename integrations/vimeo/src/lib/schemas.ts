import { z } from 'zod';
import {
  nativeChannel,
  nativeFolder,
  nativeShowcase,
  nativeUser,
  nativeVideo,
  parse,
  uriId
} from './native';

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
  perPage: z.number().describe('Number of results per page'),
  paging: z
    .object({
      next: z.string().nullish(),
      previous: z.string().nullish(),
      first: z.string().nullish(),
      last: z.string().nullish()
    })
    .optional()
    .describe('Native page navigation; absent links do not imply invented end markers')
});

// Native validators prevent malformed receipts from becoming invented IDs, timestamps or totals.
export const mapVideo = (value: unknown) => {
  const v = parse(nativeVideo, value);
  return {
    videoId: uriId(v.uri, 'videos'),
    uri: v.uri,
    name: v.name,
    description: v.description,
    link: v.link,
    duration: v.duration,
    width: v.width,
    height: v.height,
    createdTime: v.created_time,
    modifiedTime: v.modified_time,
    status: v.status,
    privacy: v.privacy
      ? {
          view: v.privacy.view,
          embed: v.privacy.embed,
          download: v.privacy.download,
          comments: v.privacy.comments
        }
      : undefined,
    tags: v.tags
      ?.map(t => t.name ?? t.tag ?? t.canonical)
      .filter((v): v is string => v !== undefined),
    embedHtml: v.embed?.html,
    pictures: v.pictures?.sizes.at(-1)?.link,
    stats: v.stats ? { plays: v.stats.plays } : undefined
  };
};
export const mapUser = (value: unknown) => {
  const u = parse(nativeUser, value);
  return {
    userId: uriId(u.uri, 'users'),
    uri: u.uri,
    name: u.name,
    bio: u.bio,
    link: u.link,
    location: u.location,
    email: u.email,
    pictureUrl: u.pictures?.sizes.at(-1)?.link,
    accountType: u.account,
    createdTime: u.created_time
  };
};
export const mapShowcase = (value: unknown) => {
  const s = parse(nativeShowcase, value);
  return {
    showcaseId: uriId(s.uri, 'albums'),
    uri: s.uri,
    name: s.name,
    description: s.description,
    link: s.link,
    privacy: s.privacy?.view,
    createdTime: s.created_time,
    modifiedTime: s.modified_time,
    videoCount: s.metadata?.connections?.videos?.total
  };
};
export const mapFolder = (value: unknown) => {
  const f = parse(nativeFolder, value);
  return {
    folderId: uriId(f.uri, 'projects'),
    uri: f.uri,
    name: f.name,
    createdTime: f.created_time,
    modifiedTime: f.modified_time,
    videoCount: f.metadata?.connections?.videos?.total
  };
};
export const mapChannel = (value: unknown) => {
  const c = parse(nativeChannel, value);
  return {
    channelId: uriId(c.uri, 'channels'),
    uri: c.uri,
    name: c.name,
    description: c.description,
    link: c.link,
    privacy: c.privacy?.view,
    createdTime: c.created_time,
    modifiedTime: c.modified_time,
    videoCount: c.metadata?.connections?.videos?.total
  };
};
