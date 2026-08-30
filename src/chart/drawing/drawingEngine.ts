import { DrawingObject, DrawingPoint, DrawingStyle, DrawingToolType, Candle } from "../../types/chart";

export interface ChartCoordinateTransform {
  timeToX: (time: number) => number;
  xToTime: (x: number) => number;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  candleWidth: number;
  width: number;
  height: number;
}

export function snapPointToCandles(
  x: number,
  y: number,
  candles: Candle[],
  transform: ChartCoordinateTransform,
  thresholdPx: number = 16
): DrawingPoint {
  let closestTime = transform.xToTime(x);
  let closestPrice = transform.yToPrice(y);

  if (candles.length === 0) {
    return { time: closestTime, price: closestPrice };
  }

  let minDistance = thresholdPx;

  for (const c of candles) {
    const cx = transform.timeToX(c.time);
    const distToX = Math.abs(cx - x);

    if (distToX <= thresholdPx) {
      const prices = [c.open, c.high, c.low, c.close];
      for (const p of prices) {
        const py = transform.priceToY(p);
        const dist = Math.hypot(cx - x, py - y);
        if (dist < minDistance) {
          minDistance = dist;
          closestTime = c.time;
          closestPrice = p;
        }
      }
    }
  }

  return { time: closestTime, price: closestPrice };
}

export function hitTestDrawing(
  x: number,
  y: number,
  drawing: DrawingObject,
  transform: ChartCoordinateTransform,
  tolerancePx: number = 10
): { hit: boolean; handleIndex?: number } {
  const pts = drawing.points.map((p) => ({
    x: transform.timeToX(p.time),
    y: transform.priceToY(p.price)
  }));

  // Check handles first
  for (let i = 0; i < pts.length; i++) {
    const dist = Math.hypot(pts[i].x - x, pts[i].y - y);
    if (dist <= tolerancePx + 4) {
      return { hit: true, handleIndex: i };
    }
  }

  // Check geometry
  switch (drawing.type) {
    case "horizontal_line": {
      if (pts.length > 0) {
        const dy = Math.abs(pts[0].y - y);
        if (dy <= tolerancePx) return { hit: true };
      }
      break;
    }
    case "vertical_line": {
      if (pts.length > 0) {
        const dx = Math.abs(pts[0].x - x);
        if (dx <= tolerancePx) return { hit: true };
      }
      break;
    }
    case "trend_line":
    case "arrow":
    case "ray":
    case "extended_line": {
      if (pts.length >= 2) {
        const p1 = pts[0];
        const p2 = pts[1];
        const dist = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (drawing.type === "trend_line" || drawing.type === "arrow") {
          if (dist <= tolerancePx) return { hit: true };
        } else if (drawing.type === "ray") {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const dot = (x - p1.x) * dx + (y - p1.y) * dy;
            if (dot >= 0) {
              const lineDist = Math.abs((p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x) / len;
              if (lineDist <= tolerancePx) return { hit: true };
            }
          }
        } else if (drawing.type === "extended_line") {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const lineDist = Math.abs((p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x) / len;
            if (lineDist <= tolerancePx) return { hit: true };
          }
        }
      }
      break;
    }
    case "rectangle":
    case "price_range":
    case "measure": {
      if (pts.length >= 2) {
        const minX = Math.min(pts[0].x, pts[1].x);
        const maxX = Math.max(pts[0].x, pts[1].x);
        const minY = Math.min(pts[0].y, pts[1].y);
        const maxY = Math.max(pts[0].y, pts[1].y);
        if (x >= minX - tolerancePx && x <= maxX + tolerancePx && y >= minY - tolerancePx && y <= maxY + tolerancePx) {
          return { hit: true };
        }
      }
      break;
    }
    case "circle": {
      if (pts.length >= 2) {
        const radius = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const dist = Math.hypot(x - pts[0].x, y - pts[0].y);
        if (Math.abs(dist - radius) <= tolerancePx || dist <= radius) {
          return { hit: true };
        }
      }
      break;
    }
    case "parallel_channel": {
      if (pts.length >= 2) {
        const d1 = distToSegment(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        if (d1 <= tolerancePx) return { hit: true };
        if (pts.length >= 3) {
          const dy = pts[2].y - pts[0].y;
          const d2 = distToSegment(x, y, pts[0].x, pts[0].y + dy, pts[1].x, pts[1].y + dy);
          if (d2 <= tolerancePx) return { hit: true };
        }
      }
      break;
    }
    case "fib_retracement": {
      if (pts.length >= 2) {
        const minY = Math.min(pts[0].y, pts[1].y);
        const maxY = Math.max(pts[0].y, pts[1].y);
        const minX = Math.min(pts[0].x, pts[1].x);
        const maxX = Math.max(pts[0].x, pts[1].x);
        if (x >= minX - tolerancePx && x <= maxX + 100 && y >= minY - tolerancePx && y <= maxY + tolerancePx) {
          return { hit: true };
        }
      }
      break;
    }
    case "text": {
      if (pts.length >= 1) {
        const dist = Math.hypot(x - pts[0].x, y - pts[0].y);
        if (dist <= 30) return { hit: true };
      }
      break;
    }
  }

  return { hit: false };
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  drawing: DrawingObject,
  transform: ChartCoordinateTransform,
  isSelected: boolean
) {
  const pts = drawing.points.map((p) => ({
    x: transform.timeToX(p.time),
    y: transform.priceToY(p.price)
  }));

  if (pts.length === 0) return;

  ctx.save();
  ctx.strokeStyle = drawing.style.color || "#38bdf8";
  ctx.fillStyle = drawing.style.fillColor || "rgba(56, 189, 248, 0.15)";
  ctx.lineWidth = drawing.style.lineWidth || 2;
  ctx.globalAlpha = drawing.style.opacity || 1;

  if (drawing.style.lineStyle === "dashed") {
    ctx.setLineDash([6, 6]);
  } else if (drawing.style.lineStyle === "dotted") {
    ctx.setLineDash([2, 4]);
  } else {
    ctx.setLineDash([]);
  }

  switch (drawing.type) {
    case "horizontal_line": {
      const y = pts[0].y;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(transform.width, y);
      ctx.stroke();

      // Only render price tag on the side scale if explicitly enabled (default false to keep chart clean)
      if (drawing.style.showPriceLabel) {
        ctx.fillStyle = drawing.style.color;
        ctx.fillRect(transform.width - 70, y - 10, 68, 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(drawing.points[0].price.toFixed(5), transform.width - 36, y + 4);
      }
      break;
    }

    case "vertical_line": {
      const x = pts[0].x;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, transform.height);
      ctx.stroke();

      // Only render date tag if explicitly enabled
      if (drawing.style.showDateLabel) {
        const d = new Date(drawing.points[0].time);
        const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
        ctx.fillStyle = drawing.style.color;
        ctx.fillRect(x - 30, transform.height - 24, 60, 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(timeStr, x, transform.height - 10);
      }
      break;
    }

    case "trend_line": {
      if (pts.length >= 2) {
        ctx.beginPath();
        let startX = pts[0].x;
        let startY = pts[0].y;
        let endX = pts[1].x;
        let endY = pts[1].y;

        if (drawing.style.extendLeft || drawing.style.extendRight) {
          const dx = endX - startX;
          const dy = endY - startY;
          if (dx !== 0) {
            const slope = dy / dx;
            if (drawing.style.extendLeft) {
              startX = 0;
              startY = pts[0].y - pts[0].x * slope;
            }
            if (drawing.style.extendRight) {
              endX = transform.width;
              endY = pts[1].y + (transform.width - pts[1].x) * slope;
            }
          }
        }

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      break;
    }

    case "ray": {
      if (pts.length >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const slope = dx !== 0 ? dy / dx : 0;
        const extendX = dx >= 0 ? transform.width : 0;
        const extendY = pts[0].y + (extendX - pts[0].x) * slope;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(extendX, extendY);
        ctx.stroke();
      }
      break;
    }

    case "extended_line": {
      if (pts.length >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        if (dx !== 0) {
          const slope = dy / dx;
          const x0 = 0;
          const y0 = pts[0].y - pts[0].x * slope;
          const x1 = transform.width;
          const y1 = pts[0].y + (transform.width - pts[0].x) * slope;

          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
      break;
    }

    case "arrow": {
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        const headlen = 12;
        ctx.beginPath();
        ctx.moveTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[1].x - headlen * Math.cos(angle - Math.PI / 6), pts[1].y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(pts[1].x - headlen * Math.cos(angle + Math.PI / 6), pts[1].y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = drawing.style.color;
        ctx.fill();
      }
      break;
    }

    case "rectangle": {
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
      break;
    }

    case "circle": {
      if (pts.length >= 2) {
        const radius = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case "parallel_channel": {
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        const offset = pts.length >= 3 ? pts[2].y - pts[0].y : 40;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + offset);
        ctx.lineTo(pts[1].x, pts[1].y + offset);
        ctx.stroke();

        // Fill channel
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[1].x, pts[1].y + offset);
        ctx.lineTo(pts[0].x, pts[0].y + offset);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case "fib_retracement": {
      if (pts.length >= 2) {
        const p1 = drawing.points[0];
        const p2 = drawing.points[1];
        const priceDiff = p2.price - p1.price;
        const levels = [
          { ratio: 0, color: "#64748b" },
          { ratio: 0.236, color: "#ef4444" },
          { ratio: 0.382, color: "#f59e0b" },
          { ratio: 0.5, color: "#10b981" },
          { ratio: 0.618, color: "#06b6d4" },
          { ratio: 0.786, color: "#8b5cf6" },
          { ratio: 1.0, color: "#64748b" }
        ];

        const startX = Math.min(pts[0].x, pts[1].x);
        const endX = Math.max(pts[0].x, pts[1].x) + 80;

        levels.forEach((lvl, i) => {
          const priceLevel = p1.price + priceDiff * lvl.ratio;
          const y = transform.priceToY(priceLevel);

          ctx.strokeStyle = lvl.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();

          // Level label
          ctx.fillStyle = lvl.color;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`${(lvl.ratio * 100).toFixed(1)}% (${priceLevel.toFixed(5)})`, endX + 4, y + 3);

          if (i > 0) {
            const prevPrice = p1.price + priceDiff * levels[i - 1].ratio;
            const prevY = transform.priceToY(prevPrice);
            ctx.fillStyle = lvl.color;
            ctx.globalAlpha = 0.04;
            ctx.fillRect(startX, Math.min(y, prevY), endX - startX, Math.abs(y - prevY));
            ctx.globalAlpha = drawing.style.opacity || 1;
          }
        });
      }
      break;
    }

    case "fib_extension": {
      if (pts.length >= 2) {
        const p1 = drawing.points[0];
        const p2 = drawing.points[1];
        const p3 = drawing.points.length >= 3 ? drawing.points[2] : p2;
        const trendDiff = p2.price - p1.price;
        const levels = [
          { ratio: 0.618, color: "#f59e0b" },
          { ratio: 1.0, color: "#10b981" },
          { ratio: 1.618, color: "#06b6d4" },
          { ratio: 2.618, color: "#8b5cf6" }
        ];

        const startX = pts[pts.length - 1].x;
        const endX = startX + 120;

        levels.forEach((lvl) => {
          const priceLevel = p3.price + trendDiff * lvl.ratio;
          const y = transform.priceToY(priceLevel);

          ctx.strokeStyle = lvl.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();

          ctx.fillStyle = lvl.color;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`Ext ${(lvl.ratio * 100).toFixed(1)}% (${priceLevel.toFixed(5)})`, endX + 4, y + 3);
        });
      }
      break;
    }

    case "price_range": {
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);

        const pDelta = drawing.points[1].price - drawing.points[0].price;
        const pPct = (pDelta / drawing.points[0].price) * 100;
        const isUp = pDelta >= 0;

        ctx.fillStyle = isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
        ctx.strokeStyle = isUp ? "#10b981" : "#ef4444";
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Center badge
        const badgeX = x + w / 2;
        const badgeY = y + h / 2;
        ctx.fillStyle = isUp ? "#10b981" : "#ef4444";
        ctx.fillRect(badgeX - 45, badgeY - 12, 90, 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${isUp ? "+" : ""}${pDelta.toFixed(5)} (${pPct.toFixed(2)}%)`, badgeX, badgeY + 4);
      }
      break;
    }

    case "measure": {
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x);
        const y = Math.min(pts[0].y, pts[1].y);
        const w = Math.abs(pts[1].x - pts[0].x);
        const h = Math.abs(pts[1].y - pts[0].y);

        const pDelta = drawing.points[1].price - drawing.points[0].price;
        const pPct = (pDelta / drawing.points[0].price) * 100;
        const timeDeltaMs = Math.abs(drawing.points[1].time - drawing.points[0].time);
        const timeDeltaSec = Math.floor(timeDeltaMs / 1000);

        ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
        ctx.strokeStyle = "#38bdf8";
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Stats badge
        const badgeX = x + w / 2;
        const badgeY = y + h / 2;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(badgeX - 60, badgeY - 20, 120, 40);
        ctx.strokeStyle = "#38bdf8";
        ctx.strokeRect(badgeX - 60, badgeY - 20, 120, 40);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Δ Price: ${pDelta.toFixed(5)} (${pPct.toFixed(2)}%)`, badgeX, badgeY - 4);
        ctx.fillText(`Time: ${timeDeltaSec}s`, badgeX, badgeY + 12);
      }
      break;
    }

    case "text": {
      if (pts.length >= 1) {
        const text = drawing.style.text || "Note";
        ctx.font = `bold ${drawing.style.fontSize || 12}px sans-serif`;
        ctx.fillStyle = drawing.style.textColor || "#ffffff";
        ctx.textAlign = "left";

        // Text bubble background
        const metrics = ctx.measureText(text);
        const padX = 8;
        const padY = 6;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.strokeStyle = drawing.style.color || "#38bdf8";
        ctx.fillRect(pts[0].x, pts[0].y - 20, metrics.width + padX * 2, 24);
        ctx.strokeRect(pts[0].x, pts[0].y - 20, metrics.width + padX * 2, 24);

        ctx.fillStyle = drawing.style.textColor || "#ffffff";
        ctx.fillText(text, pts[0].x + padX, pts[0].y - 4);
      }
      break;
    }
  }

  // Draw handles if selected
  if (isSelected) {
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  ctx.restore();
}
