/*
 * Local type augmentation for `next/font/google` so TypeScript under
 * `moduleResolution: "bundler"` resolves the named exports.
 *
 * The shipped Next.js declaration is `export * from
 * 'next/dist/compiled/@next/font/dist/google'` which (under bundler
 * resolution) doesn't surface the auto-generated function exports.
 * Declaring the trio we use locally is enough — we don't need the
 * full 1500-font typing suite.
 */

declare module "next/font/google" {
  type Display = "auto" | "block" | "swap" | "fallback" | "optional";
  type CssVariable = `--${string}`;

  type NextFont = {
    className: string;
    style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
  };

  type NextFontWithVariable = NextFont & { variable: string };

  type FontOptions<TVariable extends CssVariable | undefined> = {
    weight?: string | string[];
    style?: string | string[];
    display?: Display;
    variable?: TVariable;
    preload?: boolean;
    fallback?: string[];
    adjustFontFallback?: boolean;
    subsets?: string[];
  };

  type FontFn = <T extends CssVariable | undefined = undefined>(
    options: FontOptions<T>,
  ) => T extends undefined ? NextFont : NextFontWithVariable;

  export const Inter: FontFn;
  export const Instrument_Serif: FontFn;
  export const JetBrains_Mono: FontFn;
}
