import { glob } from "glob";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const source = "english";
const target = "simp_chinese";
const apiUrl = "https://translate.googleapis.com/translate_a/single";

/**
 * @param {string} text
 * @example https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=english
 */
const translate = async (text) => {
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: "en",
      tl: "zh",
      dt: "t",
      q: text,
    });
    const res = await fetch(`${apiUrl}?${params.toString()}`);
    const [arr] = await res.json();
    const strs = arr.map((item) => item[0]);
    return strs.join();
  } catch (ex) {
    console.log("====> 翻译失败");
    console.error(ex);
    return text;
  }
};

/**
 * @param {string} line
 */
const processLine = async (line) => {
  if (line.trim() === `l_${source}:`) {
    return `l_${target}:`;
  } else if (line.trim() === "" || line.trim()["0"] === "#") {
    return line;
  }
  const result = /(\s*)([^"\s]+)(\s)(.*)/.exec(line);
  if (!result) {
    return line;
  }
  const paragraph = await translate(result[4]);
  return `${result[1]}${result[2]}${result[3]}${paragraph}`;
};

const run = async () => {
  await rm(`localisation/${target}`, { recursive: true, force: true });
  const files = await glob(
    `localisation/${source}/**/zofe_situations_l_english.yml`
  );
  files.forEach(async (file) => {
    console.log("开始翻译文件{%s}", file);
    const relativePath = path.relative(`localisation/${source}`, file);
    const dirName = path.dirname(relativePath);
    const fileName = path.basename(relativePath, ".yml");
    try {
      /**
       * @type {string}
       */
      const content = await readFile(file, { encoding: "utf8" });
      const lines = content.split(os.EOL);
      const result = [];
      for (const line of lines) {
        result.push(await processLine(line));
      }
      console.log("文件{%s}翻译完成", file);
      const newDirName = path.join(`localisation/${target}`, dirName);
      await mkdir(newDirName, { recursive: true });
      const newFileName = path.join(newDirName, `${fileName}.yml`);
      console.log("开始写入新文件{%s}", newFileName);
      await writeFile(newFileName, result.join(os.EOL), {
        encoding: "utf8",
      });
      console.log("文件{%s}写入完成", newFileName);
    } catch (ex) {
      console.log(file);
      console.error(ex);
    }
  });
};

run();
