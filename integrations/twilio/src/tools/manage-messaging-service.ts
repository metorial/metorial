import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

let messagingServiceSchema = z.object({
  serviceSid: z.string().describe('Unique SID of the Messaging Service (starts with MG)'),
  friendlyName: z.string().describe('Friendly name of the Messaging Service'),
  inboundRequestUrl: z.string().nullable().describe('Webhook URL for inbound messages'),
  inboundMethod: z.string().nullable().describe('HTTP method for inboundRequestUrl'),
  fallbackUrl: z.string().nullable().describe('Fallback webhook URL'),
  fallbackMethod: z.string().nullable().describe('HTTP method for fallbackUrl'),
  statusCallbackUrl: z.string().nullable().describe('Status callback URL'),
  stickySender: z.boolean().nullable().describe('Whether Sticky Sender is enabled'),
  mmsConverter: z.boolean().nullable().describe('Whether MMS Converter is enabled'),
  smartEncoding: z.boolean().nullable().describe('Whether Smart Encoding is enabled'),
  areaCodeGeomatch: z.boolean().nullable().describe('Whether Area Code Geomatch is enabled'),
  validityPeriod: z.number().nullable().describe('Message validity period in seconds'),
  scanMessageContent: z.string().nullable().describe('Content scanning setting'),
  usecase: z.string().nullable().describe('Declared Messaging Service use case'),
  useInboundWebhookOnNumber: z
    .boolean()
    .nullable()
    .describe('Whether sender-level inbound webhooks override the service webhook'),
  dateCreated: z.string().nullable().describe('Date the service was created'),
  dateUpdated: z.string().nullable().describe('Date the service was last updated')
});

let methodSchema = z.enum(['GET', 'POST']);

export let manageMessagingService = SlateTool.create(spec, {
  name: 'Manage Messaging Service',
  key: 'manage_messaging_service',
  description: `Create, list, fetch, update, or delete Twilio Messaging Services. Messaging Services group sender pools and shared messaging behavior, and are required for scheduled messages and link-shortened sends.`,
  instructions: [
    'Use "list" to discover existing Messaging Service SIDs for Send Message.',
    'Use "create" for a suite of shared messaging settings; add senders in the Twilio Console or sender pool APIs before sending through the service.',
    'Use "delete" only for disposable services that are not handling production traffic.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Action to perform on Messaging Services.'),
      serviceSid: z
        .string()
        .optional()
        .describe('Messaging Service SID for get, update, or delete actions.'),
      friendlyName: z
        .string()
        .optional()
        .describe('Friendly name for create or update actions. Required for create.'),
      inboundRequestUrl: z.string().optional().describe('Webhook URL for inbound messages.'),
      inboundMethod: methodSchema.optional().describe('HTTP method for inboundRequestUrl.'),
      fallbackUrl: z.string().optional().describe('Fallback webhook URL.'),
      fallbackMethod: methodSchema.optional().describe('HTTP method for fallbackUrl.'),
      statusCallbackUrl: z.string().optional().describe('Message status callback URL.'),
      stickySender: z.boolean().optional().describe('Enable Sticky Sender.'),
      mmsConverter: z.boolean().optional().describe('Enable MMS Converter.'),
      smartEncoding: z.boolean().optional().describe('Enable Smart Encoding.'),
      areaCodeGeomatch: z.boolean().optional().describe('Enable Area Code Geomatch.'),
      validityPeriod: z
        .number()
        .optional()
        .describe('Message validity period in seconds, from 1 to 36000.'),
      scanMessageContent: z
        .enum(['inherit', 'enable', 'disable'])
        .optional()
        .describe('Message content scanning setting.'),
      usecase: z
        .enum([
          'notifications',
          'marketing',
          'verification',
          'discussion',
          'poll',
          'undeclared'
        ])
        .optional()
        .describe('Messaging Service use case.'),
      useInboundWebhookOnNumber: z
        .boolean()
        .optional()
        .describe('Use webhook URLs configured on individual sender phone numbers.'),
      pageSize: z.number().optional().describe('Number of services to return for list.')
    })
  )
  .output(
    z.object({
      services: z
        .array(messagingServiceSchema)
        .optional()
        .describe('Messaging Service resources returned by the action'),
      deleted: z.boolean().optional().describe('Whether the service was deleted'),
      hasMore: z.boolean().optional().describe('Whether more services are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let mapService = (service: any) => ({
      serviceSid: service.sid,
      friendlyName: service.friendly_name,
      inboundRequestUrl: service.inbound_request_url || null,
      inboundMethod: service.inbound_method || null,
      fallbackUrl: service.fallback_url || null,
      fallbackMethod: service.fallback_method || null,
      statusCallbackUrl: service.status_callback || null,
      stickySender: service.sticky_sender ?? null,
      mmsConverter: service.mms_converter ?? null,
      smartEncoding: service.smart_encoding ?? null,
      areaCodeGeomatch: service.area_code_geomatch ?? null,
      validityPeriod: service.validity_period ?? null,
      scanMessageContent: service.scan_message_content || null,
      usecase: service.usecase || null,
      useInboundWebhookOnNumber: service.use_inbound_webhook_on_number ?? null,
      dateCreated: service.date_created || null,
      dateUpdated: service.date_updated || null
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.friendlyName) {
        throw twilioServiceError('friendlyName is required for create action.');
      }

      let result = await client.createMessagingService({
        friendlyName: ctx.input.friendlyName,
        inboundRequestUrl: ctx.input.inboundRequestUrl,
        inboundMethod: ctx.input.inboundMethod,
        fallbackUrl: ctx.input.fallbackUrl,
        fallbackMethod: ctx.input.fallbackMethod,
        statusCallback: ctx.input.statusCallbackUrl,
        stickySender: ctx.input.stickySender,
        mmsConverter: ctx.input.mmsConverter,
        smartEncoding: ctx.input.smartEncoding,
        areaCodeGeomatch: ctx.input.areaCodeGeomatch,
        validityPeriod: ctx.input.validityPeriod,
        scanMessageContent: ctx.input.scanMessageContent,
        usecase: ctx.input.usecase,
        useInboundWebhookOnNumber: ctx.input.useInboundWebhookOnNumber
      });

      return {
        output: { services: [mapService(result)] },
        message: `Created Messaging Service **${result.sid}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.serviceSid) {
        throw twilioServiceError('serviceSid is required for get action.');
      }

      let result = await client.getMessagingService(ctx.input.serviceSid);
      return {
        output: { services: [mapService(result)] },
        message: `Fetched Messaging Service **${result.sid}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listMessagingServices({
        pageSize: ctx.input.pageSize
      });
      let services = (result.services || []).map(mapService);

      return {
        output: { services, hasMore: !!result.meta?.next_page_url },
        message: `Found **${services.length}** Messaging Service(s).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.serviceSid) {
        throw twilioServiceError('serviceSid is required for update action.');
      }

      let result = await client.updateMessagingService(ctx.input.serviceSid, {
        friendlyName: ctx.input.friendlyName,
        inboundRequestUrl: ctx.input.inboundRequestUrl,
        inboundMethod: ctx.input.inboundMethod,
        fallbackUrl: ctx.input.fallbackUrl,
        fallbackMethod: ctx.input.fallbackMethod,
        statusCallback: ctx.input.statusCallbackUrl,
        stickySender: ctx.input.stickySender,
        mmsConverter: ctx.input.mmsConverter,
        smartEncoding: ctx.input.smartEncoding,
        areaCodeGeomatch: ctx.input.areaCodeGeomatch,
        validityPeriod: ctx.input.validityPeriod,
        scanMessageContent: ctx.input.scanMessageContent,
        usecase: ctx.input.usecase,
        useInboundWebhookOnNumber: ctx.input.useInboundWebhookOnNumber
      });

      return {
        output: { services: [mapService(result)] },
        message: `Updated Messaging Service **${result.sid}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.serviceSid) {
        throw twilioServiceError('serviceSid is required for delete action.');
      }

      await client.deleteMessagingService(ctx.input.serviceSid);
      return {
        output: { deleted: true },
        message: `Deleted Messaging Service **${ctx.input.serviceSid}**.`
      };
    }

    throw twilioServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
