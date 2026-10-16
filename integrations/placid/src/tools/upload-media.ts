import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Submit source file URLs to Placid's media endpoint and return any hosted URLs it accepts. URL submission is a legacy operation; current documentation specifies binary uploads, so URL acceptance is unverified. Hosted URLs can be used in picture layers when generating images, PDFs, or videos.`,
  constraints: [
    'Maximum of 5 files per upload request.',
    'Files are hosted temporarily on Placid storage.',
    'The media endpoint currently documents binary uploads; this legacy URL submission may be rejected.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      files: z
        .array(
          z.object({
            name: z
              .string()
              .describe('A unique key/name for this file (e.g., "logo", "photo1")'),
            url: z.string().describe('Source file URL to submit directly to Placid')
          })
        )
        .min(1)
        .max(5)
        .describe('Files to upload (1-5)')
    })
  )
  .output(
    z.object({
      uploadedFiles: z
        .array(
          z.object({
            name: z.string().describe('The key/name provided for the file'),
            hostedUrl: z.string().describe('Placid-hosted URL for the uploaded file')
          })
        )
        .describe('Uploaded files with their hosted URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let result = await client.uploadMedia(
      ctx.input.files.map(f => ({ key: f.name, url: f.url }))
    );

    let uploadedFiles = result.media.map(m => ({
      name: m.file_key,
      hostedUrl: m.file_id
    }));

    return {
      output: { uploadedFiles },
      message: `Uploaded **${uploadedFiles.length}** file(s) to Placid storage.`
    };
  })
  .build();
