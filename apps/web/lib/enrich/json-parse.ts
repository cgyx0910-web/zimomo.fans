/** 从模型输出中取出 JSON 对象字符串（支持 ```json 围栏或裸对象）。 */
export function extractJsonObjectString(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) {
    return fenced[1].trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("模型响应中未找到 JSON 对象。");
  }
  return text.slice(start, end + 1);
}
