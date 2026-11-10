"use client";

import { useId, useState } from "react";
import type { NilaiBulanan } from "@/types/kinerja";
import { formatDesimal, labelBulan } from "@/utils/format";

/**
 * Grafik bulanan satu seri (garis atau kolom) dalam SVG murni.
 * - Satu seri → tanpa legend; judul kartu yang menamai datanya.
 * - Warna mark var(--chart) = #00a352 (lolos kontras 3:1 di atas putih); teks memakai warna tinta.
 * - Label langsung hanya di titik terakhir (garis) / puncak (kolom); nilai lain via tooltip & tabel sr-only.
 */

const COLOR = "var(--chart)";
const W = 520;
const H = 190;
const PAD = { top: 22, right: 16, bottom: 26, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

type Props = {
  type: "line" | "bar";
  data: NilaiBulanan[];
  /** Judul tabel aksesibel, mis. "Rata-rata rating per bulan" */
  label: string;
  /** Format nilai untuk label, tooltip, & sumbu */
  decimals?: number;
  /** Batas sumbu Y; default otomatis */
  yDomain?: [number, number];
  emptyText?: string;
};

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

/** Kolom dengan ujung atas membulat 4px dan dasar persegi */
function barPath(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  const r = Math.min(4, w / 2, h);
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
}

export default function MonthlyChart({
  type,
  data,
  label,
  decimals = 0,
  yDomain,
  emptyText = "Belum ada data pada periode ini.",
}: Props) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const values = data.map((d) => d.nilai).filter((v): v is number => v !== null);
  const hasData = type === "bar" ? values.some((v) => v > 0) : values.length > 0;

  const [yMin, yMax] =
    yDomain ?? (type === "bar" ? [0, niceMax(Math.max(0, ...values))] : [0, Math.max(1, ...values)]);
  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  const fmt = (v: number) => (decimals > 0 ? formatDesimal(v, decimals) : v.toLocaleString("id-ID"));

  const band = PLOT_W / Math.max(1, data.length);
  const xCenter = (i: number) => PAD.left + band * i + band / 2;
  const yScale = (v: number) =>
    PAD.top + PLOT_H - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin || 1)) * PLOT_H;
  const baseline = PAD.top + PLOT_H;
  const barW = Math.min(24, band * 0.5);

  // Garis terputus di bulan tanpa data
  const segments: string[] = [];
  if (type === "line") {
    let current = "";
    data.forEach((d, i) => {
      if (d.nilai === null) {
        if (current) segments.push(current);
        current = "";
        return;
      }
      current += `${current ? "L" : "M"}${xCenter(i)},${yScale(d.nilai)} `;
    });
    if (current) segments.push(current);
  }

  const lastIndex = data.reduce((acc, d, i) => (d.nilai !== null ? i : acc), -1);
  const peakIndex = data.reduce(
    (acc, d, i) => (d.nilai !== null && d.nilai > (data[acc]?.nilai ?? -Infinity) ? i : acc),
    -1,
  );
  const labelIndex = type === "line" ? lastIndex : peakIndex;
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}
      >
        <title id={titleId}>{label}</title>

        {/* Grid & sumbu Y: garis rambut, solid, samar */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-ink-3 text-[10px]"
            >
              {fmt(t)}
            </text>
          </g>
        ))}

        {/* Sumbu X */}
        {data.map((d, i) => (
          <text
            key={d.bulan}
            x={xCenter(i)}
            y={H - 8}
            textAnchor="middle"
            className={`text-[10px] ${hover === i ? "fill-ink font-semibold" : "fill-ink-3"}`}
          >
            {labelBulan(d.bulan)}
          </text>
        ))}

        {hasData && type === "bar" &&
          data.map((d, i) =>
            d.nilai !== null && d.nilai > 0 ? (
              <path
                key={d.bulan}
                d={barPath(xCenter(i) - barW / 2, yScale(d.nilai), barW, baseline)}
                fill={COLOR}
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
            ) : null,
          )}

        {hasData && type === "line" && (
          <>
            {hover !== null && hovered?.nilai !== null && (
              <line
                x1={xCenter(hover)}
                x2={xCenter(hover)}
                y1={PAD.top}
                y2={baseline}
                stroke="var(--ink-faint)"
                strokeWidth={1}
              />
            )}
            {segments.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke={COLOR}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {data.map((d, i) =>
              d.nilai !== null ? (
                <circle
                  key={d.bulan}
                  cx={xCenter(i)}
                  cy={yScale(d.nilai)}
                  r={hover === i ? 5.5 : 4}
                  fill={COLOR}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ) : null,
            )}
          </>
        )}

        {/* Label langsung: titik terakhir (garis) / puncak (kolom) */}
        {hasData && labelIndex >= 0 && data[labelIndex].nilai !== null && (
          <text
            x={xCenter(labelIndex)}
            y={yScale(data[labelIndex].nilai as number) - 10}
            textAnchor="middle"
            className="fill-ink text-[10px] font-semibold"
          >
            {fmt(data[labelIndex].nilai as number)}
          </text>
        )}

        {/* Area hover per bulan (lebih lebar dari mark) */}
        {hasData &&
          data.map((d, i) => (
            <rect
              key={d.bulan}
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
      </svg>

      {!hasData && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-ink-3">
          {emptyText}
        </p>
      )}

      {hasData && hover !== null && hovered && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-surface shadow"
          style={{ left: `${(xCenter(hover) / W) * 100}%` }}
        >
          {labelBulan(hovered.bulan)} {hovered.bulan.slice(0, 4)}:{" "}
          <strong>{hovered.nilai === null ? "tidak ada data" : fmt(hovered.nilai)}</strong>
        </div>
      )}

      {/* Tampilan tabel untuk pembaca layar */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Bulan</th>
            <th scope="col">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.bulan}>
              <th scope="row">
                {labelBulan(d.bulan)} {d.bulan.slice(0, 4)}
              </th>
              <td>{d.nilai === null ? "tidak ada data" : fmt(d.nilai)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
