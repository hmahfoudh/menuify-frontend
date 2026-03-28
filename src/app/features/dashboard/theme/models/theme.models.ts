// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface TemplateResponse {
  id:           string;
  slug:         string;
  name:         string;
  description:  string;
  previewUrl:   string | null;
  thumbnailUrl: string | null;
  planRequired: 'STARTER' | 'STANDARD' | 'PREMIUM';
}

export interface PresetResponse {
  id:          string;
  name:        string;
  description: string | null;
  swatchColor: string;   // dominant hex — shown as the color swatch
  previewUrl:  string | null;
  templateId:  string | null;  // null = works with any template
}

export interface TenantThemeResponse {
  id:                    string;
  template:              TemplateResponse | null;
  preset:                PresetResponse   | null;
  customTokens:          string;    // JSON delta
  customCss:             string | null;
  hasUnpublishedChanges: boolean;
}

export interface ThemeResponse {
  templateSlug:   string;
  resolvedTokens: string;   // complete merged JSON
  customCss:      string | null;
}

export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}

// ── Token structure ────────────────────────────────────────────────────────────
// Mirrors the JSON structure stored in preset.tokens / customTokens
export interface ThemeTokens {
  colors?: {
    background?:  string;
    surface?:     string;
    surface2?:    string;
    accent?:      string;
    accentHover?: string;
    text?:        string;
    textMuted?:   string;
    border?:      string;
  };
  typography?: {
    headingFont?:   string;
    bodyFont?:      string;
    headingWeight?: string;
  };
  shape?: {
    cardRadius?:   string;
    buttonRadius?: string;
  };
  card?: {
    imageHeight?: string;
    shadow?:      string;
  };
}

// ── Token editor sections ──────────────────────────────────────────────────────
export interface TokenField {
  key:         string;       // dot-path like "colors.accent"
  label:       string;
  type:        'color' | 'select' | 'range';
  options?:    string[];     // for select
  min?:        number;       // for range
  max?:        number;
  unit?:       string;       // "px", "%"
}

export const TOKEN_FIELDS: TokenField[] = [
  // Colors
  { key: 'colors.accent',     label: 'Accent colour',    type: 'color'  },
  { key: 'colors.background', label: 'Page background',  type: 'color'  },
  { key: 'colors.surface',    label: 'Card background',  type: 'color'  },
  { key: 'colors.text',       label: 'Primary text',     type: 'color'  },
  { key: 'colors.textMuted',  label: 'Secondary text',   type: 'color'  },
  // Typography
  {
    key: 'typography.headingFont', label: 'Heading font', type: 'select',
    options: [
      'DM Serif Display', 'Cormorant Garamond', 'Playfair Display',
      'Lora', 'Oswald', 'Bebas Neue', 'Plus Jakarta Sans', 'Space Grotesk'
    ]
  },
  {
    key: 'typography.bodyFont', label: 'Body font', type: 'select',
    options: ['DM Sans', 'Inter', 'Lato', 'Nunito', 'Poppins', 'Raleway']
  },
  // Shape
  { key: 'shape.cardRadius',   label: 'Card radius',   type: 'range', min: 0, max: 24, unit: 'px' },
  { key: 'shape.buttonRadius', label: 'Button radius', type: 'range', min: 0, max: 24, unit: 'px' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get a nested value from a flat dot-key path */
export function getTokenValue(tokens: Record<string, any>, dotKey: string): any {
  return dotKey.split('.').reduce((obj, k) => obj?.[k], tokens);
}

/** Set a nested value via a flat dot-key path (returns a new object) */
export function setTokenValue(
  tokens: Record<string, any>,
  dotKey: string,
  value: any
): Record<string, any> {
  const result = structuredClone(tokens);
  const parts  = dotKey.split('.');
  let   cursor = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
      cursor[parts[i]] = {};
    }
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
  return result;
}

/** Flatten ThemeTokens JSON → CSS custom properties string */
export function tokensToCssVars(tokens: Record<string, any>, prefix = ''): string {
  let css = '';
  for (const [key, value] of Object.entries(tokens)) {
    const varName = prefix ? `--${prefix}-${key}` : `--${key}`;
    if (typeof value === 'object' && value !== null) {
      css += tokensToCssVars(value, prefix ? `${prefix}-${key}` : key);
    } else {
      css += `  ${varName}: ${value};\n`;
    }
  }
  return css;
}