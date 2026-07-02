import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let tagChanges = SlateTrigger.create(spec, {
  name: 'Tag Changes',
  key: 'tag_changes',
  description:
    'Triggers when a tag is added or removed from the Prismic repository. Tag addition fires only the first time a document is published with a new tag. Configure the webhook URL in your Prismic repository Settings > Webhooks.'
})
  .input(
    z.object({
      eventType: z.enum(['added', 'deleted']).describe('Whether the tag was added or deleted'),
      tagId: z.string().describe('The tag identifier'),
      domain: z.string().describe('Repository domain'),
      secret: z.string().nullable().describe('Webhook secret if configured')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('The tag identifier'),
      domain: z.string().describe('Repository domain')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let domain: string = body.domain || '';
      let secret: string | null = body.secret || null;
      let inputs: any[] = [];

      let tags = body.tags || {};
      let addedTags: any[] = tags.addition || [];
      let deletedTags: any[] = tags.deletion || [];

      for (let tag of addedTags) {
        inputs.push({
          eventType: 'added' as const,
          tagId: typeof tag === 'string' ? tag : tag.id || '',
          domain,
          secret
        });
      }

      for (let tag of deletedTags) {
        inputs.push({
          eventType: 'deleted' as const,
          tagId: typeof tag === 'string' ? tag : tag.id || '',
          domain,
          secret
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `tag.${ctx.input.eventType}`,
        id: `tag_${ctx.input.eventType}_${ctx.input.tagId}`,
        output: {
          tagId: ctx.input.tagId,
          domain: ctx.input.domain
        }
      };
    }
  })
  .build();
