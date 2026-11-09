import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
const file = new URL("../.env.docker", import.meta.url);
if (existsSync(file)) {
  console.log(".env.docker already exists; kept existing credentials.");
  process.exit(0);
}
const secret = () => randomBytes(24).toString("hex");
writeFileSync(
  file,
  `NATIVE_DB_PASSWORD=${secret()}\nPAYLOAD_DB_PASSWORD=${secret()}\nDEMO_PASSWORD=${secret()}\nPAYLOAD_SECRET=${secret()}\nPAYLOAD_ADMIN_EMAIL=admin@example.test\nPAYLOAD_ADMIN_PASSWORD=${secret()}\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Created .env.docker with local-only credentials. This file must not be committed.",
);
