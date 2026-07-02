import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let manageSettings = SlateTool.create(spec, {
  name: 'Manage Agent Settings',
  key: 'manage_settings',
  description: `Get or update an AI agent's settings, including persona instructions, chatbot appearance, default prompts, example questions, and feature flags. Also supports listing and restoring persona versions.`,
  instructions: [
    'Use action "get" to retrieve current settings.',
    'Use action "update" to modify settings — pass the desired settings as key-value pairs.',
    'Use action "list_personas" to see all persona versions.',
    'Use action "restore_persona" to restore a previous persona version by its version number.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'update', 'list_personas', 'restore_persona'])
        .describe('Action to perform'),
      projectId: z.number().describe('ID of the agent'),
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Settings to update (for update action). Common keys: persona_instructions, default_prompt, example_questions, chatbot_msg_lang, response_source, enable_citations, enable_feedbacks'
        ),
      personaVersion: z
        .number()
        .optional()
        .describe('Persona version number (for restore_persona)')
    })
  )
  .output(
    z.object({
      currentSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Current agent settings'),
      personaVersions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of persona versions'),
      restoredVersion: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Restored persona version details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let { action, projectId } = ctx.input;

    if (action === 'get') {
      let settings = await client.getSettings(projectId);
      return {
        output: { currentSettings: settings },
        message: `Retrieved settings for agent **${projectId}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.settings) {
        throw new Error('settings are required for update action');
      }
      let settings = await client.updateSettings(projectId, ctx.input.settings);
      return {
        output: { currentSettings: settings },
        message: `Updated settings for agent **${projectId}**.`
      };
    }

    if (action === 'list_personas') {
      let versions = await client.listPersonaVersions(projectId);
      return {
        output: { personaVersions: versions },
        message: `Found **${versions.length}** persona version(s) for agent **${projectId}**.`
      };
    }

    // restore_persona
    if (ctx.input.personaVersion === undefined) {
      throw new Error('personaVersion is required for restore_persona action');
    }
    let restored = await client.restorePersonaVersion(projectId, ctx.input.personaVersion);
    return {
      output: { restoredVersion: restored },
      message: `Restored persona version **${ctx.input.personaVersion}** for agent **${projectId}**.`
    };
  })
  .build();
