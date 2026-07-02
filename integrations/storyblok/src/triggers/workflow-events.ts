import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let workflowEvents = SlateTrigger.create(spec, {
  name: 'Workflow Events',
  key: 'workflow_events',
  description: 'Triggers when a story moves to a different workflow stage.'
})
  .input(
    z.object({
      storyId: z.number().optional().describe('ID of the story that changed workflow stage'),
      workflowStageId: z.number().optional().describe('New workflow stage ID'),
      spaceId: z.number().optional().describe('Space ID'),
      webhookId: z.string().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      storyId: z.number().optional().describe('ID of the affected story'),
      storyName: z.string().optional().describe('Name of the story'),
      fullSlug: z.string().optional().describe('Full slug path of the story'),
      workflowStageId: z.number().optional().describe('New workflow stage ID'),
      workflowStageName: z.string().optional().describe('Name of the new workflow stage')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let webhook = await client.createWebhook({
        name: 'Slates - Workflow Events',
        endpoint: ctx.input.webhookBaseUrl,
        actions: ['workflow.stage.changed'],
        activated: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let details = ctx.input.registrationDetails as { webhookId?: string };
      if (details.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        action?: string;
        story_id?: number;
        workflow_stage_id?: number;
        space_id?: number;
      };

      if (body.action !== 'workflow.stage.changed') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            storyId: body.story_id,
            workflowStageId: body.workflow_stage_id,
            spaceId: body.space_id,
            webhookId: `workflow-${body.story_id}-stage-changed-${Date.now()}`
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, any> = {
        storyId: ctx.input.storyId,
        workflowStageId: ctx.input.workflowStageId
      };

      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      if (ctx.input.storyId) {
        try {
          let story = await client.getStory(ctx.input.storyId.toString());
          output.storyName = story.name;
          output.fullSlug = story.full_slug;
        } catch {
          // Story might not be accessible
        }
      }

      if (ctx.input.workflowStageId) {
        try {
          let stages = await client.listWorkflowStages();
          let stage = stages.find(s => s.id === ctx.input.workflowStageId);
          if (stage) {
            output.workflowStageName = stage.name;
          }
        } catch {
          // Stages might not be accessible
        }
      }

      return {
        type: 'workflow.stage_changed',
        id: ctx.input.webhookId,
        output: output as any
      };
    }
  })
  .build();
