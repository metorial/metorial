# <img src="https://provider-logos.metorial-cdn.com/stability-ai.png" height="20"> Stability Ai

Generate images from text prompts using Stable Diffusion models, edit images with tools like inpainting, outpainting, erase, search-and-replace, search-and-recolor, and background removal. Upscale images to 4K resolution with conservative, creative, or fast modes. Apply style transfer between images and generate images guided by structural inputs like sketches. Replace backgrounds and adjust lighting on subject images. Generate audio from text prompts or transform existing audio with style control. Create 3D assets from single images. Check account credit balance and usage.

## Tools

### Control Image Generation

Generate images guided by structural inputs using Stability AI's control tools. Three control modes: - **sketch**: Generate production-grade images from hand-drawn sketches or line drawings. - **structure**: Generate images that maintain the structural composition and edges of a reference image. - **style**: Generate new content in the visual style of a reference image (style transfer). Each mode takes a reference image and a text prompt to guide the output.

### Edit Image

Edit images using Stability AI's suite of editing tools. Supports multiple operations: - **erase**: Remove unwanted elements using a mask. - **inpaint**: Fill or replace masked areas with new content based on a prompt. - **outpaint**: Extend image boundaries in any direction while maintaining visual consistency. - **search_and_replace**: Swap objects by describing what to find and what to replace it with (no mask needed). - **search_and_recolor**: Change colors of specific objects described in plain language (no mask needed). - **remove_background**: Remove the background from an image, leaving the subject on a transparent background.

### Generate 3D Model

Generate 3D models from a single image using Stability AI's 3D generation models. Two models available: - **stable-fast-3d**: Generates high-quality 3D assets in ~0.5 seconds. Best for quick prototyping. - **spar3d** (Stable Point Aware 3D): More detailed generation with point cloud sampling. Better for complex objects and unseen backside details. Both models output UV-unwrapped and textured GLB files ready for use in 3D applications and game engines.

### Generate Audio

Generate audio tracks from text prompts using Stable Audio. Creates high-quality 44.1 kHz stereo audio with coherent musical structures. Supports melodies, sound effects, ambient audio, and various musical styles. Describe the desired audio including genre, mood, instruments, and style for best results.

### Generate Image

Generate images from text prompts using Stability AI models. Supports three model tiers: - **Ultra**: Top-tier quality powered by Stable Diffusion 3.5, excels at typography, complex compositions, and photorealism. - **Core**: Fast, affordable generation with good quality. Supports style presets. - **SD3.5**: Access to specific SD3.5 model variants with advanced controls like CFG scale. Optionally provide a reference image for image-to-image generation (Ultra and SD3.5 only).

### Get Account Info

Retrieve Stability AI account information and credit balance. Returns the account email, profile picture, organizations, and current credit balance for monitoring API usage.

### Replace Background & Relight

Replace the background of a subject image with a new AI-generated scene and adjust lighting. Useful for e-commerce product shots, real estate photography, and creative compositing. Provide a subject image and describe the desired background. Optionally control the lighting direction and intensity to match the new scene.

### Upscale Image

Enhance image resolution using Stability AI's upscaling models. Three modes available: - **fast**: Quick 4x resolution increase without prompt guidance. Best for simple upscaling tasks. - **conservative**: Upscales up to 4K while preserving details and minimizing alterations. Requires a descriptive prompt. - **creative**: Significantly reinterprets and enhances images up to 4K resolution. Best for heavily degraded images. Accepts a creativity scale parameter. This is an async operation that may take longer.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
