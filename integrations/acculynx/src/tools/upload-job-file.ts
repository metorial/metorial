import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadJobFileTool = SlateTool.create(spec, {
  name: 'Upload Job File',
  key: 'upload_job_file',
  description: `Upload a document, photo, or video to a job in AccuLynx. Documents can be placed in specific folders. Photos and videos can be tagged. Provide the file content as a base64-encoded string.`,
  instructions: [
    'Use fileType "document" for documents (PDF, DOC, etc.) and "photo_video" for images and videos.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the job'),
      fileType: z.enum(['document', 'photo_video']).describe('Type of file to upload'),
      fileName: z.string().describe('Name of the file including extension'),
      fileContent: z.string().describe('Base64-encoded file content'),
      folderId: z.string().optional().describe('Document folder ID (for documents only)'),
      tagId: z.string().optional().describe('Photo/video tag ID (for photos/videos only)'),
      description: z.string().optional().describe('Description of the file')
    })
  )
  .output(
    z.object({
      uploadResult: z.record(z.string(), z.any()).describe('Upload result from AccuLynx')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let uploadResult: any;

    if (ctx.input.fileType === 'document') {
      uploadResult = await client.uploadDocument(ctx.input.jobId, {
        fileName: ctx.input.fileName,
        fileContent: ctx.input.fileContent,
        folderId: ctx.input.folderId,
        description: ctx.input.description
      });
    } else {
      uploadResult = await client.uploadPhotoVideo(ctx.input.jobId, {
        fileName: ctx.input.fileName,
        fileContent: ctx.input.fileContent,
        tagId: ctx.input.tagId,
        description: ctx.input.description
      });
    }

    return {
      output: { uploadResult },
      message: `Uploaded **${ctx.input.fileName}** to job **${ctx.input.jobId}**.`
    };
  })
  .build();
