---
version: alpha
name: Blaca Industrial Blue
description: A clean industrial B2B system with deep navy authority, bright white surfaces, and a single energetic red accent.
colors:
  primary: "#002451"
  primary-contrast: "#ffffff"
  secondary: "#d22b2b"
  surface: "#ffffff"
  background: "#ffffff"
  neutral: "#f3f6f9"
  on-surface: "#002451"
  text: "#002451"
  muted-text: "#585858"
  border: "#d9e0e8"
  accent: "#d22b2b"
  error: "#d22b2b"
typography:
  headline-display:
    fontFamily: Epilogue
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0px
  headline-lg:
    fontFamily: Epilogue
    fontSize: 40px
    fontWeight: 700
    lineHeight: 48px
    letterSpacing: 0px
  headline-md:
    fontFamily: Roboto
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: 500
    lineHeight: 36px
    letterSpacing: 0px
  headline-xs:
    fontFamily: Outfit
    fontSize: 21px
    fontWeight: 500
    lineHeight: 34px
    letterSpacing: 0px
  body-lg:
    fontFamily: Roboto
    fontSize: 17px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: 0px
  body-md:
    fontFamily: Roboto
    fontSize: 16px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0px
  body-sm:
    fontFamily: Roboto
    fontSize: 14px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  label-lg:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: Epilogue
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Epilogue
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.04em
  nav:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 15px
  xl: 27px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 36px
  xl: 50px
  gutter: 32px
  section: 64px
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary-contrast}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.xl}"
    padding: 11px 40px
    height: 54px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.xl}"
    padding: 11px 40px
    height: 54px
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.lg}"
    padding: 20px 20px 50px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px 14px
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.nav}"
    rounded: "{rounded.none}"
    padding: 0px
---

# Blaca Industrial Blue

## Overview
Blaca presents a professional, infrastructure-oriented B2B identity with a confident, technical tone. The interface feels airy and structured, balancing strong navy branding with bright white panels and a vivid red call-to-action accent. It is designed for decision-makers and procurement-oriented visitors who need clarity, credibility, and product breadth at a glance.

## Colors
- **Primary (#002451):** A deep navy used for the brand voice, navigation, body text, and section headings. It gives the system an authoritative, industrial feel.
- **Secondary / Accent (#d22b2b):** A saturated red reserved for emphasis and primary actions. It should signal urgency, key offers, or important conversion points.
- **Surface (#ffffff):** Clean white panels and cards create the dominant canvas and keep the product-heavy layout readable.
- **Background (#ffffff):** Pages remain mostly white outside the hero, helping the content feel open and businesslike.
- **Neutral (#f3f6f9):** A soft cool neutral for subtle fills, chips, and low-emphasis UI backgrounds.
- **On-surface / Text (#002451):** Standard foreground color for high-contrast communication on light backgrounds.
- **Muted Text (#585858):** Secondary copy and supporting details use a mid-gray to reduce visual weight without losing legibility.
- **Border (#d9e0e8):** Light cool borders and separators should be understated and functional rather than decorative.
- **Error (#d22b2b):** Validation and critical states should reuse the same red family for consistency with the accent language.

## Typography
The system combines three sans-serif families with distinct roles: Epilogue for brand/navigation and button labels, Roboto for readable editorial/body copy, and Outfit for mid-level section headings. Headlines are bold and compact, with h1 at 40px/48px and h2 at 32px/40px, giving the page a strong corporate hierarchy. Body copy is relatively large at 17px with a generous 32px line height, which supports scanning in information-dense sections.

Uppercase treatment appears in some UI labels and product lists, so labels can use slightly tighter tracking and stronger weight when emphasis is needed. Navigation is crisp and minimal rather than decorative, and small labels should stay clean rather than overly letterspaced. Avoid mixing font families within a single component unless a hierarchy change is intentional.

## Layout & Spacing
The layout is wide and hero-led, with content stretching edge-to-edge in the header and large graphic sections. Spacing follows a simple stepped rhythm from 8px to 50px, with 24px, 36px, and 50px used most often for breathing room between content blocks. Section padding should feel generous but efficient, reflecting a catalog-style B2B site rather than an editorial magazine.

Cards and promotional modules use clear internal padding and wide horizontal composition, allowing multiple product images and partner logos to coexist without clutter. Use white space to separate dense information clusters, especially around hero statements, product lists, and logo strips. Alignment should remain mostly left-anchored for readability and trust.

## Elevation & Depth
Depth is modest and mostly functional rather than dramatic. The design relies on flat color fields, white cards, and subtle shadows instead of heavy layering. When shadows are used, they are soft and restrained, with cards appearing lifted just enough to separate them from the background.

Borders and tonal contrast do most of the work in defining hierarchy. Hero panels, white product tiles, and logo strips stand out through shape and color contrast rather than strong elevation. Keep overlays and shadows minimal so the interface preserves its clean industrial feel.

## Shapes
The shape language is approachable but structured. Corner radii are moderate, with 15px for cards and 27px for pill-like buttons, creating a rounded yet disciplined look. Interactive elements should feel smooth and accessible, not overly playful.

Large product containers and badges can use fuller rounding when they need to read as feature highlights. Avoid sharp architectural corners on major call-to-action elements, but do preserve straighter geometry in navigation and text containers for clarity.

## Components
Buttons should be prominent and easy to scan. `button-primary` uses the red accent on a rounded 27px pill with white text, 11px vertical padding, 40px horizontal padding, and a 54px height. `button-secondary` keeps the same size and radius but switches to transparent background with navy text and border for a quieter action. `button-tertiary` should be minimal, text-only, and used sparingly for low-emphasis links.

Cards should be white, softly shadowed, and slightly rounded with `rounded.lg`. Keep content inside cards well padded so product imagery and logos do not crowd the edges. Cards can carry muted gray text and thin visual separation, but they should not feel heavy.

Inputs should follow the same restrained visual language: white fill, navy text, moderate radius, and comfortable padding. Focus states should be clear but not flashy, using the primary navy or accent red as appropriate. Inputs should never dominate the layout.

Chips and tags should be compact, readable pills with subtle neutral fills and navy text. They can be used for product categories, short status cues, or feature callouts. Keep them simple and low-profile.

Navigation links should use Epilogue, medium weight, and clean spacing with no decoration by default. Active or highlighted items may use the accent or a lighter blue tint, but the menu overall should stay restrained and uppercase-friendly. Lists and product bullet rows should remain highly legible, with simple checkmark icons and strong alignment.

## Do's and Don'ts
- Do keep the layout spacious and left-aligned for fast scanning.
- Do use the navy primary for most text and structural elements.
- Do reserve the red accent for primary actions and important emphasis.
- Do preserve the rounded 27px button shape for strong CTA consistency.
- Do use white surfaces and subtle shadows to separate content blocks.
- Don't introduce loud gradients, neon colors, or flashy decorative effects.
- Don't make body text too small or overly tight; readability is a priority.
- Don't over-round cards or use deep elevation that would weaken the industrial tone.