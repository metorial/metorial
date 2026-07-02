import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let watchNewTemplate = SlateTrigger.create(spec, {
  name: 'Watch New Template',
  key: 'watch_new_template',
  description: 'Triggers when a new template is created in your account.'
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the new template'),
      created: z.number().describe('Creation timestamp'),
      name: z.string().describe('Template name'),
      filename: z.string().describe('Uploaded filename'),
      format: z.string().describe('Template format'),
      region: z.string().describe('Processing region'),
      validTags: z.array(z.string()).describe('Detected valid merge tags'),
      templateUri: z.string().describe('Template file URL'),
      enhancedSyntax: z.boolean().describe('Whether enhanced syntax is enabled')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template ID'),
      created: z.number().describe('Creation timestamp (Unix epoch)'),
      name: z.string().describe('Template name'),
      filename: z.string().describe('Original uploaded filename'),
      format: z.string().describe('Template file format'),
      region: z.string().describe('Processing region'),
      validTags: z.array(z.string()).describe('Detected valid merge tags'),
      templateUri: z.string().describe('URL to download the template file'),
      enhancedSyntax: z.boolean().describe('Whether enhanced syntax is enabled')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DocuGenerateClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let lastSeenTimestamp = (ctx.state?.lastSeenTimestamp as number) ?? 0;
      let knownTemplateIds = (ctx.state?.knownTemplateIds as string[]) ?? [];

      let templates = await client.listTemplates();
      let newTemplates: Array<{
        templateId: string;
        created: number;
        name: string;
        filename: string;
        format: string;
        region: string;
        validTags: string[];
        templateUri: string;
        enhancedSyntax: boolean;
      }> = [];

      let latestTimestamp = lastSeenTimestamp;
      let updatedKnownIds = [...knownTemplateIds];

      for (let t of templates) {
        if (t.created > lastSeenTimestamp && !knownTemplateIds.includes(t.id)) {
          newTemplates.push({
            templateId: t.id,
            created: t.created,
            name: t.name,
            filename: t.filename,
            format: t.format,
            region: t.region,
            validTags: t.tags.valid,
            templateUri: t.template_uri,
            enhancedSyntax: t.enhanced_syntax
          });
          updatedKnownIds.push(t.id);
          if (t.created > latestTimestamp) {
            latestTimestamp = t.created;
          }
        }
      }

      // Keep known IDs list from growing unbounded
      if (updatedKnownIds.length > 1000) {
        updatedKnownIds = updatedKnownIds.slice(-500);
      }

      return {
        inputs: newTemplates,
        updatedState: {
          lastSeenTimestamp: latestTimestamp,
          knownTemplateIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'template.created',
        id: ctx.input.templateId,
        output: {
          templateId: ctx.input.templateId,
          created: ctx.input.created,
          name: ctx.input.name,
          filename: ctx.input.filename,
          format: ctx.input.format,
          region: ctx.input.region,
          validTags: ctx.input.validTags,
          templateUri: ctx.input.templateUri,
          enhancedSyntax: ctx.input.enhancedSyntax
        }
      };
    }
  })
  .build();
