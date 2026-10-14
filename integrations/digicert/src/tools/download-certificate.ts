import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let downloadCertificate = SlateTool.create(spec, {
  name: 'Download Certificate',
  key: 'download_certificate',
  description: `Download an issued certificate from DigiCert CertCentral in PEM or a certificate bundle format.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      certificateId: z.string().describe('ID of the certificate to download'),
      format: z
        .enum(['pem_all', 'pem_noroot', 'pem', 'cer', 'p7b', 'der', 'pem_nointermediate'])
        .optional()
        .describe(
          'Certificate download format. "pem_all" includes full chain (default), "pem_noroot" excludes root, "pem" is end-entity only.'
        )
    })
  )
  .output(
    z.object({
      certificateId: z.string().describe('Certificate ID'),
      format: z.string().describe('Format the certificate was downloaded in'),
      content: z.string().describe('Certificate content (PEM or base64 encoded)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let format = ctx.input.format || 'pem_all';

    ctx.progress('Downloading certificate...');
    let content = await client.downloadCertificate(ctx.input.certificateId, format);

    let isPem = format.startsWith('pem');
    let bytes = Buffer.from(content);
    let contentStr = bytes.toString(isPem ? 'utf8' : 'base64');
    await ctx.addAttachment({
      type: 'url',
      url: client.getCertificateDownloadUrl(ctx.input.certificateId, format),
      headers: { 'X-DC-DEVKEY': ctx.auth.token },
      mimeType: isPem
        ? 'application/x-pem-file'
        : format === 'der'
          ? 'application/octet-stream'
          : 'application/x-pkcs7-certificates'
    });

    return {
      output: {
        certificateId: ctx.input.certificateId,
        format,
        content: contentStr
      },
      message: `Certificate **${ctx.input.certificateId}** downloaded in **${format}** format.`
    };
  })
  .build();
