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
    const inQuotes = text[0] === '"' && text[text.length - 1] === '"';
    const textPart = inQuotes ? text.slice(1, -1) : text;
    if (textPart.trim() === "") {
      return text;
    }
    const params = new URLSearchParams({
      client: "gtx",
      sl: "en",
      tl: "zh",
      dt: "t",
      q: textPart,
    });
    const res = await fetch(`${apiUrl}?${params.toString()}`);
    const json = await res.json();
    const [arr] = json;
    const strs = arr.map((item) => item[0]);
    const sentense = strs.join();
    return inQuotes ? `"${sentense}"` : sentense;
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
  const startTime = Date.now();
  await rm(`localisation/${target}`, { recursive: true, force: true });
  const files = await glob(`localisation/${source}/**/*.yml`);
  const errFiles = [];
  for (const file of files) {
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
      const newFileName = path.join(
        newDirName,
        `${fileName.replace(source, target)}.yml`
      );
      console.log("开始写入新文件{%s}", newFileName);
      await writeFile(newFileName, "\ufeff" + result.join(os.EOL), {
        encoding: "utf8",
      });
      console.log("文件{%s}写入完成", newFileName);
      console.log("\n");
    } catch (ex) {
      console.error("翻译文件{%s}过程中出错", file);
      errFiles.push(file);
      console.error(ex);
    }
  }
  const duration = Math.ceil((Date.now() - startTime) / 1000);
  console.log("用时：%s秒", duration);

  console.log("出错文件: %s", errFiles.join("") || "不包含错误文件");
};

run();
