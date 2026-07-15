/**
 * Assembles a self-contained deployment package for Hostinger (or any
 * generic Node host) that serves the Backend API, the Admin Panel, AND the
 * customer-facing app (thinkit-app) from the SAME origin — required because
 * both frontends call the API via relative "/api/..." paths (see app.ts).
 *
 * This does NOT touch the normal Replit dev/build/deploy flow — it's a
 * separate, opt-in script you run manually to produce an upload-ready
 * folder.
 *
 * Usage (from the repo root):
 *   node artifacts/api-server/scripts/build-hostinger.mjs
 *
 * Output:
 *   artifacts/api-server/dist/
 *     index.mjs, pino-*.mjs, thread-stream-worker.mjs   (backend runtime)
 *     admin-panel-dist/                                  (admin panel static files, at /admin-panel)
 *     thinkit-app-dist/                                   (customer app static files, at /)
 *     package.json                                        (minimal — only "sharp")
 *
 * Zip the CONTENTS of that dist/ folder and upload it as your Hostinger
 * Node.js Web App. Root directory = the folder containing index.mjs.
 * Install command: npm install
 * Start command:   node --enable-source-maps index.mjs
 */
import { execSync } from "node:child_process";
import { cp, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiServerDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(apiServerDir, "../..");
const adminPanelDir = path.resolve(repoRoot, "artifacts/admin-panel");
const thinkitAppDir = path.resolve(repoRoot, "artifacts/thinkit-app");
const distDir = path.join(apiServerDir, "dist");

function run(cmd, cwd, extraEnv) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

async function main() {
  // 1. Build the admin panel as a static SPA served at /admin-panel on the
  //    same origin as the API (base path must match the mount path in app.ts).
  //    PORT is only needed to satisfy vite.config.ts's startup check — it's
  //    unused by the static `build` output itself.
  run("pnpm --filter @workspace/admin-panel run build", repoRoot, {
    PORT: "3000",
    BASE_PATH: "/admin-panel/",
  });

  // 1b. Build the customer app (thinkit-app) as a static SPA served at "/".
  run("pnpm --filter @workspace/thinkit-app run build", repoRoot, {
    PORT: "3001",
    BASE_PATH: "/",
  });

  // 2. Build the backend (esbuild bundle — self-contained except for "sharp").
  run("pnpm --filter @workspace/api-server run build", repoRoot);

  // 3. Copy each frontend's static output next to the backend bundle.
  const adminPanelDist = path.join(adminPanelDir, "dist/public");
  const adminPanelDest = path.join(distDir, "admin-panel-dist");
  await rm(adminPanelDest, { recursive: true, force: true });
  await cp(adminPanelDist, adminPanelDest, { recursive: true });
  console.log(`\nCopied admin panel build -> ${adminPanelDest}`);

  const thinkitAppDist = path.join(thinkitAppDir, "dist/public");
  const thinkitAppDest = path.join(distDir, "thinkit-app-dist");
  await rm(thinkitAppDest, { recursive: true, force: true });
  await cp(thinkitAppDist, thinkitAppDest, { recursive: true });
  console.log(`Copied thinkit-app build -> ${thinkitAppDest}`);

  // 4. Write a minimal package.json for the uploaded package — only the
  //    externalized native dependency needs to be installed on the host.
  const apiServerPkg = JSON.parse(
    await readFile(path.join(apiServerDir, "package.json"), "utf8"),
  );
  const minimalPkg = {
    name: "thinkit-backend",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      start: "node --enable-source-maps index.mjs",
    },
    dependencies: {
      sharp: apiServerPkg.dependencies.sharp,
    },
  };
  await writeFile(
    path.join(distDir, "package.json"),
    JSON.stringify(minimalPkg, null, 2) + "\n",
  );

  console.log(`\nDeployment package ready: ${distDir}`);
  console.log(
    "Zip the CONTENTS of that folder and upload to Hostinger.\n" +
      "Root directory: the folder containing index.mjs\n" +
      "Install command: npm install\n" +
      "Start command:   node --enable-source-maps index.mjs\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
