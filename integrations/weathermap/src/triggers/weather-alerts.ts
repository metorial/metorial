import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let weatherAlerts = SlateTrigger.create(spec, {
  name: 'Weather Alerts',
  key: 'weather_alerts',
  description:
    'Receive push notifications for severe weather alerts from national weather agencies worldwide. Alerts include information about hazardous conditions such as storms, extreme temperatures, floods, and air quality warnings.'
})
  .input(
    z.object({
      alertId: z.string().describe('Unique identifier for the alert'),
      messageType: z.string().describe('Notification type (e.g. "warning")'),
      urgency: z.string().describe('Alert urgency level'),
      severity: z.string().describe('Alert severity level'),
      certainty: z.string().describe('Alert certainty level'),
      startTimestamp: z.number().describe('Alert start time as Unix UTC timestamp'),
      endTimestamp: z.number().describe('Alert end time as Unix UTC timestamp'),
      senderName: z.string().describe('Name of the issuing agency'),
      headline: z.string().optional().describe('Brief alert headline'),
      eventName: z.string().optional().describe('Alert event name'),
      description: z.string().optional().describe('Detailed alert description'),
      instruction: z.string().optional().describe('Recommended actions'),
      language: z.string().optional().describe('Language code of the alert'),
      geometry: z.any().optional().describe('GeoJSON geometry of the affected area')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('Unique identifier for the alert'),
      messageType: z.string().describe('Notification type'),
      urgency: z
        .string()
        .describe('Alert urgency: Immediate, Expected, Future, Past, Unknown'),
      severity: z
        .string()
        .describe('Alert severity: Extreme, Severe, Moderate, Minor, Unknown'),
      certainty: z
        .string()
        .describe('Alert certainty: Observed, Likely, Possible, Unlikely, Unknown'),
      start: z.string().describe('Alert start time (ISO 8601)'),
      end: z.string().describe('Alert end time (ISO 8601)'),
      senderName: z.string().describe('Name of the issuing agency'),
      headline: z.string().optional().describe('Brief alert headline'),
      eventName: z.string().optional().describe('Alert event name'),
      description: z.string().optional().describe('Detailed alert description'),
      instruction: z.string().optional().describe('Recommended actions'),
      language: z.string().optional().describe('Language code of the alert'),
      geometry: z.any().optional().describe('GeoJSON geometry of the affected area')
    })
  )
  .webhook({
    // No auto-registration: OpenWeather push alerts require contacting OpenWeather directly to set up the webhook endpoint.

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let alert = body.alert || body;

      let descObj = alert.description || {};

      let input = {
        alertId: alert.id || `alert-${Date.now()}`,
        messageType: alert.msg_type || body.msg_type || 'warning',
        urgency: alert.urgency || body.urgency || 'Unknown',
        severity: alert.severity || body.severity || 'Unknown',
        certainty: alert.certainty || body.certainty || 'Unknown',
        startTimestamp: alert.start || body.start || 0,
        endTimestamp: alert.end || body.end || 0,
        senderName: alert.sender || body.sender || '',
        headline: descObj.headline || alert.headline,
        eventName: descObj.event || alert.event,
        description: descObj.description || alert.description_text,
        instruction: descObj.instruction || alert.instruction,
        language: descObj.language || alert.language,
        geometry: alert.geometry
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `weather_alert.${ctx.input.severity.toLowerCase()}`,
        id: ctx.input.alertId,
        output: {
          alertId: ctx.input.alertId,
          messageType: ctx.input.messageType,
          urgency: ctx.input.urgency,
          severity: ctx.input.severity,
          certainty: ctx.input.certainty,
          start: ctx.input.startTimestamp
            ? new Date(ctx.input.startTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          end: ctx.input.endTimestamp
            ? new Date(ctx.input.endTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          senderName: ctx.input.senderName,
          headline: ctx.input.headline,
          eventName: ctx.input.eventName,
          description: ctx.input.description,
          instruction: ctx.input.instruction,
          language: ctx.input.language,
          geometry: ctx.input.geometry
        }
      };
    }
  })
  .build();
