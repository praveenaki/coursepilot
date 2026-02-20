/**
 * Loads .docx templates from public/templates/ as base64 strings.
 * Uses browser.runtime.getURL to resolve extension-internal URLs.
 */

export async function loadTemplate(filename: string): Promise<string> {
  // WXT's PublicPath type is auto-generated; templates/ may not be included
  // until a dev build regenerates .wxt/ types, so we need a type assertion
  const path = `/templates/${filename}`;
  const url = browser.runtime.getURL(path as never);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load template "${filename}": ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
