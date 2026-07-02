Now I have enough information to write the specification.

# Slates Specification for Dreamstudio

## Overview

DreamStudio is the web-based creative platform and API by Stability AI, providing access to Stable Diffusion models for AI-powered image generation, editing, upscaling, video generation, and 3D asset creation. The API platform includes various services supporting image generation, editing, upscaling and more. It provides capabilities for seamless image, video, and 3D generation, as well as sophisticated editing and upscaling tools.

## Authentication

DreamStudio uses API key-based authentication. Your DreamStudio API key will be required for authentication.

- **Obtaining an API key**: Create a Stability AI account and retrieve your API key from the [API Keys page](https://platform.stability.ai/account/keys) or from [DreamStudio Account](https://beta.dreamstudio.ai/account).
- **Using the key**: Include this key in the Authorization header of your requests. Pass it as a Bearer token:
  ```
  Authorization: Bearer <your-api-key>
  ```
- **Base URL**: `https://api.stability.ai`
- **Credits**: Using DreamStudio or the API requires credits. Credits are the unit of currency consumed when calling the API – the amount consumed varies across models and modalities. After using up all your credits, you can purchase more through your Billing dashboard at $1 USD per 100 credits.

No OAuth flow or scopes are involved. Only a single API key is needed.

## Features

### Image Generation (Text-to-Image)

Generate images from text prompts using various Stable Diffusion models. Available models include SD 3.5 Large, and others, with parameters such as negative prompt, aspect ratio, seed, and output format (PNG, JPEG, WebP). Multiple model tiers are available including Stable Image Ultra (highest quality), Stable Image Core, Stable Diffusion 3.5 Large, Large Turbo, and Medium, each with different quality and speed tradeoffs.

### Image Editing

A suite of targeted image modification tools:

- **Inpaint**: Edits or replaces specific defined areas using a mask image or alpha channel. Useful for product photography and scene modification.
- **Erase**: Eliminates unwanted elements from images, such as imperfections on faces or objects on surfaces, using masking techniques.
- **Outpaint**: Extends the image beyond its boundaries in any direction (left, right, up, down) with configurable pixel amounts and a creativity parameter.
- **Search and Replace**: Changes objects based on textual instructions without needing a mask. Uses a search prompt to identify the object and a prompt to describe its replacement.
- **Search and Recolor**: Adjusts the colors of specific objects via text prompts, automatically segmenting the object.
- **Remove Background**: Segments the foreground to eliminate the background.
- **Replace Background and Relight**: Swaps backgrounds while keeping the main subject intact, with lighting control via prompts.

### Image Upscaling

Tools for increasing image size and resolution:

- **Conservative Upscale**: Delivers a straightforward 4-megapixel result while preserving the original appearance.
- **Creative Upscale**: Designed for heavily degraded images (less than 1 megapixel), applies a creative approach to generate high-resolution outputs. Supports a creativity parameter. This is an asynchronous operation requiring polling for results.
- **Fast Upscale**: Quick and efficient, perfect for improving the quality of compressed images. No prompt required.

### Image Control

Tools for generating controlled variations of images:

- **Sketch**: Transforms rough sketches into polished, refined outputs. For non-sketch images, it offers advanced control by utilizing the image's contour lines and edges to guide adjustments. Configurable via control_strength (0.01–1.0), prompt, and negative prompt.
- **Structure**: Maintains the structural elements of input images while allowing content modification. Useful for restyling images while keeping the composition intact.
- **Style Transfer**: Transfers the style from a reference image to generate a new image. Configurable via a fidelity parameter to balance content and style.

### Video Generation

Generate video from text prompts or images. Capable of generating 14 and 25 frames at customizable frame rates between 3 and 30 frames per second. Creates videos in 2 minutes or less. This is an asynchronous operation requiring polling for the result.

### 3D Asset Generation

Generate 3D meshes and assets from single 2D images. The model is available via the Stability AI API. Includes Stable Fast 3D for rapid generation of 3D assets including mesh, textures, and material properties.

### Account Management

Query user account details and check remaining credit balance via dedicated endpoints.

## Events

The provider does not support events. There are no webhooks or event subscription mechanisms available through the DreamStudio/Stability AI API.
