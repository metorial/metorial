import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
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
        .describe('Current elevator outages (when includeElevatorStatus is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });

    let result = await client.getAdvisories();

    let extractCdata = (data: any): string => {
      if (!data) return '';
      if (typeof data === 'string') return data;
      if (typeof data === 'object' && data['#cdata-section'] !== undefined)
        return data['#cdata-section'];
      return '';
    };

    let bsaData = result?.bsa;
    let bsaList = Array.isArray(bsaData) ? bsaData : bsaData ? [bsaData] : [];

    // Filter out "No delays reported" placeholder entries
    let advisories = bsaList
      .filter((bsa: any) => {
        let desc = extractCdata(bsa?.description);
        return desc && !desc.toLowerCase().includes('no delays reported');
      })
      .map((bsa: any) => ({
        station: bsa.station || '',
        advisoryType: bsa.type || '',
        description: extractCdata(bsa.description),
        smsText: extractCdata(bsa.sms_text),
        posted: bsa.posted || '',
        expires: bsa.expires || ''
      }));

    let output: any = {
      date: result?.date || '',
      time: result?.time || '',
      advisories
    };

    if (ctx.input.includeElevatorStatus) {
      let elevResult = await client.getElevatorStatus();
      let elevData = elevResult?.bsa;
      let elevList = Array.isArray(elevData) ? elevData : elevData ? [elevData] : [];

      output.elevatorOutages = elevList.map((elev: any) => ({
        outageId: elev['@id'] || '',
        station: elev.station || '',
        outageType: elev.type || '',
        description: extractCdata(elev.description),
        smsText: extractCdata(elev.sms_text),
        posted: elev.posted || '',
        expires: elev.expires || ''
      }));
    }

    let advisoryCount = advisories.length;
    let elevMsg =
      ctx.input.includeElevatorStatus && output.elevatorOutages
        ? ` and **${output.elevatorOutages.length}** elevator outage(s)`
        : '';

    return {
      output,
      message:
        advisoryCount > 0
          ? `Found **${advisoryCount}** active advisory(ies)${elevMsg}.`
          : `No active service advisories${elevMsg}.`
    };
  })
  .build();
