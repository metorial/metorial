export type AuthMethod = 'api_key' | 'oauth';

export type Likelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY';

export type FeatureType =
  | 'LABEL_DETECTION'
  | 'OBJECT_LOCALIZATION'
  | 'FACE_DETECTION'
  | 'LANDMARK_DETECTION'
  | 'LOGO_DETECTION'
  | 'TEXT_DETECTION'
  | 'DOCUMENT_TEXT_DETECTION'
  | 'SAFE_SEARCH_DETECTION'
  | 'IMAGE_PROPERTIES'
  | 'CROP_HINTS'
  | 'WEB_DETECTION';

export interface ImageSource {
  base64Content?: string;
  gcsUri?: string;
  imageUrl?: string;
}

export interface Feature {
  type: FeatureType;
  maxResults?: number;
}

export interface ImageContext {
  languageHints?: string[];
  cropHintsParams?: {
    aspectRatios?: number[];
  };
  webDetectionParams?: {
    includeGeoResults?: boolean;
  };
}

export interface AnnotateImageRequest {
  image: {
    content?: string;
    source?: {
      gcsImageUri?: string;
      imageUri?: string;
    };
  };
  features: Feature[];
  imageContext?: ImageContext;
}

export interface AnnotateImageResponse {
  labelAnnotations?: LabelAnnotation[];
  localizedObjectAnnotations?: LocalizedObjectAnnotation[];
  faceAnnotations?: FaceAnnotation[];
  landmarkAnnotations?: LandmarkAnnotation[];
  logoAnnotations?: LogoAnnotation[];
  textAnnotations?: TextAnnotation[];
  fullTextAnnotation?: FullTextAnnotation;
  safeSearchAnnotation?: SafeSearchAnnotation;
  imagePropertiesAnnotation?: ImagePropertiesAnnotation;
  cropHintsAnnotation?: CropHintsAnnotation;
  webDetection?: WebDetection;
  error?: { code: number; message: string };
}

export interface LabelAnnotation {
  mid: string;
  description: string;
  score: number;
  topicality: number;
}

export interface BoundingPoly {
  vertices: Array<{ x?: number; y?: number }>;
  normalizedVertices?: Array<{ x?: number; y?: number }>;
}

export interface LocalizedObjectAnnotation {
  mid: string;
  name: string;
  score: number;
  boundingPoly: BoundingPoly;
}

export interface FaceAnnotation {
  boundingPoly: BoundingPoly;
  fdBoundingPoly: BoundingPoly;
  landmarks: Array<{
    type: string;
    position: { x: number; y: number; z: number };
  }>;
  rollAngle: number;
  panAngle: number;
  tiltAngle: number;
  detectionConfidence: number;
  landmarkingConfidence: number;
  joyLikelihood: Likelihood;
  sorrowLikelihood: Likelihood;
  angerLikelihood: Likelihood;
  surpriseLikelihood: Likelihood;
  underExposedLikelihood: Likelihood;
  blurredLikelihood: Likelihood;
  headwearLikelihood: Likelihood;
}

export interface LandmarkAnnotation {
  mid: string;
  description: string;
  score: number;
  boundingPoly: BoundingPoly;
  locations: Array<{
    latLng: { latitude: number; longitude: number };
  }>;
}

export interface LogoAnnotation {
  mid: string;
  description: string;
  score: number;
  boundingPoly: BoundingPoly;
}

export interface TextAnnotation {
  locale?: string;
  description: string;
  boundingPoly: BoundingPoly;
}

export interface FullTextAnnotation {
  pages: Array<{
    property?: { detectedLanguages?: Array<{ languageCode: string; confidence: number }> };
    width: number;
    height: number;
    blocks: Array<{
      property?: { detectedLanguages?: Array<{ languageCode: string; confidence: number }> };
      boundingBox: BoundingPoly;
      paragraphs: Array<{
        boundingBox: BoundingPoly;
        words: Array<{
          boundingBox: BoundingPoly;
          symbols: Array<{
            text: string;
            boundingBox: BoundingPoly;
          }>;
        }>;
      }>;
      blockType: string;
    }>;
  }>;
  text: string;
}

export interface SafeSearchAnnotation {
  adult: Likelihood;
  spoof: Likelihood;
  medical: Likelihood;
  violence: Likelihood;
  racy: Likelihood;
}

export interface ColorInfo {
  color: { red: number; green: number; blue: number; alpha?: number };
  score: number;
  pixelFraction: number;
}

export interface ImagePropertiesAnnotation {
  dominantColors: {
    colors: ColorInfo[];
  };
}

export interface CropHint {
  boundingPoly: BoundingPoly;
  confidence: number;
  importanceFraction: number;
}

export interface CropHintsAnnotation {
  cropHints: CropHint[];
}

export interface WebDetection {
  webEntities: Array<{
    entityId: string;
    score: number;
    description: string;
  }>;
  fullMatchingImages: Array<{ url: string; score?: number }>;
  partialMatchingImages: Array<{ url: string; score?: number }>;
  pagesWithMatchingImages: Array<{
    url: string;
    pageTitle?: string;
    fullMatchingImages?: Array<{ url: string }>;
    partialMatchingImages?: Array<{ url: string }>;
  }>;
  visuallySimilarImages: Array<{ url: string; score?: number }>;
  bestGuessLabels: Array<{ label: string; languageCode?: string }>;
}
