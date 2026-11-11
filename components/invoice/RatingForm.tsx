"use client";

import { startTransition, useActionState, useState } from "react";
import { CircleCheck, Star } from "lucide-react";
import { kirimRatingAction } from "@/actions/invoice";
import ErrorBox from "@/components/ui/ErrorBox";
import { NAMA_KLINIK } from "@/libs/klinik";
import type { ActionResponse } from "@/types/action";

const KETERANGAN = ["", "Sangat kurang", "Kurang", "Cukup", "Baik", "Sangat baik"];

/** Pilihan bintang 1-5 berbasis radio (bisa dipakai dengan keyboard) */
function PilihBintang({
  name,
  judul,
  subjudul,
  nilai,
  onChange,
}: {
  name: string;
  judul: string;
  subjudul?: string | null;
  nilai: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const tampil = hover || nilai;
  return (
    <fieldset className="rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
      <legend className="sr-only">{judul}</legend>
      <p className="font-semibold">{judul}</p>
      {subjudul && <p className="text-sm text-ink-3">{subjudul}</p>}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={nilai === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span className="sr-only">{`${n} bintang`}</span>
              <Star
                aria-hidden="true"
                size={34}
                className={`rounded transition peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-500 ${
                  n <= tampil ? "fill-amber-400 text-amber-400" : "text-ink-faint"
                }`}
              />
            </label>
          ))}
        </div>
        <span className="text-sm text-ink-2">{KETERANGAN[tampil]}</span>
      </div>
    </fieldset>
  );
}

export default function RatingForm({
  token,
  namaDokter,
  namaPerawat,
}: {
  token: string;
  namaDokter: string | null;
  namaPerawat: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResponse | null, FormData>(
    kirimRatingAction.bind(null, token),
    null,
  );
  const [nilai, setNilai] = useState({ dokter: 0, perawat: 0, klinik: 0 });
  const [ulasan, setUlasan] = useState("");
  const adaPerawat = namaPerawat !== null;
  const lengkap = nilai.dokter > 0 && nilai.klinik > 0 && (!adaPerawat || nilai.perawat > 0);

  if (state?.success) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-10 text-center shadow-sm">
        <CircleCheck aria-hidden="true" size={44} className="text-emerald-500" />
        <h2 className="text-xl font-bold">Terima kasih!</h2>
        <p className="max-w-sm text-sm text-ink-3">
          Penilaian Anda sudah kami terima dan akan membantu {NAMA_KLINIK} meningkatkan pelayanan.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-4"
    >
      {state && !state.success && <ErrorBox message={state.error} />}
      <PilihBintang
        name="nilaiDokter"
        judul="Dokter yang menangani"
        subjudul={namaDokter}
        nilai={nilai.dokter}
        onChange={(n) => setNilai((p) => ({ ...p, dokter: n }))}
      />
      {adaPerawat && (
        <PilihBintang
          name="nilaiPerawat"
          judul="Perawat yang menangani"
          subjudul={namaPerawat}
          nilai={nilai.perawat}
          onChange={(n) => setNilai((p) => ({ ...p, perawat: n }))}
        />
      )}
      <PilihBintang
        name="nilaiKlinik"
        judul="Pelayanan klinik"
        subjudul="Kebersihan, kenyamanan, waktu tunggu, dan pelayanan administrasi"
        nilai={nilai.klinik}
        onChange={(n) => setNilai((p) => ({ ...p, klinik: n }))}
      />
      <label className="block rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
        <span className="font-semibold">Kritik & saran</span>
        <span className="text-sm text-ink-3"> (opsional)</span>
        <textarea
          name="ulasan"
          rows={4}
          maxLength={1000}
          value={ulasan}
          onChange={(e) => setUlasan(e.target.value)}
          placeholder="Ceritakan pengalaman Anda…"
          className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
      </label>
      <button
        type="submit"
        disabled={!lengkap || pending}
        className="h-11 w-full rounded-lg bg-emerald-500 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
      >
        {pending ? "Mengirim…" : "Kirim Penilaian"}
      </button>
      {!lengkap && (
        <p className="text-center text-xs text-ink-3">Pilih bintang untuk setiap penilaian.</p>
      )}
    </form>
  );
}
