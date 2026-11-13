import { RowDataPacket } from "mysql2/promise";

import { getMySQLPool } from "@/database/mysql-client";
import { handleServiceError } from "@/utils/error";
import type { ActionResponse } from "@/types/action";
import type {
  LaporanLayanan,
  LaporanLayananFilter,
} from "@/types/laporan-layanan";

const amount =
  "(COALESCE(k.nominal, 0) * (1 - COALESCE(l.diskon, 0) / 100))";

export async function getLaporanLayananService(
  filter: LaporanLayananFilter,
): Promise<ActionResponse<LaporanLayanan>> {
  try {
    const pool = getMySQLPool();
    const base = `
      FROM kunjungan kj
      JOIN layanan l ON l.idLayanan = kj.idLayanan
      JOIN poli p ON p.idPoli = l.idPoli
      LEFT JOIN keuangan k ON k.idTransaksi = l.idKeuangan
      WHERE kj.tglKunjungan BETWEEN ? AND ?
    `;
    const values: unknown[] = [filter.mulai, filter.selesai];
    const poliClause =
      filter.poli !== "Semua" ? " AND p.namaPoli = ?" : "";

    if (filter.poli !== "Semua") {
      values.push(filter.poli);
    }

    const [
      [summary],
      [byPoli],
      [trend],
      [recap],
    ] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `
          SELECT
            COALESCE(SUM(${amount}), 0) AS totalPendapatan,
            COUNT(*) AS jumlahLayanan,
            COALESCE(
              SUM(${amount}) / NULLIF(COUNT(*), 0),
              0
            ) AS rataRata
          ${base}
          ${poliClause}
        `,
        values,
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT
            p.namaPoli AS poli,
            COALESCE(SUM(${amount}), 0) AS pendapatan
          ${base}
          ${poliClause}
          GROUP BY p.idPoli, p.namaPoli
          ORDER BY pendapatan DESC
        `,
        values,
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT
            CONCAT(
              'M',
              WEEK(kj.tglKunjungan, 1) - WEEK(?, 1) + 1
            ) AS label,
            p.namaPoli AS poli,
            COALESCE(SUM(${amount}), 0) AS pendapatan
          ${base}
          ${poliClause}
          GROUP BY label, p.idPoli, p.namaPoli
          ORDER BY label
        `,
        [filter.mulai, ...values],
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT
            l.namaLayanan,
            p.namaPoli AS poli,
            COALESCE(k.nominal, 0) AS tarif,
            COUNT(*) AS jumlah,
            COALESCE(SUM(${amount}), 0) AS pendapatan
          ${base}
          ${poliClause}
          GROUP BY
            l.idLayanan,
            l.namaLayanan,
            p.namaPoli,
            k.nominal
          ORDER BY pendapatan DESC
        `,
        values,
      ),
    ]);

    const totalPendapatan = Number(summary[0]?.totalPendapatan ?? 0);
    const jumlahLayanan = Number(summary[0]?.jumlahLayanan ?? 0);
    const pendapatanPoli = byPoli.map((row) => ({
      poli: String(row.poli),
      pendapatan: Number(row.pendapatan),
      persentase: contribution(Number(row.pendapatan), totalPendapatan),
    }));
    const rekap = recap.map((row, index) => ({
      namaLayanan: String(row.namaLayanan),
      poli: String(row.poli),
      tarif: Number(row.tarif),
      jumlah: Number(row.jumlah),
      pendapatan: Number(row.pendapatan),
      persentase: contribution(Number(row.pendapatan), totalPendapatan),
      peringkat: index + 1,
    }));

    return {
      success: true,
      data: {
        filter,
        ringkasan: {
          totalPendapatan,
          jumlahLayanan,
          layananTertinggi: rekap[0]?.namaLayanan ?? "-",
          poliTertinggi: pendapatanPoli[0]?.poli ?? "-",
          rataRata: Number(summary[0]?.rataRata ?? 0),
        },
        pendapatanPoli,
        trenMingguan: trend.map((row) => ({
          label: String(row.label),
          poli: String(row.poli),
          pendapatan: Number(row.pendapatan),
        })),
        rekap,
      },
    };
  } catch (error) {
    return handleServiceError(
      error,
      "Terjadi kesalahan saat mengambil laporan layanan.",
    );
  }
}

function contribution(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}
