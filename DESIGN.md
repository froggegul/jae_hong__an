---
version: beta
name: Jaehong An Refined Portfolio Tunnel
layout: single-page static portfolio
externalDependencies: none
media:
  video:
    - media/work-01.mp4
    - media/work-02.mp4
    - media/work-03.mp4
  audio: media/bgm.mp3
colors:
  bg: "#0A0A0A"
  ink: "#ECEAE3"
  ink70: "rgba(236,234,227,0.7)"
  ink50: "rgba(236,234,227,0.5)"
  ink30: "rgba(236,234,227,0.3)"
  line: "rgba(236,234,227,0.12)"
  accent: "#C8FF3E"
typography:
  display:
    fontFamily: Inter Tight, SF Pro Display, Helvetica Neue, system-ui, sans-serif
    usage: Artist name, tunnel room titles, major section statements
  body:
    fontFamily: Inter, SF Pro Text, Helvetica Neue, system-ui, sans-serif
    usage: Artist statement and descriptive text
  mono:
    fontFamily: JetBrains Mono, SFMono-Regular, Consolas, monospace
    usage: Labels, room numbers, navigation, metadata
interaction:
  tunnelZSpacing: 1400px
  autoAdvanceDuration: 1100ms
  roomLatch: 520ms
  arrivalCooldown: 1200ms
  overlaySoundRule: Work sound pauses main ambient; closing overlay restores main ambient if enabled.
---

## Overview

The portfolio is organized as a quiet black gallery with a central 3D work tunnel. The site preserves Jaehong An's statement, contact information, existing mp4 works, and existing BGM file while shifting the work-viewing experience from a flat carousel to a depth corridor.

## Structure

1. Sticky header with identity and anchor navigation.
2. Hero with large artist typography and short bilingual positioning.
3. About section with full statement, selected practice notes, and bio.
4. Works intro leading into the tunnel.
5. Tunnel section where three 9:16 works are placed along the z-axis.
6. Archive grid that jumps into the corresponding tunnel room.
7. Index section for contact, available formats, and studio note.
8. Fullscreen overlay for focused video viewing.

## Tunnel Interaction

The tunnel is a sticky 3D viewport. Each work is placed at a z-depth interval of 1400px. Scroll progress moves the camera through those rooms. The focused room becomes sharp, fully opaque, and clickable; distant rooms blur and fade.

Wheel input inside the tunnel is moderated so a strong trackpad gesture cannot skip multiple rooms. Downward movement advances one room at a time and applies a short cooldown after arrival to absorb inertial wheel events. Upward movement remains available as an escape path.

## Sound

The site uses the existing `media/bgm.mp3` as the main ambient layer. It attempts to start after the first user gesture and can be toggled from the floating lower-left control.

When a work opens in fullscreen, main ambient fades out. The overlay starts muted by default; pressing Sound On unmutes only the active work video. Switching works keeps only the active layer audible. Closing the overlay restores main ambient if it was enabled.

## Visual Direction

The design should remain minimal and gallery-like. Black and off-white dominate. The lime accent is used sparingly for room numbers, depth progress, and sound activity. Video frames are the main visual objects; interface elements should feel like labels and architecture rather than decorative UI.
