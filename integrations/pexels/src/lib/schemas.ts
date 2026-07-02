import { z } from 'zod';

export let photoSrcSchema = z.object({
  original: z.string().describe('The image without any size changes'),
  large2x: z.string().describe('The image resized to W 940px X H 650px DPR 2'),
  large: z.string().describe('The image resized to W 940px X H 650px DPR 1'),
  medium: z.string().describe('The image scaled so its new height is 350px'),
  small: z.string().describe('The image scaled so its new height is 130px'),
  portrait: z.string().describe('The image cropped to W 800px X H 1200px'),
  landscape: z.string().describe('The image cropped to W 1200px X H 627px'),
  tiny: z.string().describe('The image cropped to W 280px X H 200px')
});

export let photoSchema = z.object({
  photoId: z.number().describe('The unique ID of the photo'),
  width: z.number().describe('The real width of the photo in pixels'),
  height: z.number().describe('The real height of the photo in pixels'),
  url: z.string().describe('The Pexels URL where the photo is located'),
  photographer: z.string().describe('The name of the photographer'),
  photographerUrl: z.string().describe("The URL of the photographer's Pexels profile"),
  photographerId: z.number().describe('The ID of the photographer'),
  avgColor: z.string().describe('The average color of the photo (hex)'),
  src: photoSrcSchema.describe('URLs for different image sizes'),
  alt: z.string().describe('Alt text description of the photo'),
  liked: z.boolean().optional().describe('Whether the user has liked the photo')
});

export let videoFileSchema = z.object({
  fileId: z.number().describe('The ID of the video file'),
  quality: z.string().describe('The video quality (e.g., hd, sd)'),
  fileType: z.string().describe('The video format (e.g., video/mp4)'),
  width: z.number().describe('The width in pixels'),
  height: z.number().describe('The height in pixels'),
  fps: z.number().optional().describe('Frames per second'),
  link: z.string().describe('Direct URL to the video file')
});

export let videoPictureSchema = z.object({
  pictureId: z.number().describe('The ID of the preview picture'),
  picture: z.string().describe('URL to the preview image'),
  nr: z.number().describe('The index number of the picture')
});

export let videoUserSchema = z.object({
  userId: z.number().describe('The ID of the videographer'),
  name: z.string().describe('The name of the videographer'),
  url: z.string().describe("The URL of the videographer's Pexels profile")
});

export let videoSchema = z.object({
  videoId: z.number().describe('The unique ID of the video'),
  width: z.number().describe('The real width of the video in pixels'),
  height: z.number().describe('The real height of the video in pixels'),
  url: z.string().describe('The Pexels URL where the video is located'),
  image: z.string().describe('URL to a screenshot of the video'),
  duration: z.number().describe('The duration of the video in seconds'),
  user: videoUserSchema.describe('The videographer who shot the video'),
  videoFiles: z.array(videoFileSchema).describe('Available video file versions'),
  videoPictures: z.array(videoPictureSchema).describe('Preview pictures for the video')
});

export let collectionSchema = z.object({
  collectionId: z.string().describe('The unique ID of the collection'),
  title: z.string().describe('The name of the collection'),
  description: z.string().optional().describe('The description of the collection'),
  isPrivate: z.boolean().describe('Whether the collection is private'),
  mediaCount: z.number().describe('Total number of media in the collection'),
  photosCount: z.number().describe('Total number of photos in the collection'),
  videosCount: z.number().describe('Total number of videos in the collection')
});

export let paginationSchema = z.object({
  page: z.number().describe('Current page number'),
  perPage: z.number().describe('Number of results per page'),
  totalResults: z.number().describe('Total number of results'),
  nextPage: z.string().optional().describe('URL for the next page of results'),
  prevPage: z.string().optional().describe('URL for the previous page of results')
});
