import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

let libraryChangeSchema = z.object({
  componentKey: z.string().optional(),
  name: z.string().optional()
});

export let libraryPublish = SlateTrigger.create(spec, {
  name: 'Library Published',
  key: 'library_published',
  description:
    'Triggers when a Figma library is published. Includes details about created, modified, and deleted components, styles, and variables.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Figma event type (LIBRARY_PUBLISH)'),
      webhookId: z.string().optional().describe('ID of the webhook'),
      passcode: z.string().optional().describe('Passcode for verification'),
      timestamp: z.string().optional().describe('Event timestamp'),
      fileKey: z.string().optional().describe('Key of the library file'),
      fileName: z.string().optional().describe('Name of the library file'),
      description: z.string().optional().describe('Publish description'),
      createdComponents: z.array(libraryChangeSchema).optional(),
      modifiedComponents: z.array(libraryChangeSchema).optional(),
      deletedComponents: z.array(libraryChangeSchema).optional(),
      createdStyles: z.array(libraryChangeSchema).optional(),
      modifiedStyles: z.array(libraryChangeSchema).optional(),
      deletedStyles: z.array(libraryChangeSchema).optional(),
      createdVariables: z.array(libraryChangeSchema).optional(),
      modifiedVariables: z.array(libraryChangeSchema).optional(),
      deletedVariables: z.array(libraryChangeSchema).optional(),
      triggeredBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who published the library')
    })
  )
  .output(
    z.object({
      fileKey: z.string().describe('Key of the library file'),
      fileName: z.string().optional().describe('Name of the library file'),
      description: z.string().optional().describe('Publish description'),
      timestamp: z.string().optional().describe('When the library was published'),
      createdComponents: z
        .array(libraryChangeSchema)
        .optional()
        .describe('Newly created components'),
      modifiedComponents: z
        .array(libraryChangeSchema)
        .optional()
        .describe('Modified components'),
      deletedComponents: z
        .array(libraryChangeSchema)
        .optional()
        .describe('Deleted components'),
      createdStyles: z.array(libraryChangeSchema).optional().describe('Newly created styles'),
      modifiedStyles: z.array(libraryChangeSchema).optional().describe('Modified styles'),
      deletedStyles: z.array(libraryChangeSchema).optional().describe('Deleted styles'),
      createdVariables: z
        .array(libraryChangeSchema)
        .optional()
        .describe('Newly created variables'),
      modifiedVariables: z
        .array(libraryChangeSchema)
        .optional()
        .describe('Modified variables'),
      deletedVariables: z.array(libraryChangeSchema).optional().describe('Deleted variables'),
      publishedBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who published the library')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let passcode = generatePasscode();

      let webhook = await client.createWebhook({
        eventType: 'LIBRARY_PUBLISH',
        teamId: '',
        endpoint: ctx.input.webhookBaseUrl,
        passcode,
        description: 'Slates library publish events'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          passcode
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;

      if (webhookId) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event_type === 'PING') {
        return { inputs: [] };
      }

      let mapChanges = (items: any[]) =>
        (items || []).map((item: any) => ({
          componentKey: item.key,
          name: item.name
        }));

      let triggeredBy: any;
      if (data.triggered_by) {
        triggeredBy = {
          userId: data.triggered_by.id,
          handle: data.triggered_by.handle,
          imageUrl: data.triggered_by.img_url
        };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            webhookId: data.webhook_id,
            passcode: data.passcode,
            timestamp: data.timestamp,
            fileKey: data.file_key,
            fileName: data.file_name,
            description: data.description,
            createdComponents: mapChanges(data.created_components),
            modifiedComponents: mapChanges(data.modified_components),
            deletedComponents: mapChanges(data.deleted_components),
            createdStyles: mapChanges(data.created_styles),
            modifiedStyles: mapChanges(data.modified_styles),
            deletedStyles: mapChanges(data.deleted_styles),
            createdVariables: mapChanges(data.created_variables),
            modifiedVariables: mapChanges(data.modified_variables),
            deletedVariables: mapChanges(data.deleted_variables),
            triggeredBy
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'library.published',
        id: `LIBRARY_PUBLISH-${ctx.input.fileKey || 'unknown'}-${ctx.input.timestamp || Date.now()}`,
        output: {
          fileKey: ctx.input.fileKey || '',
          fileName: ctx.input.fileName,
          description: ctx.input.description,
          timestamp: ctx.input.timestamp,
          createdComponents: ctx.input.createdComponents,
          modifiedComponents: ctx.input.modifiedComponents,
          deletedComponents: ctx.input.deletedComponents,
          createdStyles: ctx.input.createdStyles,
          modifiedStyles: ctx.input.modifiedStyles,
          deletedStyles: ctx.input.deletedStyles,
          createdVariables: ctx.input.createdVariables,
          modifiedVariables: ctx.input.modifiedVariables,
          deletedVariables: ctx.input.deletedVariables,
          publishedBy: ctx.input.triggeredBy
        }
      };
    }
  })
  .build();

let generatePasscode = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
