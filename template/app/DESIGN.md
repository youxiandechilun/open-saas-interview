---
name: MotionPress
description: AI animation and SEO publishing workspace for content operations teams.
colors:
  canvas: "#f6f8fa"
  surface: "#ffffff"
  ink: "#17212b"
  muted-ink: "#52606d"
  line: "#d9e0e6"
  primary: "#0b5cad"
  primary-hover: "#084b8f"
  accent: "#d96b2b"
  success: "#167a52"
  warning: "#a85b00"
  danger: "#c23934"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: MotionPress

## Overview

**Creative North Star: "The Production Desk"**

MotionPress should feel like a well-run content operations desk: the current job is obvious, tools stay close to the work, and system state never hides behind decoration. The interface is light by default for long editorial sessions, uses compact information density, and reserves strong color for actions and status.

It explicitly rejects generic SaaS starter-kit pages, decorative AI-tool dashboards, demo controls, fake data, dead buttons, card-heavy layouts, and infrastructure terminology in primary navigation.

**Key Characteristics:**

- One consistent left-navigation workspace for authenticated product surfaces.
- Restrained color with clear semantic states and no decorative gradients.
- Dense but readable tables, split panes, timelines, and task queues.
- Short state transitions that explain feedback rather than decorate loading.
- Responsive structure that becomes a focused single-column task flow on mobile.

## Colors

The palette pairs neutral working surfaces with a focused blue action color and an orange publication accent. Success, warning, and danger colors are reserved for real system state.

**The Ten Percent Rule.** Primary and accent colors together occupy no more than ten percent of a routine workspace screen.

**The State Rule.** Color never carries status alone; every state also has an icon or explicit label.

## Typography

**Display Font:** Inter with system sans-serif fallback
**Body Font:** Inter with system sans-serif fallback

**Character:** A single, familiar sans-serif family keeps operational screens coherent. Weight, spacing, and placement establish hierarchy instead of oversized type.

- **Headline:** 700 weight for page titles only.
- **Title:** 650 weight for panel, table, and workflow headings.
- **Body:** 400 weight with a 65-75ch prose limit; data tables may run wider.
- **Label:** 600 weight, sentence case, never tracked uppercase.

**The Fixed Scale Rule.** Product typography uses fixed rem sizes and zero letter spacing. Viewport width never changes font size.

## Elevation

MotionPress is flat by default. Hierarchy comes from surface tone, dividers, and spatial grouping. Small structural shadows may appear only on menus, dialogs, sticky toolbars, and transient feedback; cards do not lift or scale on hover.

**The Flat Workspace Rule.** A bordered panel and a wide soft shadow are never combined as decoration.

## Components

### Buttons

- **Shape:** Compact 6px corners with a stable 40px default height.
- **Primary:** Blue surface, white label, and an icon when a familiar command icon exists.
- **Hover / Focus:** Darker blue hover and a visible two-pixel focus ring with 150-200ms color transitions.
- **Secondary / Ghost:** Neutral border or transparent surface; destructive actions use danger color only at the moment of action.

### Chips

- **Style:** Compact status or filter labels with tonal backgrounds and explicit text.
- **State:** Selected filters include a check icon; workflow statuses use consistent verbs such as Queued, Processing, Published, and Failed.

### Cards / Containers

- **Corner Style:** 8px maximum.
- **Background:** White working surface over the neutral canvas.
- **Shadow Strategy:** Flat at rest.
- **Border:** A single neutral divider when containment is necessary.
- **Internal Padding:** 16px for compact panels and 24px for primary work areas.

### Inputs / Fields

- **Style:** White surface, neutral border, 6px corners, and 40px minimum height.
- **Focus:** Blue border and visible focus ring without layout shift.
- **Error / Disabled:** Inline explanation and semantic icon; disabled controls retain readable contrast.

### Navigation

- A fixed desktop sidebar groups Workspace and Administration destinations. Active items use a tonal background and leading icon, not a solid color block. Mobile uses a sheet with the same groups and labels. External destinations appear as header actions rather than primary navigation.

### Workflow Stepper

- Prompt input, optimization, animation generation, preview, and video export use one stable five-step sequence. Completed steps remain inspectable; failed steps expose a retry action and error detail.

## Do's and Don'ts

### Do:

- **Do** keep animation, publishing, tasks, and administration in one consistent workspace shell.
- **Do** use real empty states with one clear next action.
- **Do** expose configuration, queue, build, quota, and publication state with explicit labels.
- **Do** keep data-dense screens scannable with semantic tables and stable column widths.
- **Do** honor reduced motion and 44px mobile touch targets.

### Don't:

- **Don't** recreate generic SaaS starter-kit pages or expose template features instead of the product workflow.
- **Don't** use decorative gradients, glowing surfaces, oversized metrics, glassmorphism, or gradient text.
- **Don't** ship demo controls, fake data, dead buttons, or settings forms that do not persist.
- **Don't** fragment a single workflow into card-heavy or nested-card layouts.
- **Don't** expose AWS S3, PgBoss, FFmpeg, or other infrastructure names in user-facing navigation.
- **Don't** use colored side-stripe borders, hover scaling on panels, or cards with radius greater than 8px.
