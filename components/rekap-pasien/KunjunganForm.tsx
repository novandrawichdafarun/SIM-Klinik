"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { Save, Search, X } from "lucide-react";
import { createKunjunganAction } from "@/actions/rekap-pasien";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import type { ActionResponse } from "@/types/action";
import type { PetugasOption, PoliOption } from "@/types/rekap-pasien";
import { maskNik } from "@/utils/format";
import { Field, FormCard, inputCls } from "./FormBits";

interface PasienOption {
  idPasien: number;
  NoRM: string;
  namaLengkap: string;
  NIK: string;
}

/**
 * Kotak cari pasien yang langsung menampilkan hasil (nama, No. RM, atau NIK).
 * Pasien terpilih tampil sebagai kartu; nilai dikirim lewat input tersembunyi `idPasien`.
 */
function PasienPicker({
  pasien,
  idPasien,
  onChange,
  invalid,
}: {
  pasien: PasienOption[];
  idPasien: string;
  onChange: (id: string) => void;
  invalid: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [aktif, setAktif] = useState(0);
  const terpilih = pasien.find((p) => String(p.idPasien) === idPasien);

  const hasil = useMemo(() => {
    const kata = q.trim().toLowerCase();
    const angka = kata.replace(/\D/g, "");
    const cocok = kata
      ? pasien.filter(
          (p) =>
            p.namaLengkap.toLowerCase().includes(kata) ||
            p.NoRM.toLowerCase().includes(kata) ||
            (angka.length >= 3 && p.NIK.includes(angka)),
        )
      : pasien;
    return cocok.slice(0, 8);
  }, [pasien, q]);

  function pilih(p: PasienOption) {
    onChange(String(p.idPasien));
    setQ("");
    setOpen(false);
  }

  if (terpilih) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/60 bg-accent-soft/40 px-4 py-3">
        <input type="hidden" name="idPasien" value={terpilih.idPasien} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{terpilih.namaLengkap}</p>
          <p className="text-xs text-ink-3">
            {terpilih.NoRM} · NIK {maskNik(terpilih.NIK)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-hover"
        >
          <X aria-hidden="true" size={15} /> Ganti
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input type="hidden" name="idPasien" value="" />
      <Search
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute top-5 left-3 -translate-y-1/2 text-ink-3"
      />
      <input
        id="cariPasien"
        role="combobox"
        aria-expanded={open}
        aria-controls="hasil-pasien"
        aria-invalid={invalid}
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAktif(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setAktif((i) => Math.min(i + 1, hasil.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (hasil[aktif]) pilih(hasil[aktif]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Ketik nama, No. RM, atau NIK pasien"
        className={`${inputCls} pl-9 ${invalid ? "border-red-500" : ""}`}
      />
      {open && (
        <ul
          id="hasil-pasien"
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-mid"
        >
          {hasil.map((p, i) => (
            <li
              key={p.idPasien}
              role="option"
              aria-selected={i === aktif}
              // onMouseDown supaya terpilih sebelum input kehilangan fokus
              onMouseDown={(e) => {
                e.preventDefault();
                pilih(p);
              }}
              onMouseEnter={() => setAktif(i)}
              className={`cursor-pointer px-3 py-2 ${i === aktif ? "bg-surface-hover" : ""}`}
            >
              <span className="block text-sm font-semibold">{p.namaLengkap}</span>
              <span className="block text-xs text-ink-3">
                {p.NoRM} · NIK {maskNik(p.NIK)}
              </span>
            </li>
          ))}
          {hasil.length === 0 && (
            <li className="px-3 py-3 text-sm text-ink-3">
              Pasien tidak ditemukan.{" "}
              <Link
                href="/rekap-pasien/pasien/tambah"
                onMouseDown={(e) => e.preventDefault()}
                className="font-semibold text-accent-ink hover:underline"
              >
                Tambah pasien baru →
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function KunjunganForm({
  pasien,
  poli,
  dokter,
  perawat,
  defaultPasien,
  defaultTanggal,
}: {
  pasien: PasienOption[];
  poli: PoliOption[];
  dokter: PetugasOption[];
  perawat: PetugasOption[];
  defaultPasien?: number;
  defaultTanggal: string;
}) {
  const [belumPilih, setBelumPilih] = useState(false);
  const [idPasien, setIdPasien] = useState(defaultPasien ? String(defaultPasien) : "");
  const [idPoli, setIdPoli] = useState(poli.length === 1 ? String(poli[0].idPoli) : "");
  const [idDokter, setIdDokter] = useState("");
  const [idPerawat, setIdPerawat] = useState("");
  const [tanggal, setTanggal] = useState(defaultTanggal);
  const [jam, setJam] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [state, formAction, isPending] = useActionState<ActionResponse | null, FormData>(
    createKunjunganAction,
    null,
  );
  useFeedbackAksi(state);

  // Dokter & perawat dari poli tujuan; kalau poli itu belum punya petugas, tampilkan semua
  const menurutPoli = (list: PetugasOption[]) => {
    const cocok = list.filter((p) => String(p.idPoli) === idPoli);
    return cocok.length > 0 ? cocok : list;
  };
  const dokterTampil = idPoli ? menurutPoli(dokter) : [];
  const perawatTampil = idPoli ? menurutPoli(perawat) : [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!idPasien) {
          setBelumPilih(true);
          document.getElementById("cariPasien")?.focus();
          return;
        }
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-5"
    >
      <FormCard title="Pasien">
        {pasien.length === 0 ? (
          <p className="text-sm text-ink-3">
            Belum ada data pasien.{" "}
            <Link
              href="/rekap-pasien/pasien/tambah"
              className="font-semibold text-accent-ink hover:underline"
            >
              Tambah pasien dulu →
            </Link>
          </p>
        ) : (
          <Field label="Pasien" htmlFor="cariPasien" required>
            <PasienPicker
              pasien={pasien}
              idPasien={idPasien}
              invalid={belumPilih}
              onChange={(id) => {
                setIdPasien(id);
                setBelumPilih(false);
              }}
            />
            {belumPilih && (
              <p className="mt-1 text-xs text-red-600">Pilih pasien terlebih dahulu.</p>
            )}
          </Field>
        )}
      </FormCard>

      <FormCard title="Jadwal & Tujuan">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tanggal kunjungan" htmlFor="tglKunjungan" required>
            <input
              id="tglKunjungan"
              name="tglKunjungan"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Jam" htmlFor="jamKunjungan" required>
            <input
              id="jamKunjungan"
              name="jamKunjungan"
              type="time"
              required
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Poli tujuan" htmlFor="idPoli" required className="md:col-span-2">
            <select
              id="idPoli"
              name="idPoli"
              required
              value={idPoli}
              onChange={(e) => {
                setIdPoli(e.target.value);
                setIdDokter("");
                setIdPerawat("");
              }}
              className={inputCls}
            >
              <option value="">— Pilih poli —</option>
              {poli.map((p) => (
                <option key={p.idPoli} value={p.idPoli}>
                  {p.namaPoli}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Dokter yang dituju"
            htmlFor="idDokter"
            required
            hint="Dokter ini yang mengisi layanan/tindakan & diagnosa, dan menerima jasa dokter."
          >
            <select
              id="idDokter"
              name="idDokter"
              required
              disabled={!idPoli}
              value={idDokter}
              onChange={(e) => setIdDokter(e.target.value)}
              className={`${inputCls} disabled:bg-surface-muted`}
            >
              <option value="">{idPoli ? "— Pilih dokter —" : "Pilih poli terlebih dahulu"}</option>
              {dokterTampil.map((d) => (
                <option key={d.idKaryawan} value={d.idKaryawan}>
                  {d.namaLengkap}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Perawat yang membantu"
            htmlFor="idPerawat"
            required
            hint="Perawat ini yang mengisi tanda vital & keluhan, dan menerima jasa perawat."
          >
            <select
              id="idPerawat"
              name="idPerawat"
              required
              disabled={!idPoli}
              value={idPerawat}
              onChange={(e) => setIdPerawat(e.target.value)}
              className={`${inputCls} disabled:bg-surface-muted`}
            >
              <option value="">
                {idPoli ? "— Pilih perawat —" : "Pilih poli terlebih dahulu"}
              </option>
              {perawatTampil.map((d) => (
                <option key={d.idKaryawan} value={d.idKaryawan}>
                  {d.namaLengkap}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormCard>

      <div className="flex justify-end gap-3">
        <Link
          href="/rekap-pasien"
          className="flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-hover"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending || pasien.length === 0}
          className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
        >
          <Save aria-hidden="true" size={16} />
          {isPending ? "Menyimpan..." : "Daftarkan"}
        </button>
      </div>
    </form>
  );
}
