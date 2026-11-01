// Creates a .env file from .env.example with freshly generated secrets.
// Safe to re-run: existing values in .env are never overwritten.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const examplePath = new URL("../.env.example", import.meta.url);
const envPath = new URL("../.env", import.meta.url);

const generated = {
  AUTH_SECRET: () => randomBytes(32).toString("base64"),
  ENCRYPTION_KEY: () => randomBytes(32).toString("base64"),
};

if (!existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(examplePath, "utf8"));
  console.log("Created .env from .env.example");
}

let env = readFileSync(envPath, "utf8");
for (const [name, make] of Object.entries(generated)) {
  const pattern = new RegExp(`^${name}=(?:""|'')?\s*$`, "m");
  if (pattern.test(env)) {
    env = env.replace(pattern, `${name}="${make()}"`);
    console.log(`Generated ${name}`);
  }
}
writeFileSync(envPath, env);
console.log(".env is ready.");
