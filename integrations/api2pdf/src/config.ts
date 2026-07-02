import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    useXlCluster: z
      .boolean()
      .default(false)
      .describe(
        'Use the XL cluster (v2-xl.api2pdf.com) for larger compute resources. Costs more but handles heavier workloads.'
      )
  })
);
