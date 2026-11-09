"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Eye,
  Pencil,
  Plus,
  Search,
  UserRoundPlus,
} from "lucide-react";
import { useState } from "react";

const employees = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  name: "dr. Farhan Maulana, Sp.A",
  nip: "MED-0812",
  role: "Dokter",
  position: "Dokter Spesialis Anak",
  unit: "Poli Anak",
  phone: "3174092408890003",
  mobile: "0812-6234-3210",
  joined: "31/10/2023",
}));

export default function KaryawanTabel() {
  const [query, setQuery] = useState("");

  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.nip} ${employee.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="mb-5 flex flex-col items-start gap-3 md:flex-row md:items-center">
        <label className="flex h-14.5 w-full items-center gap-3 rounded-xl border border-[#eee8f5] bg-white px-4 shadow-sm md:h-11.5 md:max-w-190">
          <Search size={19} className="shrink-0 text-[#343044]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama karyawan, NIK, NIP, atau nomor STR..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-[#777383]"
          />
        </label>
        <button className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-[11px] font-semibold text-[#063e27] shadow-md">
          <UserRoundPlus size={16} />
          <Plus size={14} className="-ml-2" />
          Tambah Karyawan Baru
          <ChevronDown size={13} className="hidden" />
        </button>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 border-collapse text-left">
            <thead className="bg-[#fbf7ff]">
              <tr className="h-10 text-[8px] font-bold text-[#444052]">
                <th className="pl-4">KARYAWAN &amp; NIP</th>
                <th className="px-3">PERAN / HAK AKSES</th>
                <th className="px-3">JABATAN &amp; UNIT KERJA</th>
                <th className="px-3">NO. KONTAK</th>
                <th className="px-3">LOKASI &amp; TGL / SP</th>
                <th className="px-3">AKSI</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="h-21.25 text-[9px] text-[#292638]"
                >
                  <td className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8.5 shrink-0 place-items-center rounded-full bg-[#c9f3df] text-xs font-bold text-[#075b38]">
                        FM
                      </span>
                      <span>
                        <strong className="block text-[10px]">
                          {employee.name}
                        </strong>
                        <small className="mt-1 block text-[8px]">
                          NIP: {employee.nip}{" "}
                          <span className="text-emerald-600">●</span>{" "}
                          {employee.unit}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="px-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#d3f5e5] px-2.5 py-1 text-[8px] text-[#075b38]">
                      <span className="size-1.5 rounded-full bg-emerald-700" />
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-3">
                    {employee.position}
                    <small className="mt-1 block text-[8px]">
                      {employee.unit}
                    </small>
                  </td>
                  <td className="px-3">
                    {employee.phone}
                    <small className="mt-1 block text-[8px] text-emerald-700">
                      {employee.mobile}
                    </small>
                  </td>
                  <td className="px-3">{employee.joined} · 2.2.3.144920</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2.5">
                      <button aria-label="Lihat karyawan">
                        <Eye size={14} />
                      </button>
                      <button aria-label="Edit karyawan">
                        <Pencil size={14} />
                      </button>
                      <button aria-label="Menu lainnya">
                        <EllipsisVertical size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="h-24 text-center text-sm text-gray-500"
                  >
                    Karyawan tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex min-h-12 items-center justify-between bg-[#fbf7ff] px-4 text-[10px] text-[#514d5c]">
          <span>
            Menampilkan <strong>1 - 7</strong> dari <strong>48</strong> Karyawan
            Terdaftar
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            <button className="flex items-center gap-1 rounded-md bg-[#f0ebf5] px-2 py-1.5 text-[9px] text-gray-500">
              <ChevronLeft size={12} /> Sebelumnya
            </button>
            <button className="rounded-md bg-emerald-500 px-2.5 py-1.5 text-[9px] text-white">
              1
            </button>
            <button className="px-2 py-1.5">2</button>
            <button className="px-2 py-1.5">3</button>
            <span className="px-1">…</span>
            <button className="px-2 py-1.5">7</button>
            <button className="flex items-center gap-1 rounded-md bg-[#f0ebf5] px-2 py-1.5 text-[9px]">
              Selanjutnya <ChevronRight size={12} />
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
