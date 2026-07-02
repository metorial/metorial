import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema, likelihoodSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let analyzeImage = SlateTool.create(spec, {
  name: 'Analyze Image',
  key: 'analyze_image',
  description: `Performs multiple Vision API detection features on a single image in one request. Select any combination of features (labels, objects, faces, landmarks, logos, text, safe search, image properties, crop hints, web detection) to analyze an image comprehensively. More efficient than making separate calls for each feature.`,
  instructions: [
    'Select at least one feature to analyze. Multiple features can be combined in a single request.',
    'Each feature can optionally have a maxResults limit.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.analyzeImage)
  .input(
    z.object({
      image: imageSourceSchema,
      features: z
        .array(
          z.object({
            type: z
              .enum([
                'LABEL_DETECTION',
                'OBJECT_LOCALIZATION',
                'FACE_DETECTION',
                'LANDMARK_DETECTION',
                'LOGO_DETECTION',
                'TEXT_DETECTION',
                'DOCUMENT_TEXT_DETECTION',
                'SAFE_SEARCH_DETECTION',
                'IMAGE_PROPERTIES',
                'CROP_HINTS',
                'WEB_DETECTION'
              ])
              .describe('Detection feature type'),
            maxResults: z.number().optional().describe('Maximum results for this feature')
          })
        )
        .min(1)
        .describe('List of detection features to apply'),
      languageHints: z
        .array(z.string())
        .optional()
        .describe('Language hints for text detection'),
      cropAspectRatios: z
        .array(z.number())
        .optional()
        .describe('Aspect ratios for crop hints'),
      includeGeoResults: z
        .boolean()
        .optional()
        .describe('Include geo-based results for web detection')
    })
  )
  .output(
    z.object({
      labels: z
        .array(
          z.object({
            labelId: z.string(),
            name: z.string(),
            confidence: z.number(),
            topicality: z.number()
          })
        )
        .optional()
        .describe('Detected labels'),
      objects: z
        .array(
          z.object({
            objectId: z.string(),
            name: z.string(),
            confidence: z.number(),
            boundingPoly: boundingPolySchema
          })
        )
        .optional()
        .describe('Detected objects with locations'),
      faces: z
        .array(
          z.object({
            detectionConfidence: z.number(),
            joyLikelihood: likelihoodSchema,
            sorrowLikelihood: likelihoodSchema,
            angerLikelihood: likelihoodSchema,
            surpriseLikelihood: likelihoodSchema
          })
        )
        .optional()
        .describe('Detected faces with emotions'),
      landmarks: z
        .array(
          z.object({
            landmarkId: z.string(),
            name: z.string(),
            confidence: z.number(),
            locations: z.array(
              z.object({
                latitude: z.number(),
                longitude: z.number()
              })
            )
          })
        )
        .optional()
        .describe('Detected landmarks'),
      logos: z
        .array(
          z.object({
            logoId: z.string(),
            name: z.string(),
            confidence: z.number()
          })
        )
        .optional()
        .describe('Detected logos'),
      fullText: z.string().optional().describe('Extracted text from image'),
      safeSearch: z
        .object({
          adult: likelihoodSchema,
          spoof: likelihoodSchema,
          medical: likelihoodSchema,
          violence: likelihoodSchema,
          racy: likelihoodSchema
        })
        .optional()
        .describe('Safe search ratings'),
      dominantColors: z
        .array(
          z.object({
            red: z.number(),
            green: z.number(),
            blue: z.number(),
            score: z.number(),
            pixelFraction: z.number()
          })
        )
        .optional()
        .describe('Dominant colors'),
      cropHints: z
        .array(
          z.object({
            boundingPoly: boundingPolySchema,
            confidence: z.number(),
            importanceFraction: z.number()
          })
        )
        .optional()
        .describe('Suggested crop regions'),
      webEntities: z
        .array(
          z.object({
            entityId: z.string(),
            name: z.string(),
            relevanceScore: z.number()
          })
        )
        .optional()
        .describe('Related web entities'),
      bestGuessLabels: z
        .array(
          z.object({
            label: z.string()
          })
        )
        .optional()
        .describe('Best guess labels from web detection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let imageContext: Record<string, unknown> = {};
    if (ctx.input.languageHints) {
      imageContext.languageHints = ctx.input.languageHints;
    }
    if (ctx.input.cropAspectRatios) {
      imageContext.cropHintsParams = { aspectRatios: ctx.input.cropAspectRatios };
    }
    if (ctx.input.includeGeoResults) {
      imageContext.webDetectionParams = { includeGeoResults: ctx.input.includeGeoResults };
    }

    let result = await client.annotateImage(
      ctx.input.image,
      ctx.input.features,
      Object.keys(imageContext).length > 0 ? imageContext : undefined
    );

    let output: Record<string, unknown> = {};
    let summaryParts: string[] = [];

    if (result.labelAnnotations) {
      output.labels = result.labelAnnotations.map(l => ({
        labelId: l.mid,
        name: l.description,
        confidence: l.score,
        topicality: l.topicality
      }));
      summaryParts.push(`${result.labelAnnotations.length} labels`);
    }

    if (result.localizedObjectAnnotations) {
      output.objects = result.localizedObjectAnnotations.map(o => ({
        objectId: o.mid,
        name: o.name,
        confidence: o.score,
        boundingPoly: o.boundingPoly
      }));
      summaryParts.push(`${result.localizedObjectAnnotations.length} objects`);
    }

    if (result.faceAnnotations) {
      output.faces = result.faceAnnotations.map(f => ({
        detectionConfidence: f.detectionConfidence,
        joyLikelihood: f.joyLikelihood,
        sorrowLikelihood: f.sorrowLikelihood,
        angerLikelihood: f.angerLikelihood,
        surpriseLikelihood: f.surpriseLikelihood
      }));
      summaryParts.push(`${result.faceAnnotations.length} faces`);
    }

    if (result.landmarkAnnotations) {
      output.landmarks = result.landmarkAnnotations.map(lm => ({
        landmarkId: lm.mid,
        name: lm.description,
        confidence: lm.score,
        locations: (lm.locations ?? []).map(loc => ({
          latitude: loc.latLng.latitude,
          longitude: loc.latLng.longitude
        }))
      }));
      summaryParts.push(`${result.landmarkAnnotations.length} landmarks`);
    }

    if (result.logoAnnotations) {
      output.logos = result.logoAnnotations.map(l => ({
        logoId: l.mid,
        name: l.description,
        confidence: l.score
      }));
      summaryParts.push(`${result.logoAnnotations.length} logos`);
    }

    if (result.textAnnotations && result.textAnnotations.length > 0) {
      output.fullText = result.textAnnotations[0]!.description;
      summaryParts.push('text extracted');
    } else if (result.fullTextAnnotation) {
      output.fullText = result.fullTextAnnotation.text;
      summaryParts.push('text extracted');
    }

    if (result.safeSearchAnnotation) {
      output.safeSearch = result.safeSearchAnnotation;
      summaryParts.push('safe search analyzed');
    }

    if (result.imagePropertiesAnnotation) {
      output.dominantColors = result.imagePropertiesAnnotation.dominantColors.colors.map(
        c => ({
          red: c.color.red,
          green: c.color.green,
          blue: c.color.blue,
          score: c.score,
          pixelFraction: c.pixelFraction
        })
      );
      summaryParts.push(
        `${result.imagePropertiesAnnotation.dominantColors.colors.length} colors`
      );
    }

    if (result.cropHintsAnnotation) {
      output.cropHints = result.cropHintsAnnotation.cropHints.map(h => ({
        boundingPoly: h.boundingPoly,
        confidence: h.confidence,
        importanceFraction: h.importanceFraction
      }));
      summaryParts.push(`${result.cropHintsAnnotation.cropHints.length} crop hints`);
    }

    if (result.webDetection) {
      output.webEntities = (result.webDetection.webEntities ?? []).map(e => ({
        entityId: e.entityId,
        name: e.description,
        relevanceScore: e.score
      }));
      output.bestGuessLabels = (result.webDetection.bestGuessLabels ?? []).map(l => ({
        label: l.label
      }));
      summaryParts.push(`${(result.webDetection.webEntities ?? []).length} web entities`);
    }

    return {
      output,
      message: `Image analysis complete — detected: ${summaryParts.join(', ')}.`
    };
  })
  .build();
