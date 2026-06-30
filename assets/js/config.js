/* =============================================================================
 *  FEDERAL MINISTRY OF DEFENCE — site configuration
 * =============================================================================
 *
 *  HOW TO ADD YOUR MICROSOFT AZURE TRANSLATOR KEY
 *  ───────────────────────────────────────────────
 *  Translation is powered by Microsoft Azure Translator (Cognitive Services).
 *
 *  1. Create an Azure Cognitive Services resource in the Azure Portal:
 *       → https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation
 *  2. Copy the API key from: Resource → Keys and Endpoint → KEY 1
 *  3. Note the Region (e.g. westeurope, eastus) from the same page.
 *  4. Paste the key into AZURE_TRANSLATE_KEY below.
 *  5. Set AZURE_TRANSLATE_REGION to match your resource region.
 *  6. (Recommended) Restrict the key to *.defence.gov.ng/* in Azure Portal.
 *
 *  The site falls back to English if the key is missing or invalid.
 * ============================================================================= */
window.MOD_CONFIG = {

  // ── Microsoft Azure Translator API key & region ───────────────────────────
  // Set these to enable live translation. Leave empty to disable.
  AZURE_TRANSLATE_KEY:    "",
  AZURE_TRANSLATE_REGION: "westeurope",

  // ── Languages offered in the dropdown (label shown to users) ─────────────
  //   Add more by appending {code: "label"} — everything else is generic.
  LANGUAGES: {
    "en":    "English",
    "ha":    "Hausa",
    "ig":    "Igbo",
    "yo":    "Yoruba",
    "fr":    "Français",
    "es":    "Español",
    "zh-Hans": "中文 (简体)",
  },

  // ── Default language when nothing is saved in localStorage ───────────────
  DEFAULT_LANG: "en",

  // ── localStorage keys ────────────────────────────────────────────────────
  STORAGE: {
    LANG:  "mod-lang",
    CACHE: "mod-i18n-cache-v1",
    A11Y:  "mod-a11y",
  },

  // ── Last content review date — stamped in the footer for BPSR "currency" ─
  LAST_REVIEWED: "June 2026",
};
