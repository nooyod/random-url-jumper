/**
 * 무작위 문자열/숫자 생성 모듈
 */
const NUMBERS = "0123456789";
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const MIXED = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateRandom(mode = "number", length = 4) {
  const safeLength = Math.max(1, Number(length) || 4);
  let chars = NUMBERS;

  if (mode === "text") {
    chars = LETTERS;
  } else if (mode === "mix") {
    chars = MIXED;
  }

  let result = "";
  for (let i = 0; i < safeLength; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}
