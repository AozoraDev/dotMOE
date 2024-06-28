import "./src/utils/console";
import { rmSync } from "fs";

console.log("Building...");
const config = {
    entrypoints: ["src/index.ts", "src/service.ts"],
    outdir: "dist",
    //minify: true,
    splitting: true
}

// Delete the dist folder
rmSync(config.outdir, { recursive: true, force: true });

Bun.build(config).then(out => {
    if (!out.success) throw new Error(out.logs);

    console.log("Building is successfully!");
    console.log(`- Output dir: ${config.outdir}/`);
    console.log(`- Output files: ${out.outputs.map(file => file.path.split("/").pop()).join(", ")}`);
});