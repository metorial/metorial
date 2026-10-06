import { z } from 'zod';
import { remoteTool } from '../lib/tool';
import { id, idSchema } from '../lib/validation';
export let downloadPayslip = remoteTool(
  {
    name: 'Download Payslip',
    key: 'download_payslip',
    description:
      'Prepare the authenticated PDF download for an accessible payslip ID from list_payslips. File access is checked when the PDF is downloaded.',
    tags: { readOnly: true }
  },
  z.object({ payslipId: idSchema }),
  z.object({ payslipId: z.string(), fileName: z.string(), mimeType: z.string() }),
  async (client, input) => {
    let payslipId = id(input.payslipId, 'Payslip ID');
    return {
      output: { payslipId, fileName: `payslip-${payslipId}.pdf`, mimeType: 'application/pdf' },
      download: {
        url: `${client.url}/v1/payslips/${payslipId}/pdf`,
        mimeType: 'application/pdf'
      },
      message:
        'Prepared the payslip PDF for download; provider file access is checked during download.'
    };
  }
);
