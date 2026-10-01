// Static build: copy the dashboard into out/ (the folder the deployer serves)
// and expose the Command Centre page as index.html.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "OriginalIndustrial monitoring dashboard prototype (1)");
const out = path.join(root, "out");

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, {
  recursive: true,
  filter: (p) => !p.includes(`${path.sep}node_modules`) && !p.includes(`${path.sep}screenshots`),
});
fs.copyFileSync(path.join(out, "JSW ICCC Command Centre.html"), path.join(out, "index.html"));

console.log(`Built static site in ${path.relative(root, out)}/`);
