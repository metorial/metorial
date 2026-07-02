import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let organizationSocialActions = SlateTrigger.create(spec, {
  name: 'Organization Post Activity',
  key: 'organization_post_activity',
  description:
    'Monitors posts on a LinkedIn organization page for new activity. Polls for new posts and tracks changes to comments and reactions on existing posts.'
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post'),
      authorUrn: z.string().describe('URN of the post author'),
      text: z.string().optional().describe('Post text/commentary'),
      visibility: z.string().describe('Post visibility setting'),
      lifecycleState: z.string().describe('Post lifecycle state'),
      publishedAt: z.string().optional().describe('Timestamp when the post was published'),
      eventType: z.enum(['post.created', 'post.updated']).describe('Type of activity detected')
    })
  )
  .output(
    z.object({
      postUrn: z.string().describe('URN of the post'),
      authorUrn: z.string().describe('URN of the post author'),
      text: z.string().optional().describe('Post text/commentary'),
      visibility: z.string().describe('Post visibility'),
      lifecycleState: z.string().describe('Post lifecycle state'),
      publishedAt: z.string().optional().describe('Timestamp when the post was published')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new LinkedInClient({ token: ctx.auth.token });

      let state = (ctx.state ?? {}) as Record<string, unknown>;
      let organizationUrn = state.organizationUrn as string | undefined;

      // If no organization URN stored yet, try to find one from administered orgs
      if (!organizationUrn) {
        let userInfo = await client.getUserInfo();
        let memberUrn = `urn:li:person:${userInfo.sub}`;
        let roles = await client.getAdministeredOrganizations(memberUrn);
        if (roles.length > 0 && roles[0]) {
          organizationUrn = roles[0].organizationTarget;
        }
      }

      if (!organizationUrn) {
        return { inputs: [], updatedState: state };
      }

      let lastPollTime = (state.lastPollTime ?? undefined) as string | undefined;
      let knownPostUrns = ((state.knownPostUrns as string[] | undefined) ?? []) as string[];

      let result = await client.getPostsByAuthor(organizationUrn, { count: 20 });
      let posts = result.elements || [];

      let inputs: Array<{
        postUrn: string;
        authorUrn: string;
        text?: string;
        visibility: string;
        lifecycleState: string;
        publishedAt?: string;
        eventType: 'post.created' | 'post.updated';
      }> = [];

      let currentPostUrns: string[] = [];

      for (let post of posts) {
        let postUrn = post.id || '';
        currentPostUrns.push(postUrn);

        let isNew = !knownPostUrns.includes(postUrn);

        if (isNew && lastPollTime) {
          inputs.push({
            postUrn,
            authorUrn: post.author,
            text: post.commentary,
            visibility: post.visibility,
            lifecycleState: post.lifecycleState,
            publishedAt: post.publishedAt,
            eventType: 'post.created'
          });
        }
      }

      return {
        inputs,
        updatedState: {
          organizationUrn,
          lastPollTime: new Date().toISOString(),
          knownPostUrns: currentPostUrns
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.postUrn}:${ctx.input.eventType}:${Date.now()}`,
        output: {
          postUrn: ctx.input.postUrn,
          authorUrn: ctx.input.authorUrn,
          text: ctx.input.text,
          visibility: ctx.input.visibility,
          lifecycleState: ctx.input.lifecycleState,
          publishedAt: ctx.input.publishedAt
        }
      };
    }
  })
  .build();
