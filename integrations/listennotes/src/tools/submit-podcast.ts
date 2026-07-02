import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitPodcast = SlateTool.create(spec, {
  name: 'Submit Podcast',
  key: 'submit_podcast',
  description: `Submit a podcast RSS feed URL to the Listen Notes database. If the RSS URL already exists, returns the podcast metadata immediately. Otherwise, the podcast is reviewed and added within 12 hours.
Optionally provide an email to receive a notification when the podcast is added.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      rssUrl: z.string().describe('RSS feed URL of the podcast to submit.'),
      notificationEmail: z
        .string()
        .optional()
        .describe('Email address to receive notification when the podcast is added.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe(
          'Submission status: "found" (already exists), "in review" (pending review), or "rejected".'
        ),
      podcast: z
        .any()
        .optional()
        .describe('Podcast metadata if the RSS URL already exists in the database.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.submitPodcast({
      rss: ctx.input.rssUrl,
      email: ctx.input.notificationEmail
    });

    let statusMsg =
      data.status === 'found'
        ? `Podcast already exists in the database.`
        : data.status === 'rejected'
          ? `Podcast submission was rejected.`
          : `Podcast submitted for review. It will be added within 12 hours.`;

    return {
      output: {
        status: data.status,
        podcast: data.podcast
      },
      message: statusMsg
    };
  })
  .build();
