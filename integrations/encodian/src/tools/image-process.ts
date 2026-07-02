import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let imageProcess = SlateTool.create(spec, {
  name: 'Process Image',
  key: 'process_image',
  description: `Perform image processing operations including format conversion, compression, resizing, cropping, rotation, flipping, watermarking, clean-up, grayscale conversion, and EXIF tag removal.
Supports JPG, PNG, BMP, TIFF, GIF, and HEIC formats.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'convert_format',
          'compress',
          'resize',
          'crop',
          'rotate',
          'flip',
          'add_text_watermark',
          'add_image_watermark',
          'clean_up_document',
          'clean_up_photo',
          'remove_exif_tags'
        ])
        .describe('Image operation to perform'),
      fileName: z.string().optional().describe('Source image filename with extension'),
      fileContent: z.string().describe('Base64-encoded image file content'),
      // Format conversion
      currentFormat: z
        .enum(['BMP', 'GIF', 'JPG', 'PNG', 'TIF', 'HEIC'])
        .optional()
        .describe('Current image format'),
      targetFormat: z
        .enum(['BMP', 'GIF', 'JPG', 'PNG', 'TIF'])
        .optional()
        .describe('Target image format'),
      // Compression
      imageType: z.enum(['JPG', 'PNG']).optional().describe('Image type for compression'),
      // Resize
      resizeType: z.enum(['Percentage', 'Specific']).optional().describe('Resize method'),
      resizePercentage: z
        .number()
        .optional()
        .describe('Resize percentage (for percentage resize)'),
      width: z.number().optional().describe('Target width in pixels'),
      height: z.number().optional().describe('Target height in pixels'),
      maintainAspectRatio: z
        .boolean()
        .optional()
        .describe('Maintain aspect ratio when resizing'),
      // Crop
      cropType: z.enum(['Border', 'Rectangle']).optional().describe('Crop method'),
      leftBorder: z.number().optional().describe('Left border crop in pixels'),
      rightBorder: z.number().optional().describe('Right border crop in pixels'),
      topBorder: z.number().optional().describe('Top border crop in pixels'),
      bottomBorder: z.number().optional().describe('Bottom border crop in pixels'),
      upperLeftX: z.number().optional().describe('Upper left X coordinate for rectangle crop'),
      upperLeftY: z.number().optional().describe('Upper left Y coordinate for rectangle crop'),
      // Rotation
      rotationAngle: z.number().optional().describe('Rotation angle in degrees'),
      // Flip
      flipOrientation: z
        .enum(['Horizontal', 'Vertical', 'HorizontalAndVertical'])
        .optional()
        .describe('Flip orientation'),
      // Watermark
      watermarkText: z.string().optional().describe('Watermark text'),
      watermarkPosition: z
        .string()
        .optional()
        .describe(
          'Watermark position (e.g., Diagonal, TopLeft, BottomRight, CentreHorizontal)'
        ),
      watermarkImageContent: z.string().optional().describe('Base64-encoded watermark image'),
      watermarkImageFilename: z.string().optional().describe('Watermark image filename'),
      opacity: z.number().optional().describe('Watermark opacity (0.0 to 1.0)'),
      font: z.string().optional().describe('Font name for text watermark'),
      textColor: z.string().optional().describe('HTML color for text watermark'),
      textSize: z.number().optional().describe('Text size for text watermark'),
      // Clean-up
      autoRotate: z.boolean().optional().describe('Auto-rotate during clean-up'),
      deskew: z.boolean().optional().describe('Correct skew during clean-up'),
      despeckle: z.boolean().optional().describe('Remove speckles during clean-up')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded output image'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;
    let operationLabel = ctx.input.operation.replace(/_/g, ' ');

    switch (ctx.input.operation) {
      case 'convert_format':
        result = await client.convertImageFormat({
          fileName: ctx.input.fileName || 'image',
          fileContent: ctx.input.fileContent,
          currentImageFormat: ctx.input.currentFormat,
          newImageFormat: ctx.input.targetFormat
        });
        break;

      case 'compress':
        result = await client.compressImage({
          fileName: ctx.input.fileName || 'image',
          fileContent: ctx.input.fileContent,
          imageType: ctx.input.imageType || 'JPG'
        });
        break;

      case 'resize':
        result = await client.resizeImage({
          FileName: ctx.input.fileName || 'image.jpg',
          FileContent: ctx.input.fileContent,
          ImageResizeType: ctx.input.resizeType || 'Percentage',
          ResizePercentage: ctx.input.resizePercentage,
          ImageWidth: ctx.input.width,
          ImageHeight: ctx.input.height,
          MaintainAspectRatio: ctx.input.maintainAspectRatio ?? true,
          FinalOperation: true
        });
        break;

      case 'crop':
        result = await client.cropImage(
          {
            cropType: ctx.input.cropType || 'Border',
            fileContent: ctx.input.fileContent,
            leftBorder: ctx.input.leftBorder,
            rightBorder: ctx.input.rightBorder,
            topBorder: ctx.input.topBorder,
            bottomBorder: ctx.input.bottomBorder,
            upperLeftX: ctx.input.upperLeftX,
            upperLeftY: ctx.input.upperLeftY,
            width: ctx.input.width,
            height: ctx.input.height
          },
          ctx.input.cropType || 'Border'
        );
        break;

      case 'rotate':
        result = await client.rotateImage({
          fileContent: ctx.input.fileContent,
          rotationAngle: ctx.input.rotationAngle || 90
        });
        break;

      case 'flip':
        result = await client.flipImage({
          fileContent: ctx.input.fileContent,
          flipOrientation: ctx.input.flipOrientation || 'Horizontal'
        });
        break;

      case 'add_text_watermark':
        result = await client.addTextWatermarkToImage({
          FileName: ctx.input.fileName || 'image.jpg',
          FileContent: ctx.input.fileContent,
          Text: ctx.input.watermarkText,
          WatermarkPosition: ctx.input.watermarkPosition || 'Diagonal',
          Font: ctx.input.font || 'Arial',
          TextColour: ctx.input.textColor || '#E81123',
          TextSize: ctx.input.textSize || 10,
          FinalOperation: true
        });
        break;

      case 'add_image_watermark':
        result = await client.addImageWatermarkToImage({
          filename: ctx.input.fileName || 'image.jpg',
          fileContent: ctx.input.fileContent,
          watermarkFilename: ctx.input.watermarkImageFilename || 'watermark.png',
          watermarkFileContent: ctx.input.watermarkImageContent,
          watermarkPosition: ctx.input.watermarkPosition || 'Diagonal',
          opacity: ctx.input.opacity || 0.7,
          alignImage: true,
          alignWatermark: true
        });
        break;

      case 'clean_up_document':
        result = await client.cleanUpDocumentImage({
          FileName: ctx.input.fileName || 'image.jpg',
          FileContent: ctx.input.fileContent,
          AutoRotate: ctx.input.autoRotate ?? true,
          Deskew: ctx.input.deskew ?? true,
          Despeckle: ctx.input.despeckle ?? true,
          FinalOperation: true,
          AutoRotateConfidenceLevel: 0
        });
        break;

      case 'clean_up_photo':
        result = await client.cleanUpPhotoImage({
          FileName: ctx.input.fileName || 'image.jpg',
          FileContent: ctx.input.fileContent,
          AutoRotate: ctx.input.autoRotate ?? true,
          Deskew: ctx.input.deskew ?? true,
          Despeckle: ctx.input.despeckle ?? true,
          FinalOperation: true,
          AutoRotateConfidenceLevel: 0
        });
        break;

      case 'remove_exif_tags':
        result = await client.removeExifTags({
          fileName: ctx.input.fileName || 'image',
          fileContent: ctx.input.fileContent,
          imageType: ctx.input.imageType || 'JPG'
        });
        break;
    }

    return {
      output: {
        fileName: result.Filename || result.filename || '',
        fileContent: result.FileContent || result.fileContent || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully performed **${operationLabel}** on image.`
    };
  })
  .build();
