import { execSync } from "child_process";
console.log("Installing dependencies...");
execSync("cd /vercel/share/v0-project && pnpm install --no-frozen-lockfile", { stdio: "inherit" });
console.log("Done!");
