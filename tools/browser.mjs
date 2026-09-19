/* browser — the ONE place this repo opens a browser, and the one place it says it cannot.
 *
 * WHY IT EXISTS, and it is a defect rather than a tidy-up. Three modules render a page:
 * diagram-collisions, diagram-export and reading-aids. All three guarded the IMPORT — an
 * `await import('playwright')` in a try/catch that prints an install line and exits 3 — and not one
 * of them guarded the LAUNCH. Those are two different absences and only one was covered:
 *
 *   the PACKAGE is absent   `import('playwright')` throws   → caught, named, exit 3
 *   the BROWSER is absent   `chromium.launch()` throws      → UNCAUGHT, stack trace, exit 1
 *
 * The second is the COMMON one. `npm install` brings the package; `npx playwright install chromium`
 * is a separate step a fresh checkout has not taken, so package-present-browser-absent is the state
 * every new clone is in. MEASURED 2026-09-19 on this repo: `npm run check` died mid-suite with
 * "browserType.launch: Executable doesn't exist at …/chrome-headless-shell" over a Node stack trace —
 * which is the exact failure tools/diagram-collisions.mjs's own header says it exists to prevent.
 *
 * AND ITS CONTROL WAS GREEN. checks/test-tools.mjs asserts "names the missing dependency instead of
 * throwing" and passed, because it plants ONE of the two faults: it copies the module to a temp
 * directory where the package cannot resolve. A control that plants one of two faults cannot speak
 * about the other, and a green row was read as though it had. The second fault is planted now.
 *
 * THE TWO ANSWERS ARE NOT INTERCHANGEABLE, which is why this does not collapse them into one string.
 * Telling someone to `npm i -D playwright` when playwright is already installed is a wrong
 * instruction, and a reader who follows it and sees "up to date" learns to distrust the next one. */

export const INSTALL_PACKAGE = 'npm i -D playwright && npx playwright install chromium';
export const INSTALL_BROWSER = 'npx playwright install chromium';

/* Playwright's own wording for "the package is here and the binary is not". Matched rather than
   assumed: any other launch failure is reported verbatim instead of being given this advice. */
const NO_BINARY = /Executable doesn't exist|playwright install/i;

/**
 * A launched browser, or the reason there is not one. NEVER THROWS — that is the whole interface.
 * A caller that has to wrap this in a try/catch has been handed back the complexity this module
 * exists to absorb.
 *
 *   { browser }  ready to use, and the caller closes it
 *   { why }      a clause naming which absence it is and the one command that fixes it. It
 *                carries NO subject of its own — the caller says what it wanted the browser
 *                FOR, because "this reads the rendered diagram" and "this check renders the
 *                page" are the caller's sentence and would read twice if both sides wrote one.
 */
export async function open(opts = {}) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { return { why: `playwright is not installed: ${INSTALL_PACKAGE}` }; }

  try { return { browser: await chromium.launch(opts) }; }
  catch (e) {
    const msg = String(e?.message ?? e);
    if (NO_BINARY.test(msg)) return { why: `playwright is installed but its browser is not: ${INSTALL_BROWSER}` };
    /* A THIRD FAILURE EXISTS AND IS NOT GUESSED AT — a sandbox with no shared libraries, a browser
       killed by the OS. It is reported in the tool's own words rather than dressed as a missing
       install, because sending someone to reinstall a browser they have is the same wrong
       instruction one case up. */
    return { why: `the browser would not start: ${msg.split('\n')[0]}` };
  }
}
