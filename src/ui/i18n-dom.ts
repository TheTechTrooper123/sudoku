/**
 * Translation of static markup.
 *
 * Elements carry `data-i18n="key"` (text content) and optionally
 * `data-i18n-attr="aria-label:key,title:other.key"`, which lets the HTML
 * contain the real English copy for search engines while the app swaps it to
 * the active language at runtime.
 */
import type { Language, TranslationKey, Translator } from '../i18n/index.ts';
import { setAttr, setText } from './dom.ts';

export function applyTranslations(root: ParentNode, t: Translator): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n as TranslationKey | undefined;
    if (key) setText(node, t(key));
  }

  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    const spec = node.dataset.i18nAttr;
    if (!spec) continue;
    for (const pair of spec.split(',')) {
      const [attribute, key] = pair.split(':').map((part) => part.trim());
      if (!attribute || !key) continue;
      setAttr(node, attribute, t(key as TranslationKey));
    }
  }
}

export function translateNode(node: HTMLElement | null, key: TranslationKey, t: Translator): void {
  if (node) setText(node, t(key));
}

/** Keeps `<html lang>`, the page title and the meta description in sync. */
export function applyDocumentMeta(t: Translator, language: Language): void {
  document.documentElement.lang = language;
  document.title = t('meta.title');
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = t('meta.description');
  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = t('meta.title');
  const ogDescription = document.querySelector<HTMLMetaElement>(
    'meta[property="og:description"]',
  );
  if (ogDescription) ogDescription.content = t('meta.description');
}
