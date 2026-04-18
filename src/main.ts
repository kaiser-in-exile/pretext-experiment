import "./style.css";
import {
    prepareWithSegments,
    layoutNextLineRange,
    materializeLineRange,
    type LayoutLineRange,
    type PreparedTextWithSegments,
} from "@chenglou/pretext";

const WIDTH = 400;
const WRAPAROUND_CIRCLE_RADIUS = 120;
const LINE_HEIGHT = 24;

const FONT_FAMILY = "Mediaeval Sharp";
const FONT_SIZE = 16;

const FONT_STRING = `${FONT_SIZE}px ${FONT_FAMILY}`;

const TEXT_CONTAINERS = document.querySelectorAll<HTMLParagraphElement>(".text-container");
const TEXT_CONTAINERS_WITH_PREPARED = Array.from(TEXT_CONTAINERS).map((container) => {
    container.style.width = WIDTH + "px";
    const text = container.innerText;
    const prepared = prepareWithSegments(text, FONT_STRING);
    return { container, prepared };
});

// #region - cursor settings
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;
const CURSOR_LERP_FACTOR = 0.1;
const CURSOR_OFFSET = -48;
const cursorCircle = document.createElement("div");
cursorCircle.classList.add("cursor");
cursorCircle.style.cssText = `
    position: fixed;
    width: ${(WRAPAROUND_CIRCLE_RADIUS - CURSOR_OFFSET) * 2}px;
    height: ${(WRAPAROUND_CIRCLE_RADIUS - CURSOR_OFFSET) * 2}px;
    cursor: none;
`;
const cursorImage = document.createElement("img");
cursorImage.src = "/images/cursor.png";
cursorImage.classList.add("spinning");
cursorCircle.appendChild(cursorImage);
document.body.appendChild(cursorCircle);

cursorCircle.addEventListener("click", (_e) => {
    cursorImage.classList.toggle("spinning");
});

// #endregion

await document.fonts.ready;

function computeAvailableWidthAroundCircle(
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
        const halfChordWidthAtY = Math.sqrt(
            radius * radius - verticalDistanceBetweenCircleCenterAndLine * verticalDistanceBetweenCircleCenterAndLine,
        );
        const leftWidth = Math.min(Math.max(centerX - halfChordWidthAtY, 0), containerWidth);
        const rightWidth = Math.min(Math.max(containerWidth - (centerX + halfChordWidthAtY), 0), containerWidth);
        return {
            leftWidth,
            rightWidth,
            rightStart: centerX + halfChordWidthAtY,
            gap: 2 * halfChordWidthAtY,
            rightMargin: Math.max(centerX + halfChordWidthAtY - leftWidth, 0),
        };
    }
    return { leftWidth: containerWidth, rightWidth: 0, rightStart: 0, gap: 0, rightMargin: 0 };
}

function createSegmentSpan(prepared: PreparedTextWithSegments, segment: LayoutLineRange, marginLeft: number = 0) {
    const span = document.createElement("span");
    const { text } = materializeLineRange(prepared, segment);
    span.innerText = text;
    span.style.marginLeft = marginLeft + "px";
    return span;
}

function drawTextInContainerWrapAroundMouse(
    prepared: PreparedTextWithSegments,
    container: HTMLDivElement,
    containerRelativeX: number,
    containerRelativeY: number,
) {
    container.innerHTML = "";
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    while (true) {
        const availableWidth = computeAvailableWidthAroundCircle(
            containerRelativeX,
            containerRelativeY,
            WRAPAROUND_CIRCLE_RADIUS,
            y,
            LINE_HEIGHT,
            WIDTH,
        );

        const lineContainer = document.createElement("div");
        lineContainer.classList.add("line-container");

        if (availableWidth.leftWidth > 0) {
            const leftSegment = layoutNextLineRange(prepared, cursor, availableWidth.leftWidth);
            if (leftSegment === null) {
                break;
            }
            const leftSegmentContainer = createSegmentSpan(prepared, leftSegment);
            lineContainer.appendChild(leftSegmentContainer);
            cursor = leftSegment.end;
        }
        if (availableWidth.rightWidth > 0) {
            const nextSameLineCursor = cursor;
            const rightSegment = layoutNextLineRange(prepared, nextSameLineCursor, availableWidth.rightWidth);
            if (rightSegment === null) {
                break;
            }
            const rightSegmentContainer = createSegmentSpan(prepared, rightSegment, availableWidth.rightMargin);
            lineContainer.appendChild(rightSegmentContainer);
            cursor = rightSegment.end;
        }
        container.appendChild(lineContainer);
        y += LINE_HEIGHT;
    }
}

function drawText() {
    cursorX = cursorX + (mouseX - cursorX) * CURSOR_LERP_FACTOR;
    cursorY = cursorY + (mouseY - cursorY) * CURSOR_LERP_FACTOR;
    cursorCircle.style.left = `${cursorX - WRAPAROUND_CIRCLE_RADIUS + CURSOR_OFFSET}px`;
    cursorCircle.style.top = `${cursorY - WRAPAROUND_CIRCLE_RADIUS + CURSOR_OFFSET}px`;

    for (const { container, prepared } of TEXT_CONTAINERS_WITH_PREPARED) {
        const rect = container.getBoundingClientRect();
        const x = cursorX - rect.left;
        const y = cursorY - rect.top;
        drawTextInContainerWrapAroundMouse(prepared, container, x, y);
    }
    requestAnimationFrame(drawText);
}

drawText();

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
