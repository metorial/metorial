import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPrintJob, printJobSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getPrintJob = SlateTool.create(spec, {
  name: 'Get Print Job',
  key: 'get_print_job',
  description: `Retrieve the full details of a print job including its letters, statuses, tracking numbers, costs, and metadata. Use this to check the current state of a print job or monitor delivery progress.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      printJobId: z.string().describe('The ID of the print job to retrieve')
    })
  )
  .output(printJobSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPrintJob(ctx.input.printJobId);
    let mapped = mapPrintJob(result);

    let letterCount = mapped.letters?.length ?? 0;
    let statusSummary = '';
    if (mapped.letters && mapped.letters.length > 0) {
      let statuses = mapped.letters.map((l: any) => l.status);
      let uniqueStatuses = [...new Set(statuses)];
      statusSummary = ` Letter statuses: ${uniqueStatuses.join(', ')}.`;
    }

    return {
      output: mapped,
      message: `Print job **${mapped.printJobId}** (${mapped.type ?? 'letter'}): ${mapped.confirmed ? 'confirmed' : 'draft'}, **${letterCount}** letter(s).${statusSummary}${mapped.testmode ? ' *(test mode)*' : ''}`
    };
  })
  .build();
