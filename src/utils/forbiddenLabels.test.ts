import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const FORBIDDEN = [
  /contribution[s]?\s+mensuel/i, // « contribution mensuelle » / « contributions mensuelles »
];

// Fichiers tolérés : noms de colonnes DB, types Supabase, ce test lui-même.
const ALLOWLIST = [
  "integrations/supabase/types.ts",
  "utils/forbiddenLabels.test.ts",
  "utils/pricing.ts", // commentaire JSDoc historique éventuel — protégé par allowlist
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("Aucune ancienne formulation « contribution mensuelle progressive » dans l'UI", () => {
  const files = walk(ROOT).filter(
    (f) => !ALLOWLIST.some((a) => f.replace(/\\/g, "/").endsWith(a)),
  );

  it.each(files)("%s ne contient pas l'ancien libellé", (file) => {
    const content = readFileSync(file, "utf8");
    // Ignore les noms de propriétés DB type `contribution_mensuelle_par_ha`
    const stripped = content.replace(/contribution_mensuelle[a-z_]*/gi, "");
    for (const re of FORBIDDEN) {
      expect(stripped, `Found forbidden label in ${file}`).not.toMatch(re);
    }
  });
});
