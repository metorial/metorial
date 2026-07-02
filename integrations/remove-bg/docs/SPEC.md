Now let me fetch the actual API reference page to get more details on the parameters and features.# Slates Specification for Remove.bg

## Overview

Remove.bg is an AI-powered image background removal service by Canva Austria GmbH (formerly Kaleido). It provides an API that automatically detects foreground subjects (people, products, animals, cars, etc.) in images and removes or replaces their backgrounds. The API supports images up to 50 megapixels and returns processed images in various formats.

## Authentication

Remove.bg supports two authentication methods:

### API Key Authentication (Primary)

Remove.bg uses API keys for authentication. You can create the API key in your account profile. With one of the self-service plans (or with the free plan) you can create up to two API keys, while enterprise users can create up to 10 API keys.

The API key must be passed via the `X-Api-Key` request header:

```
X-Api-Key: YOUR_API_KEY
```

The base URL for all API requests is `https://api.remove.bg/v1.0/`.

### OAuth 2.0 (By Request)

If you want to authenticate users with the click of a button instead of having them enter an API Key, you can get in touch with Remove.bg to try their OAuth 2.0 login. This option is not self-service and requires contacting Remove.bg directly for setup.

## Features

### Background Removal

The core feature of the API. Submit an image (via file upload, URL, or base64-encoded data) and receive the image with its background removed. Key options include:

- **Output size**: `preview`, `small`, `medium`, `hd`, `4k`, `50MP`, or `auto`.
- **Subject type**: Either person, product, animal, car, or other. Also supports `graphic` and `transportation`. Can be set to `auto` for automatic detection.
- **Channels**: Request either the finalized image (`rgba`, default) or an alpha mask (`alpha`).
- **Semitransparency**: Option to handle semi-transparent areas in the foreground.
- **Output format**: PNG (up to 10 MP), JPG (up to 50 MP), WebP (up to 50 MP), or ZIP (up to 50 MP, best performance).

### Background Replacement

Instead of just removing the background, you can replace it directly in the same API call:

- **Solid color background**: Adds a solid color background specified as a hex color code (e.g. "81d4fa", "fff") or a color name (e.g. "green"). Supports semi-transparent hex codes.
- **Background image**: Adds a background image from a URL. The image is centered and resized to fill the canvas while preserving the aspect ratio. Can also be provided as a file upload.

### Region of Interest

Only contents of a specified rectangular region can be detected as foreground. Everything outside is considered background and will be removed. The rectangle is defined as two x/y coordinates in the format "&lt;x1&gt; &lt;y1&gt; &lt;x2&gt; &lt;y2&gt;" with coordinates in absolute pixels (suffix 'px') or relative to image dimensions (suffix '%').

### Shadow Effects

- Option to add an artificial shadow to the result.
- Configurable shadow type and shadow opacity parameters.

### Cropping and Scaling

- **Crop**: Automatically crop off empty regions from the result.
- **Crop margin**: Add a margin around the cropped result.
- **Scale**: Scale the subject relative to the total image size.
- **Position**: Control the position of the subject within the output image.

### Foreground Position Metadata

The API returns metadata about the detected foreground position and dimensions (`foreground_top`, `foreground_left`, `foreground_width`, `foreground_height`) in response headers and JSON responses.

### Account Information

Retrieve account details including current credit balance and usage information.

### Result Quality Improvement

Submit feedback on processed images to help improve the AI model's accuracy for similar images in the future.

## Events

The provider does not support events. Remove.bg is a stateless image processing API with no webhook or event subscription functionality.
