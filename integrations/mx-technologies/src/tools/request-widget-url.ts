import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

export let requestWidgetUrl = SlateTool.create(spec, {
  name: 'Request Widget URL',
  key: 'request_widget_url',
  description: `Generate an embeddable widget URL for a user. The Connect Widget handles the end-user experience for connecting financial accounts, supporting both credential-based and OAuth institution connections. Other widget types are available for different use cases. The URL expires after ten minutes or its first use; request a new URL for each page load.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      widgetType: z
        .string()
        .describe(
          'Type of widget (e.g., "connect_widget", "pulse_widget", "budget_widget", "spending_widget")'
        ),
      colorScheme: z.string().optional().describe('Color scheme (e.g., "light", "dark")'),
      currentInstitutionCode: z
        .string()
        .optional()
        .describe('Pre-select a specific institution in the widget'),
      currentMemberGuid: z
        .string()
        .optional()
        .describe('Pre-load a specific member for reconnection'),
      disableInstitutionSearch: z
        .boolean()
        .optional()
        .describe('Disable institution search in the widget'),
      mode: z
        .string()
        .optional()
        .describe('Widget mode (e.g., "verification", "aggregation")'),
      updateCredentials: z
        .boolean()
        .optional()
        .describe('Open widget in credential update mode'),
      useCases: z
        .array(z.enum(['PFM', 'MONEY_MOVEMENT']))
        .optional()
        .describe(
          'Required for connect_widget or connections_widget when your client has opted in to use cases with MX'
        ),
      waitForFullAggregation: z
        .boolean()
        .optional()
        .describe(
          'Legacy compatibility option; MX always waits for full aggregation and ignores this setting'
        )
    })
  )
  .output(
    z.object({
      type: z.string().optional().nullable().describe('Widget type'),
      url: z.string().optional().nullable().describe('Embeddable widget URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let widget = await client.requestWidgetUrl(ctx.input.userGuid, {
      widgetType: ctx.input.widgetType,
      useCases: ctx.input.useCases,
      colorScheme: ctx.input.colorScheme,
      currentInstitutionCode: ctx.input.currentInstitutionCode,
      currentMemberGuid: ctx.input.currentMemberGuid,
      disableInstitutionSearch: ctx.input.disableInstitutionSearch,
      mode: ctx.input.mode,
      updateCredentials: ctx.input.updateCredentials,
      waitForFullAggregation: ctx.input.waitForFullAggregation
    });

    return {
      output: {
        type: widget.type,
        url: widget.url
      },
      message: `Generated **${widget.type}** widget URL for user ${ctx.input.userGuid}.`
    };
  })
  .build();
