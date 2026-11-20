import { cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const frontendDist = new URL("../dist/", import.meta.url);
const backendDist = new URL("../../backend/dist/", import.meta.url);

await build({
  root: frontendRoot,
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api") },
});

await rm(backendDist, { recursive: true, force: true });
await cp(frontendDist, backendDist, { recursive: true });
