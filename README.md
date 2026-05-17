# Jaehong An — Media Artist Portfolio

A standalone portfolio website for Jaehong An, Media Artist.

## Open Locally

Double-click:

```text
Open Jaehong An Website.command
```

Or run a local server from this folder:

```bash
python3 -m http.server 1235
```

Then open:

```text
http://127.0.0.1:1235/
```

## Add Works

Double-click:

```text
Add New Work.command
```

Then drag a video into the Terminal prompts. For the poster prompt, drag an image or press Enter to use the video's first frame.

The script copies files into:

- `media/work-04.mp4`, `media/work-05.mp4`, ...
- `media/web/work-04-web.mp4`, `media/web/work-05-web.mp4`, ...
- `assets/posters/work-04.jpg`, `assets/posters/work-05.jpg`, ...

Work metadata lives in:

```text
content/works.js
```

## Structure

- `index.html` — main portfolio site
- `content/works.js` — portfolio work manifest
- `media/` — video and BGM assets
- `assets/posters/` — poster images
- `tools/add-work.mjs` — local helper for adding works
