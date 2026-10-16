import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartRecords, bartText } from '../lib/response';
import { spec } from '../spec';

let advisorySchema = z.object({
  station: z.string().describe('Affected station or "BART" for system-wide'),
  advisoryType: z.string().describe('Advisory type: "DELAY" or "EMERGENCY"'),
  description: z.string().describe('Full advisory description'),
  smsText: z.string().describe('Abbreviated SMS text version'),
  posted: z.string().describe('Time the advisory was posted'),
  expires: z.string().describe('Time the advisory expires')
});

let elevatorOutageSchema = z.object({
  outageId: z.string().describe('Outage identifier'),
  station: z.string().describe('Affected station'),
  outageType: z.string().describe('Type of outage'),
  description: z.string().describe('Outage description'),
  smsText: z.string().describe('Abbreviated SMS text version'),
  posted: z.string().describe('When the outage was posted'),
  expires: z.string().describe('When the outage is expected to end')
});

export let getServiceAdvisories = SlateTool.create(spec, {
  name: 'Get Service Advisories',
  key: 'get_service_advisories',
  description: `Retrieve current BART service advisories and elevator outage information. Service advisories include delays, police actions, equipment problems, and other system-affecting conditions. Advisories are issued when two or more trains are off schedule by more than 10 minutes. Optionally includes elevator outage status.`,
  instructions: [
    'When there are no active advisories, the API returns a message indicating no delays.',
    'Set includeElevatorStatus to true to also retrieve current elevator outage information.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeElevatorStatus: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include elevator outage information')
    })
  )
  .output(
    z.object({
      date: z.string().describe('Current date'),
      time: z.string().describe('Current time'),
      advisories: z.array(advisorySchema).describe('Current service advisories'),
      elevatorOutages: z
        .array(elevatorOutageSchema)
        .optional()
        .describe(
          'Elevator status bulletins, which can summarize multiple outages or normal service (when includeElevatorStatus is true)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });
    let result = await client.getAdvisories();
    let advisories = bartRecords(result.bsa)
      .filter(bsa => {
        let description = bartText(bsa.description).trim();
        return (
          description && !/^(?:no advisories issued|no delays reported)\.?$/i.test(description)
        );
      })
      .map(bsa => ({
        station: bartText(bsa.station),
        advisoryType: bartText(bsa.type),
        description: bartText(bsa.description),
        smsText: bartText(bsa.sms_text),
        posted: bartText(bsa.posted),
        expires: bartText(bsa.expires)
      }));
    let elevatorOutages: z.infer<typeof elevatorOutageSchema>[] | undefined;
    if (ctx.input.includeElevatorStatus) {
      let result = await client.getElevatorStatus();
      elevatorOutages = bartRecords(result.bsa).map(elev => ({
        outageId: bartText(elev['@id']),
        station: bartText(elev.station),
        outageType: bartText(elev.type),
        description: bartText(elev.description),
        smsText: bartText(elev.sms_text),
        posted: bartText(elev.posted),
        expires: bartText(elev.expires)
      }));
    }
    let elevatorMessage = elevatorOutages
      ? ` Retrieved **${elevatorOutages.length}** elevator status bulletin(s).`
      : '';
    return {
      output: {
        date: bartText(result.date),
        time: bartText(result.time),
        advisories,
        ...(elevatorOutages ? { elevatorOutages } : {})
      },
      message:
        (advisories.length > 0
          ? `Found **${advisories.length}** active advisory(ies).`
          : 'No active service advisories.') + elevatorMessage
    };
  })
  .build();
