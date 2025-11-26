// scripts/check-deps.cjs
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SHARED = new Set([
  "typescript",
  "@types/node",
  "eslint",
  "prettier",
  "turbo",
]);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
  }
}

const pkgPaths = [];
function collectPackages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const pkgJson = path.join(full, "package.json");
      if (fs.existsSync(pkgJson)) pkgPaths.push(pkgJson);
      collectPackages(full);
    }
  }
}

collectPackages(path.join(ROOT, "apps"));
collectPackages(path.join(ROOT, "packages"));

let hasError = false;

for (const pkgPath of pkgPaths) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  for (const dep of Object.keys(deps)) {
    if (SHARED.has(dep)) {
      console.error(
        `[deps] ${pkg.name} (${pkgPath}) should not declare shared dep "${dep}". Put it in root package.json.`
      );
      hasError = true;
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("All deps OK ✅");
}
