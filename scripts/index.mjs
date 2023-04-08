import { glob } from "glob";
import { readFile } from "node:fs/promises";
import os from "node:os";

const run = async (target = "simp_chinese") => {
  const files = await glob("**/zofe_situations_l_english.yml");
  files.forEach(async (file) => {
    try {
      /**
       * @type {string}
       */
      const content = await readFile(file, { encoding: "utf8" });
      const lines = content.split(os.EOL);
      const result = [];
      for (const line of lines) {
        result.push(line);
      }
    } catch (ex) {
      console.log(file);
      console.error(ex);
    }
  });
};

run();
