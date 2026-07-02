import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _bookmarkSchema = z.object({
  href: z.string().describe('URL of the bookmark'),
  description: z.string().describe('Title of the bookmark'),
  extended: z.string().describe('Extended notes'),
  hash: z.string().describe('MD5 hash of the URL'),
  tag: z.string().describe('Space-separated tags'),
  time: z.string().describe('ISO 8601 timestamp of when the bookmark was created'),
  shared: z.string().describe('Whether the bookmark is public ("yes" or "no")'),
  toread: z.string().describe('Whether the bookmark is marked as unread ("yes" or "no")')
});

export let bookmarkUpdated = SlateTrigger.create(spec, {
  name: 'Bookmark Changed',
  key: 'bookmark_changed',
  description:
    'Triggers when bookmarks are added, updated, or deleted. Polls the change detection endpoint and fetches recent bookmarks when changes are detected.'
})
  .input(
    z.object({
      changeDetectedAt: z.string().describe('Timestamp when the change was detected'),
      bookmark: z
        .object({
          href: z.string(),
          description: z.string(),
          extended: z.string(),
          hash: z.string(),
          tag: z.string(),
          time: z.string(),
          shared: z.string(),
          toread: z.string()
        })
        .describe('The bookmark that was recently changed')
    })
  )
  .output(
    z.object({
      bookmarkUrl: z.string().describe('URL of the changed bookmark'),
      bookmarkTitle: z.string().describe('Title of the changed bookmark'),
      bookmarkNotes: z.string().describe('Extended notes of the bookmark'),
      bookmarkHash: z.string().describe('MD5 hash of the bookmark URL'),
      bookmarkTags: z.string().describe('Space-separated tags on the bookmark'),
      bookmarkTime: z.string().describe('ISO 8601 timestamp of the bookmark'),
      isPrivate: z.boolean().describe('Whether the bookmark is private'),
      isUnread: z.boolean().describe('Whether the bookmark is marked as unread'),
      changeDetectedAt: z.string().describe('Timestamp when the change was detected')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let { updateTime } = await client.getLastUpdate();
      let lastKnownUpdate = ctx.state?.lastUpdateTime as string | undefined;

      if (lastKnownUpdate && updateTime === lastKnownUpdate) {
        return {
          inputs: [],
          updatedState: { lastUpdateTime: updateTime }
        };
      }

      let result = await client.getRecentBookmarks({ count: 100 });

      let inputs = result.posts
        .filter(post => {
          if (!lastKnownUpdate) return false;
          return post.time > lastKnownUpdate;
        })
        .map(post => ({
          changeDetectedAt: updateTime,
          bookmark: post
        }));

      // On first poll, just record the state without emitting events
      if (!lastKnownUpdate) {
        return {
          inputs: [],
          updatedState: { lastUpdateTime: updateTime }
        };
      }

      return {
        inputs,
        updatedState: { lastUpdateTime: updateTime }
      };
    },

    handleEvent: async ctx => {
      let bookmark = ctx.input.bookmark;

      return {
        type: 'bookmark.changed',
        id: `${bookmark.hash}-${bookmark.time}`,
        output: {
          bookmarkUrl: bookmark.href,
          bookmarkTitle: bookmark.description,
          bookmarkNotes: bookmark.extended,
          bookmarkHash: bookmark.hash,
          bookmarkTags: bookmark.tag,
          bookmarkTime: bookmark.time,
          isPrivate: bookmark.shared === 'no',
          isUnread: bookmark.toread === 'yes',
          changeDetectedAt: ctx.input.changeDetectedAt
        }
      };
    }
  })
  .build();
