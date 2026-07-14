---
title: Publishing Workflow Guide
description: Follow the MotionPress workflow from prompt optimization and safe HTML preview through video rendering, SEO review, publication, and blog synchronization.
---

Use this guide as the operating contract for one complete content job. A step is complete only when its output is saved and the next step can consume it.

## Create and optimize the prompt

Start in the animation studio with the audience, format, duration, visual direction, and required message. Run prompt optimization, review the rewrite and score, then explicitly choose the version to generate.

## Generate and preview safe HTML

Generation creates a saved animation record. Preview it in the sandbox before accepting it. The record keeps the original prompt, optimized prompt, generated HTML, provider snapshot, usage, and timestamps together.

## Render a downloadable video

Request MP4 or WebM output from the accepted animation. Rendering runs as a background task with queued, running, completed, and failed states. Failed work keeps its error and exposes an intentional retry action.

## Build and review the article

Attach the accepted asset to an article, choose the author and tags, validate the slug, and complete the SEO report. The quality gate checks title and description length, heading structure, canonical source, image alt text, and internal links.

## Publish and verify delivery

Publication creates a delivery event that synchronizes public content, rebuilds metadata and the sitemap, and records the final outcome. Continue with the article on [designing the full AI animation publishing path](/blog/ai-animation-publishing-workflow/).
