import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts"],
  dts: true,
  copy: "src/types/types.d.ts",
});
