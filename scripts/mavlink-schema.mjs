import fs from "node:fs";
// Build the selected message wire layouts from official MAVLink XML definitions.
const selected = new Set([0, 1, 2, 24, 33, 147, 245]);
const sizes = {
  char: 1,
  uint8_t: 1,
  int8_t: 1,
  uint16_t: 2,
  int16_t: 2,
  uint32_t: 4,
  int32_t: 4,
  uint64_t: 8,
  int64_t: 8,
  float: 4,
  double: 8,
  uint8_t_mavlink_version: 1,
};
function accumulate(byte, crc) {
  let tmp = byte ^ (crc & 255);
  tmp ^= (tmp << 4) & 255;
  return ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 65535;
}
const result = {};
for (const path of [
  "docs/fixtures/minimal.xml",
  "docs/fixtures/standard.xml",
  "docs/fixtures/common.xml",
]) {
  const xml = fs.readFileSync(path, "utf8");
  for (const [, idText, name, body] of xml.matchAll(
    /<message id="(\d+)" name="([^"]+)">([\s\S]*?)<\/message>/g,
  )) {
    const id = Number(idText);
    if (!selected.has(id)) continue;
    const fields = [];
    let order = 0;
    for (const match of body.matchAll(/<field\s+([^>]+)>/g)) {
      const attrs = match[1];
      const typeText = attrs.match(/type="([^"]+)"/)?.[1];
      const fieldName = attrs.match(/name="([^"]+)"/)?.[1];
      if (!typeText || !fieldName) throw new Error("Invalid XML field");
      const type = typeText.replace(/\[.*\]/, "");
      const count = Number(typeText.match(/\[(\d+)\]/)?.[1] ?? 1);
      const extension =
        body.indexOf("<extensions/>") >= 0 &&
        match.index > body.indexOf("<extensions/>");
      fields.push({
        name: fieldName,
        type,
        count,
        array: typeText.includes("["),
        size: sizes[type],
        extension,
        order: order++,
      });
    }
    const core = fields
      .filter((f) => !f.extension)
      .sort((a, b) => b.size - a.size || a.order - b.order);
    const ordered = [...core, ...fields.filter((f) => f.extension)];
    let crc = 65535;
    const addText = (text) => {
      for (const byte of Buffer.from(text)) crc = accumulate(byte, crc);
    };
    addText(name + " ");
    for (const field of core) {
      addText(
        (field.type === "uint8_t_mavlink_version" ? "uint8_t" : field.type) +
          " ",
      );
      addText(field.name + " ");
      if (field.array) crc = accumulate(field.count, crc);
    }
    let offset = 0;
    const minLength = core.reduce((sum, f) => sum + f.size * f.count, 0);
    result[id] = {
      name,
      crcExtra: (crc & 255) ^ (crc >> 8),
      minLength,
      fields: ordered.map((f) => {
        const output = {
          name: f.name,
          type: f.type,
          count: f.count,
          array: f.array,
          offset,
        };
        offset += f.size * f.count;
        return output;
      }),
      length: offset,
    };
  }
}
fs.writeFileSync(
  "packages/telemetry/mavlink-schema.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  Object.entries(result)
    .map(([id, m]) => `${id}: ${m.name} CRC extra ${m.crcExtra}`)
    .join("\n"),
);
