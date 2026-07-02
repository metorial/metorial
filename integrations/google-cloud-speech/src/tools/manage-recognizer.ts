import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { googleCloudSpeechActionScopes } from '../scopes';
import { spec } from '../spec';

let RECOGNIZER_DISPLAY_NAME_MAX_LENGTH = 63;

export let createRecognizer = SlateTool.create(spec, {
  name: 'Create Recognizer',
  key: 'create_recognizer',
  description: `Create a named recognizer configuration for Speech-to-Text v2. A recognizer stores default settings like model, language, and recognition features so they don't need to be repeated in every transcription request.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.createRecognizer)
  .input(
    z.object({
      recognizerId: z
        .string()
        .describe('Unique ID for the recognizer (lowercase letters, numbers, hyphens).'),
      displayName: z
        .string()
        .max(RECOGNIZER_DISPLAY_NAME_MAX_LENGTH)
        .optional()
        .describe(
          `Human-readable display name. Maximum ${RECOGNIZER_DISPLAY_NAME_MAX_LENGTH} characters.`
        ),
      model: z
        .string()
        .describe(
          'Recognition model (e.g. "latest_long", "latest_short", "telephony", "chirp", "chirp_2").'
        ),
      languageCodes: z.array(z.string()).describe('BCP-47 language codes (e.g. ["en-US"]).'),
      enableAutomaticPunctuation: z
        .boolean()
        .optional()
        .describe('Enable automatic punctuation by default.'),
      enableWordTimeOffsets: z
        .boolean()
        .optional()
        .describe('Enable word time offsets by default.'),
      enableWordConfidence: z
        .boolean()
        .optional()
        .describe('Enable word confidence scores by default.')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Name of the creation operation.'),
      done: z.boolean().describe('Whether the recognizer was created immediately.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let response = await client.createRecognizer({
      recognizerId: ctx.input.recognizerId,
      displayName: ctx.input.displayName,
      model: ctx.input.model,
      languageCodes: ctx.input.languageCodes,
      enableAutomaticPunctuation: ctx.input.enableAutomaticPunctuation,
      enableWordTimeOffsets: ctx.input.enableWordTimeOffsets,
      enableWordConfidence: ctx.input.enableWordConfidence
    });

    return {
      output: {
        operationName: response.name || '',
        done: response.done || false
      },
      message: `Recognizer **${ctx.input.recognizerId}** creation initiated.`
    };
  })
  .build();

export let listRecognizers = SlateTool.create(spec, {
  name: 'List Recognizers',
  key: 'list_recognizers',
  description: `List all recognizer configurations in the configured project and region. Returns recognizer names, models, languages, and status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.listRecognizers)
  .input(
    z.object({
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of recognizers to return (default 100).'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results.')
    })
  )
  .output(
    z.object({
      recognizers: z
        .array(
          z.object({
            name: z.string().optional().describe('Full resource name.'),
            recognizerId: z.string().optional().describe('Short recognizer ID.'),
            displayName: z.string().optional().describe('Display name.'),
            model: z.string().optional().describe('Recognition model.'),
            languageCodes: z.array(z.string()).optional().describe('Configured languages.'),
            state: z.string().optional().describe('Recognizer state (ACTIVE, DELETED, etc).'),
            createTime: z.string().optional().describe('Creation timestamp.'),
            updateTime: z.string().optional().describe('Last update timestamp.')
          })
        )
        .describe('List of recognizers.'),
      nextPageToken: z.string().optional().describe('Token for the next page, if available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let response = await client.listRecognizers({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let recognizers = (response.recognizers || []).map(r => {
      let parts = r.name?.split('/') || [];
      let recognizerId = parts[parts.length - 1];
      return {
        name: r.name,
        recognizerId,
        displayName: r.displayName,
        model: r.model,
        languageCodes: r.languageCodes,
        state: r.state,
        createTime: r.createTime,
        updateTime: r.updateTime
      };
    });

    return {
      output: {
        recognizers,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${recognizers.length}** recognizer(s).`
    };
  })
  .build();

export let updateRecognizer = SlateTool.create(spec, {
  name: 'Update Recognizer',
  key: 'update_recognizer',
  description: `Update an existing recognizer configuration. Modify the display name, model, or language codes of a previously created recognizer.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.updateRecognizer)
  .input(
    z.object({
      recognizerId: z.string().describe('ID of the recognizer to update.'),
      displayName: z
        .string()
        .max(RECOGNIZER_DISPLAY_NAME_MAX_LENGTH)
        .optional()
        .describe(
          `New display name. Maximum ${RECOGNIZER_DISPLAY_NAME_MAX_LENGTH} characters.`
        ),
      model: z.string().optional().describe('New recognition model.'),
      languageCodes: z.array(z.string()).optional().describe('New language codes.')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Name of the update operation.'),
      done: z.boolean().describe('Whether the update completed immediately.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let response = await client.updateRecognizer({
      recognizerId: ctx.input.recognizerId,
      displayName: ctx.input.displayName,
      model: ctx.input.model,
      languageCodes: ctx.input.languageCodes
    });

    return {
      output: {
        operationName: response.name || '',
        done: response.done || false
      },
      message: `Recognizer **${ctx.input.recognizerId}** update initiated.`
    };
  })
  .build();

export let deleteRecognizer = SlateTool.create(spec, {
  name: 'Delete Recognizer',
  key: 'delete_recognizer',
  description: `Delete a recognizer configuration. The recognizer enters a deleted state and is eventually purged.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .scopes(googleCloudSpeechActionScopes.deleteRecognizer)
  .input(
    z.object({
      recognizerId: z.string().describe('ID of the recognizer to delete.')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Name of the delete operation.'),
      done: z.boolean().describe('Whether the deletion completed immediately.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let response = await client.deleteRecognizer(ctx.input.recognizerId);

    return {
      output: {
        operationName: response.name || '',
        done: response.done || false
      },
      message: `Recognizer **${ctx.input.recognizerId}** deletion initiated.`
    };
  })
  .build();

export let getRecognizer = SlateTool.create(spec, {
  name: 'Get Recognizer',
  key: 'get_recognizer',
  description: `Get details of a specific recognizer configuration, including its model, languages, default recognition config, and status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.getRecognizer)
  .input(
    z.object({
      recognizerId: z.string().describe('ID of the recognizer to retrieve.')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Full resource name.'),
      uid: z.string().optional().describe('System-generated unique identifier.'),
      displayName: z.string().optional().describe('Display name.'),
      model: z.string().optional().describe('Recognition model.'),
      languageCodes: z.array(z.string()).optional().describe('Configured languages.'),
      state: z.string().optional().describe('Recognizer state.'),
      createTime: z.string().optional().describe('Creation timestamp.'),
      updateTime: z.string().optional().describe('Last update timestamp.'),
      defaultRecognitionConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Default recognition configuration.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let recognizer = await client.getRecognizer(ctx.input.recognizerId);

    return {
      output: {
        name: recognizer.name,
        uid: recognizer.uid,
        displayName: recognizer.displayName,
        model: recognizer.model,
        languageCodes: recognizer.languageCodes,
        state: recognizer.state,
        createTime: recognizer.createTime,
        updateTime: recognizer.updateTime,
        defaultRecognitionConfig: recognizer.defaultRecognitionConfig
      },
      message: `Recognizer **${ctx.input.recognizerId}**: model=${recognizer.model}, state=${recognizer.state}`
    };
  })
  .build();
