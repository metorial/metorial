import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    useXlCluster: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Use the XL cluster (v2-xl.api2pdf.com) for larger compute resources. Costs more but handles heavier workloads.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
