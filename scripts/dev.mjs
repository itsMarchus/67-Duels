import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnv } from "vite";

const projectRoot = process.cwd();
const environment = {
  ...process.env,
  ...loadEnv("development", projectRoot, "")
};

const requiredVariables = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "SOLO_SCORE_SECRET"
];
const missingVariables = requiredVariables.filter((name) => !environment[name]?.trim());

if (missingVariables.length > 0) {
  console.error("Missing server variables in .env.local: " + missingVariables.join(", "));
  console.error("Create .env.local from .env.example before starting the full app.");
  process.exit(1);
}

if (!existsSync(".vercel/project.json")) {
  console.error("Missing Vercel project metadata.");
  console.error("Run: npx vercel@56.4.1 pull --yes --environment development");
  process.exit(1);
}

if (!environment.npm_execpath) {
  console.error("Could not locate npm. Start the app with npm run dev.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [
    environment.npm_execpath,
    "exec",
    "--yes",
    "--package=vercel@56.4.1",
    "--",
    "vercel",
    "dev",
    "--listen",
    "3000"
  ],
  {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit"
  }
);

child.once("error", (error) => {
  console.error("Could not start the Vercel development server: " + error.message);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
