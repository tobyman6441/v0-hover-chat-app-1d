# Hover Design System

> Hover's design system for building consistent product UI. Built on React and
> Chakra UI v2, with design tokens, components, hooks, and patterns. All imports
> come from `@hoverinc/design-system-react-web`. Never import directly from
> `@chakra-ui/react`.

Source: https://brand.hover.to/llms.txt

## Key Brand Colors (for Tailwind/CSS use)

| Token           | Hex     | Usage                         |
|-----------------|---------|-------------------------------|
| brandNavy.500   | #003e7d | Primary navy, sidebar bg      |
| brandNavy.600   | #00396a | Sidebar hover/accent          |
| brandNavy.400   | #39699f | Sidebar borders               |
| brandNavy.300   | #7395be | Sidebar ring                  |
| brandNavy.100   | #e6ecf5 | Sidebar foreground, light tint|
| brandGreen.500  | #18784a | CTAs, success, send button    |
| brandGreen.100  | #e6f3ed | Light green tint              |
| neutral.700     | #333333 | Primary text                  |
| neutral.600     | #767676 | Muted text                    |
| neutral.200     | #e9e9e9 | Borders                       |
| neutral.100     | #f5f5f5 | Muted backgrounds             |
| primary.600     | #2277d1 | Interaction blue, ring/focus  |

## Setup

- Package: `@hoverinc/design-system-react-web`
- Icons: `@hoverinc/icons`
- Theme: `@hoverinc/blueprint-theme`

```tsx
import { DesignSystemProvider } from '@hoverinc/design-system-react-web';

function App() {
  return (
    <DesignSystemProvider>
      <YourApp />
    </DesignSystemProvider>
  );
}
```

| Import path                                    | Purpose                                           |
| ---------------------------------------------- | ------------------------------------------------- |
| `@hoverinc/design-system-react-web`            | Components, hooks, types                          |
| `@hoverinc/design-system-react-web/foundation` | Foundation theme tokens                           |
| `@hoverinc/design-system-react-web/brand`      | Brand-specific components (Button, Link, Spinner) |
| `@hoverinc/design-system-react-web/chakra`     | Raw Chakra re-exports (avoid unless necessary)    |

## Design Tokens

Use string token keys as prop values — never raw pixel or hex values.

- Spacing: `padding="400"` (16px), `gap="300"` (12px)
- Sizes: `width="500"` (64px), `height="400"` (48px)
- Colors: prefer semantic tokens (for example `color="textPrimary"`)
- Shadows: `boxShadow="distance200"`
- Border radius: `borderRadius="500"` (8px)

Prefer semantic color tokens first (for text, surfaces, borders, status UI).
Use scale tokens like `primary.100`/`primary.600` only when a semantic token is not available.
Available color scales: `primary`, `neutral`, `success`, `warning`, `danger`.
Brand colors: `brandNavy`, `brandGreen`, `brandBrown`, `brandRed`, `brandTan`,
`brandOrange`, `brandYellow`, `brandPurple`.

For the full token reference, read `@hoverinc/blueprint-theme/dist/TOKENS.md`.

## Primary Colors (full scale)
- `primary.50`: #fafcff
- `primary.100`: #e6f1fe
- `primary.200`: #b9d9fa
- `primary.300`: #90c0f4
- `primary.400`: #69a8eb
- `primary.500`: #448fdf
- `primary.600`: #2277d1
- `primary.700`: #1b5fa7
- `primary.800`: #14477d
- `primary.900`: #0e3054
- `primary.base`: #2277d1

## Neutral Colors (full scale)
- `neutral.0`: #ffffff
- `neutral.50`: #fbfbfb
- `neutral.100`: #f5f5f5
- `neutral.200`: #e9e9e9
- `neutral.300`: #d5d5d5
- `neutral.400`: #bcbcbc
- `neutral.500`: #a7a7a7
- `neutral.550`: #949494
- `neutral.600`: #767676
- `neutral.700`: #333333
- `neutral.800`: #030303

## Brand Navy (full scale)
- `brandNavy.100`: #e6ecf5
- `brandNavy.200`: #acc0db
- `brandNavy.300`: #7395be
- `brandNavy.400`: #39699f
- `brandNavy.500`: #003e7d
- `brandNavy.600`: #00396a
- `brandNavy.700`: #003257
- `brandNavy.800`: #002a45
- `brandNavy.900`: #002032

## Brand Green (full scale)
- `brandGreen.100`: #e6f3ed
- `brandGreen.200`: #afd8c4
- `brandGreen.300`: #7bba9c
- `brandGreen.400`: #489a73
- `brandGreen.500`: #18784a
- `brandGreen.600`: #15663c
- `brandGreen.700`: #11542f
- `brandGreen.800`: #0d4223
- `brandGreen.900`: #0a3018

## Semantic Status Colors
- `success.base`: #1c7a09
- `warning.base`: #ffa100
- `danger.base`: #b41522

## Style Props

Prefer verbose prop names over shorthand:

| Prefer                      | Avoid           |
| --------------------------- | --------------- |
| `padding`                   | `p`             |
| `paddingX` / `paddingY`     | `px` / `py`     |
| `margin`, `marginTop`, etc. | `m`, `mt`, etc. |
| `width` / `height`          | `w` / `h`       |
| `backgroundColor`           | `bg`            |
| `borderRadius`              | `rounded`       |

## Common Mistakes to Avoid

- Don't import from `@chakra-ui/react` — always use `@hoverinc/design-system-react-web`
- Don't use raw pixel values — use token strings (`"400"` not `"16px"`)
- Don't use shorthand style props — use `padding` not `p`, `marginX` not `mx`
- Don't default to scale colors like `primary.100` — prefer semantic color tokens first
- Don't use `md`/`lg` responsive keys — use `base`, `tablet`, `desktop`
- Don't use `leftIcon`/`rightIcon` on Button — use `iconBefore`/`iconAfter`
- Don't use `colorScheme` — use the `color` prop
- Don't forget `label` on `IconButton` — required for accessibility
- Don't nest `DesignSystemProvider` — it's a no-op
- Don't use fontSize tokens directly — use size prop on Body and Heading instead

## Responsive Breakpoints

Use device breakpoints only: `base`, `tablet`, `desktop`.

```tsx
<Box padding={{ base: '200', tablet: '400' }}>Responsive padding</Box>
```

## Detailed References

- [llms-tokens.txt](https://brand.hover.to/llms-tokens.txt)
- [llms-components-general.txt](https://brand.hover.to/llms-components-general.txt)
- [llms-components-forms.txt](https://brand.hover.to/llms-components-forms.txt)
- [llms-components-layout.txt](https://brand.hover.to/llms-components-layout.txt)
- [llms-components-feedback.txt](https://brand.hover.to/llms-components-feedback.txt)
- [llms-hooks.txt](https://brand.hover.to/llms-hooks.txt)
- [llms-patterns.txt](https://brand.hover.to/llms-patterns.txt)
- [llms-engineering.txt](https://brand.hover.to/llms-engineering.txt)
