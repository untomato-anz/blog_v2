import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "hi here — 지금 내 주변에서 뭐 하지?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  bg: "#FFE14D",
  ink: "#1B1B3A",
  coral: "#FF5C7A",
  mint: "#2EC4A6",
  sky: "#4D8DFF",
  white: "#FFFFFF",
};

function Pin({
  x,
  y,
  color,
  size: s = 64,
}: {
  x: number;
  y: number;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: s,
        height: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: color,
        border: `5px solid ${COLORS.ink}`,
        borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)",
      }}
    >
      <div
        style={{
          width: s / 3,
          height: s / 3,
          borderRadius: "50%",
          background: COLORS.white,
          display: "flex",
        }}
      />
    </div>
  );
}

function EventCard({
  x,
  y,
  label,
  color,
  rotate,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  rotate: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 26px",
        background: COLORS.white,
        border: `4px solid ${COLORS.ink}`,
        borderRadius: 999,
        boxShadow: `6px 6px 0 ${COLORS.ink}`,
        fontSize: 34,
        color: COLORS.ink,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: color,
          display: "flex",
        }}
      />
      {label}
    </div>
  );
}

export default async function Image() {
  const font = await readFile(
    join(process.cwd(), "src/assets/NotoSansKR-ExtraBold.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: COLORS.bg,
          fontFamily: "Noto Sans KR",
          overflow: "hidden",
        }}
      >
        {/* map roads */}
        <div style={{ position: "absolute", left: -50, top: 150, width: 1400, height: 36, background: "rgba(255,255,255,.7)", transform: "rotate(-8deg)", display: "flex" }} />
        <div style={{ position: "absolute", left: -50, top: 470, width: 1400, height: 36, background: "rgba(255,255,255,.7)", transform: "rotate(6deg)", display: "flex" }} />
        <div style={{ position: "absolute", left: 260, top: -50, width: 36, height: 800, background: "rgba(255,255,255,.7)", transform: "rotate(12deg)", display: "flex" }} />
        <div style={{ position: "absolute", left: 900, top: -50, width: 36, height: 800, background: "rgba(255,255,255,.7)", transform: "rotate(-10deg)", display: "flex" }} />

        <Pin x={90} y={70} color={COLORS.coral} />
        <Pin x={1000} y={60} color={COLORS.sky} size={72} />
        <Pin x={1080} y={430} color={COLORS.mint} />
        <Pin x={70} y={450} color={COLORS.sky} size={56} />

        <EventCard x={70} y={215} label="팝업" color={COLORS.coral} rotate={-6} />
        <EventCard x={900} y={190} label="전시" color={COLORS.mint} rotate={5} />
        <EventCard x={930} y={330} label="공연" color={COLORS.sky} rotate={-4} />
        <EventCard x={90} y={360} label="축제" color={COLORS.coral} rotate={4} />

        <div
          style={{
            margin: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            padding: "36px 64px",
            background: COLORS.white,
            border: `5px solid ${COLORS.ink}`,
            borderRadius: 48,
            boxShadow: `12px 12px 0 ${COLORS.ink}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 128,
              lineHeight: 1,
              color: COLORS.ink,
              letterSpacing: -4,
            }}
          >
            hi here!
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              color: COLORS.coral,
            }}
          >
            지금 내 주변에서 뭐 하지?
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Sans KR", data: font, style: "normal", weight: 800 },
      ],
    },
  );
}
