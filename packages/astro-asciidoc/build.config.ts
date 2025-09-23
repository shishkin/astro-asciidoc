import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "./src/index",
    "./src/worker",
    {
      input: "./src/types/",
      builder: "mkdist",
    },
  ],
  rollup: {
    emitCJS: true,
  },
  declaration: true,
});
