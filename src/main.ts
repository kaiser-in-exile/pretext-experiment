import "./style.css";
import { prepareWithSegments, layout, layoutWithLines, layoutNextLineRange, materializeLineRange, type LayoutLineRange } from "@chenglou/pretext";

const TEXT = `
A Believable fiction is a rather ambitious, and attempting to be eloquent blog written by a somewhat fictional character in an attempt to make sense of a strange world that the character inhabits.
In all seriousness there is no specific rhyme or reason to any post on the page, anything fanciful or mundane might be written, edited, and just as well removed as needed, but at least something will be there.`.trim();

const prepared = prepareWithSegments(TEXT, "16px sans-serif");
console.log(prepared);

const WIDTH = 250;
const WRAPAROUND_CIRCLE_RADIUS = 80;
const LINE_HEIGHT = 24;

const result = layout(prepared, WIDTH, LINE_HEIGHT);
console.log("result = ", result);

const app = document.querySelector<HTMLDivElement>("#app")!;

const textContainer = document.querySelector<HTMLDivElement>("#text-container")!;
textContainer.style.width = `${WIDTH}px`;

const debugInfoContainer = document.querySelector<HTMLPreElement>("#debug-info");

textContainer.innerText = TEXT;

const cursorCircle = document.createElement("div")
cursorCircle.style.cssText = `
  position: fixed;
  width: ${(WRAPAROUND_CIRCLE_RADIUS - 24) * 2}px;
  height: ${(WRAPAROUND_CIRCLE_RADIUS - 24) * 2}px;
  border-radius: 50%;
  border: 1px solid red;
  pointer-events: none;
`
document.body.appendChild(cursorCircle)

function computeAvailableWidth(
  centerX: number,
  centerY: number,
  radius: number, 
  lineY: number,
  lineHeight: number,
  containerWidth: number,
) {
  const lineMiddle = lineY + lineHeight / 2;
  const verticalDistanceBetweenCircleCenterAndLine = Math.abs(lineMiddle - centerY);
  if (verticalDistanceBetweenCircleCenterAndLine < radius) {
    // the circle will affect the available width
    const halfChordWidthAtY = Math.sqrt(radius * radius - verticalDistanceBetweenCircleCenterAndLine * verticalDistanceBetweenCircleCenterAndLine);
    const leftWidth = Math.max(centerX - halfChordWidthAtY, 0);
    const rightWidth = Math.max(containerWidth - (centerX + halfChordWidthAtY), 0);
    return { leftWidth, rightWidth, rightStart: centerX + halfChordWidthAtY, gap: 2 * halfChordWidthAtY }
  }
  return { leftWidth: containerWidth, rightWidth: 0, rightStart: 0, gap: 0 };
}

function createSegmentSpan(segment: LayoutLineRange, marginLeft: number = 0) {
  const span = document.createElement("span");
  const {text} = materializeLineRange(prepared, segment);
  span.innerText = text;
  span.style.marginLeft = marginLeft + "px";
  return span;
}

function drawTextInContainerWrapAroundMouse(container: HTMLDivElement, containerRelativeX: number, containerRelativeY: number) {
  container.innerHTML = "";
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = 0;
  while (true) {
    const availableWidth = computeAvailableWidth(containerRelativeX, containerRelativeY, WRAPAROUND_CIRCLE_RADIUS, y, LINE_HEIGHT, WIDTH);
    if (cursor.segmentIndex === 0) {
      console.log(availableWidth);
    }
    const lineContainer = document.createElement("div");
    lineContainer.classList.add("line-container");
    const leftSegment = layoutNextLineRange(prepared, cursor, availableWidth.leftWidth);
    if (leftSegment === null) {
      break;
    }
    const leftSegmentContainer = createSegmentSpan(leftSegment);
    lineContainer.appendChild(leftSegmentContainer);
    if (availableWidth.rightWidth > 0) {
      const nextSameLineCursor = leftSegment.end;
      const rightSegment = layoutNextLineRange(prepared, nextSameLineCursor, availableWidth.rightWidth);
      if (rightSegment === null) {
        break;
      }
      const rightSegmentContainer = createSegmentSpan(rightSegment, availableWidth.gap);
      lineContainer.appendChild(rightSegmentContainer);
      cursor = rightSegment.end;
    } else {
      cursor = leftSegment.end;
    }
    textContainer.appendChild(lineContainer);
    y += LINE_HEIGHT;
  }
}

textContainer.addEventListener("mousemove", (e) => {
  const rect = textContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  cursorCircle.style.left = `${e.clientX - WRAPAROUND_CIRCLE_RADIUS + 24}px`;
  cursorCircle.style.top = `${e.clientY - WRAPAROUND_CIRCLE_RADIUS + 24}px`;
  drawTextInContainerWrapAroundMouse(textContainer, x, y);
})