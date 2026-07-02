import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema, likelihoodSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectFaces = SlateTool.create(spec, {
  name: 'Detect Faces',
  key: 'detect_faces',
  description: `Detects faces in an image and returns detailed attributes including emotional expression likelihoods (joy, sorrow, anger, surprise), facial orientation angles, detection confidence, and whether headwear or blur is present. Includes bounding box coordinates for each detected face.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectFaces)
  .input(
    z.object({
      image: imageSourceSchema,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of faces to return (default: 10)')
    })
  )
  .output(
    z.object({
      faces: z.array(
        z.object({
          boundingPoly: boundingPolySchema.describe('Bounding polygon around the face'),
          rollAngle: z.number().describe('Roll angle of the face in degrees'),
          panAngle: z.number().describe('Pan angle of the face in degrees'),
          tiltAngle: z.number().describe('Tilt angle of the face in degrees'),
          detectionConfidence: z.number().describe('Detection confidence score'),
          landmarkingConfidence: z
            .number()
            .describe('Confidence of facial landmark detection'),
          joyLikelihood: likelihoodSchema.describe('Likelihood of joy expression'),
          sorrowLikelihood: likelihoodSchema.describe('Likelihood of sorrow expression'),
          angerLikelihood: likelihoodSchema.describe('Likelihood of anger expression'),
          surpriseLikelihood: likelihoodSchema.describe('Likelihood of surprise expression'),
          underExposedLikelihood: likelihoodSchema.describe(
            'Likelihood that the face is under-exposed'
          ),
          blurredLikelihood: likelihoodSchema.describe('Likelihood that the face is blurred'),
          headwearLikelihood: likelihoodSchema.describe(
            'Likelihood that the face has headwear'
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.annotateImage(ctx.input.image, [
      { type: 'FACE_DETECTION', maxResults: ctx.input.maxResults ?? 10 }
    ]);

    let faces = (result.faceAnnotations ?? []).map(face => ({
      boundingPoly: face.boundingPoly,
      rollAngle: face.rollAngle,
      panAngle: face.panAngle,
      tiltAngle: face.tiltAngle,
      detectionConfidence: face.detectionConfidence,
      landmarkingConfidence: face.landmarkingConfidence,
      joyLikelihood: face.joyLikelihood,
      sorrowLikelihood: face.sorrowLikelihood,
      angerLikelihood: face.angerLikelihood,
      surpriseLikelihood: face.surpriseLikelihood,
      underExposedLikelihood: face.underExposedLikelihood,
      blurredLikelihood: face.blurredLikelihood,
      headwearLikelihood: face.headwearLikelihood
    }));

    return {
      output: { faces },
      message:
        faces.length > 0
          ? `Detected **${faces.length}** face(s) in the image.`
          : 'No faces detected in the image.'
    };
  })
  .build();
