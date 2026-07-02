import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _releaseSchema = z.object({
  releaseId: z.string().describe('Release ID'),
  ref: z.string().describe('Release ref'),
  label: z.string().describe('Release label/name'),
  scheduledAt: z.string().optional().describe('Scheduled publication date if set'),
  documentIds: z.array(z.string()).describe('IDs of documents in the release')
});

export let releaseChanges = SlateTrigger.create(spec, {
  name: 'Release Changes',
  key: 'release_changes',
  description:
    'Triggers when a release is created, updated, or deleted in the Prismic repository. Configure the webhook URL in your Prismic repository Settings > Webhooks.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of release event'),
      release: z
        .object({
          releaseId: z.string(),
          ref: z.string(),
          label: z.string(),
          scheduledAt: z.string().optional(),
          documentIds: z.array(z.string())
        })
        .describe('Release data from the webhook'),
      domain: z.string().describe('Repository domain'),
      secret: z.string().nullable().describe('Webhook secret if configured')
    })
  )
  .output(
    z.object({
      releaseId: z.string().describe('Release ID'),
      ref: z.string().describe('Release ref'),
      label: z.string().describe('Release label/name'),
      scheduledAt: z.string().optional().describe('Scheduled publication date'),
      documentIds: z.array(z.string()).describe('IDs of documents in the release'),
      domain: z.string().describe('Repository domain')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let domain: string = body.domain || '';
      let secret: string | null = body.secret || null;
      let inputs: any[] = [];

      let releaseCategories = [
        { key: 'addition', eventType: 'created' as const },
        { key: 'update', eventType: 'updated' as const },
        { key: 'deletion', eventType: 'deleted' as const }
      ];

      let releases = body.releases || {};
      for (let category of releaseCategories) {
        let releaseList = releases[category.key] || [];
        for (let release of releaseList) {
          inputs.push({
            eventType: category.eventType,
            release: {
              releaseId: release.id || '',
              ref: release.ref || '',
              label: release.label || '',
              scheduledAt: release.scheduledAt,
              documentIds: release.documents || []
            },
            domain,
            secret
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `release.${ctx.input.eventType}`,
        id: `release_${ctx.input.eventType}_${ctx.input.release.releaseId}`,
        output: {
          releaseId: ctx.input.release.releaseId,
          ref: ctx.input.release.ref,
          label: ctx.input.release.label,
          scheduledAt: ctx.input.release.scheduledAt,
          documentIds: ctx.input.release.documentIds,
          domain: ctx.input.domain
        }
      };
    }
  })
  .build();
