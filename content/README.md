# Adding portfolio works locally

You do not need to edit `index.html`.

## Easiest method

1. Double-click `Add New Work.command` in this folder.
2. Drag your `.mp4` file into the Terminal window when it asks for `Video file path`.
3. Drag a poster image (`.jpg` or `.png`) when it asks for `Poster image path`, or press Enter to use the video's first frame.
4. Fill in title/year/description prompts.
5. Refresh the portfolio page.

The script copies files into:

- `media/work-04.mp4`, `media/work-05.mp4`, ...
- `media/web/work-04-web.mp4`, `media/web/work-05-web.mp4`, ... when `ffmpeg` is available
- `assets/posters/work-04.jpg`, `assets/posters/work-05.jpg`, ...

Then it updates `content/works.js` automatically.

For smooth loading, the page should reference the lightweight `media/web/*-web.mp4`
file. The original `media/work-XX.mp4` can stay in the folder as a source archive.
If no poster image is provided, the script extracts the first video frame as the poster.

## Manual method

1. Put the optimized web video in `media/web/`, for example `media/web/work-04-web.mp4`.
2. Put the poster in `assets/posters/`, for example `assets/posters/work-04.jpg`.
3. Open `content/works.js`.
4. Copy the last `{ ... }` block, paste it below, and change:

```js
{
  idx: "04",
  title: "New Work Title",
  desc: "Korean description",
  descEn: "English description",
  year: "2026",
  medium: "9:16 Video",
  duration: "looped",
  caption: "Short caption",
  video: "media/web/work-04-web.mp4",
  poster: "assets/posters/work-04.jpg"
}
```

Important: put a comma between work blocks, but not after the final `]`.
