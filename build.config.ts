import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["./src/index", "./src/worker"],
  rollup: {
    emitCJS: true,
  },
  declaration: true,
});
