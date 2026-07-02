import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAudiofileStatus = SlateTool.create(spec, {
  name: 'Get Audiofile Status',
  key: 'get_audiofile_status',
  description: `Retrieve the current status and details of a submitted audiofile. Returns the processing state, speaker names, notes, original media link, title, duration, quality rating, associated orders and invoices, and cost.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      audiofileId: z.number().describe('ID of the audiofile to query')
    })
  )
  .output(
    z.object({
      audiofileId: z.number().describe('Audiofile ID'),
      state: z
        .string()
        .describe('Current processing state (e.g. Delivered, Transcribing, Error)'),
      title: z.string().optional().describe('Title of the audiofile'),
      description: z.string().optional().describe('Description of the audiofile'),
      duration: z.number().optional().describe('Duration in minutes'),
      speakerNames: z.string().optional().describe('Pipe-delimited list of speaker names'),
      notes: z.string().optional().describe('Notes provided for transcribers'),
      originalLink: z.string().optional().describe('URL of the original media file'),
      qualityStars: z.number().optional().describe('Quality rating on a 5-star scale'),
      orderIds: z.array(z.string()).optional().describe('Associated order IDs'),
      invoiceIds: z.array(z.string()).optional().describe('Associated invoice IDs'),
      cost: z.string().optional().describe('Total cost in USD')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getAudiofileDetails(ctx.input.audiofileId);

    let output = {
      audiofileId: result.id,
      state: result.statename ?? 'Unknown',
      title: result.title,
      description: result.description,
      duration: result.duration,
      speakerNames: result.names,
      notes: result.notes,
      originalLink: result.originallink,
      qualityStars: result.quality_stars,
      orderIds: result.orders,
      invoiceIds: result.invoices,
      cost: result.total
    };

    return {
      output,
      message: `Audiofile **${output.audiofileId}** is in state: **${output.state}**${output.duration ? ` (${output.duration} min)` : ''}.`
    };
  })
  .build();
