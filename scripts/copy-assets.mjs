// Ships the CSS and the avatar catalog next to the JS bundle: tokens.css on its
// own (for apps that only want the variables) and styles.css = tokens + components.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const tokens = readFileSync("src/tokens/tokens.css", "utf8");
const components = readFileSync("src/styles/components.css", "utf8");
writeFileSync("dist/tokens.css", tokens);
writeFileSync("dist/styles.css", `${tokens}\n${components}`);
copyFileSync("src/avatar/catalog.json", "dist/avatar-catalog.json");
