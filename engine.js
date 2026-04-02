export function layout(prepared, getLineWidth, lineHeight) {
  let lines = [];
  let currentLine = [];
  let currentWidth = 0;
  let y = 0;

  for (let item of prepared) {
    let maxWidth = getLineWidth(y);

    if (currentWidth + item.width > maxWidth) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
      y += lineHeight;
      maxWidth = getLineWidth(y);
    }

    currentLine.push(item);
    currentWidth += item.width;
  }

  if (currentLine.length) lines.push(currentLine);

  return {
    lines,
    height: lines.length * lineHeight
  };
}