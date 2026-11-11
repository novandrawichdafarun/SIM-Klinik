const footerLinkClass =
  "block py-1 text-sm text-foreground/75 transition-colors hover:text-primary";

export default function Footer() {
  return (
    <footer className="shrink-0 bg-surface-muted px-6 py-8 md:px-7 md:py-7">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <span className="flex size-4 items-center justify-center rounded-sm border-2 border-accent-ink text-xs font-bold leading-none text-accent-ink">
              +
            </span>
            KlinikPulse SIM Faskes
          </h2>
          <p className="text-sm leading-5 text-foreground/75">
            Sistem Informasi Manajemen Fasilitas Kesehatan Terpadu untuk
            percepatan transformasi digital layanan primer dan rujukan
            Indonesia.
          </p>
          <span className="mt-3 inline-flex rounded-full bg-surface-hover px-3 py-1 text-[10px] font-medium">
            ◎ &nbsp; Terakreditasi KARS Paripurna &amp; Kemenkes RI
          </span>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold">Kepatuhan &amp; Integrasi</h2>
          <ul className="space-y-1">
            <li className={footerLinkClass}>
              ↻ &nbsp; SatuSehat Kemenkes Interoperabel API
            </li>
            <li className={footerLinkClass}>
              ◈ &nbsp; SNI ISO/IEC 27001:2022 Keamanan Siber
            </li>
            <li className={footerLinkClass}>
              ◇ &nbsp; Standar Perlindungan Data Pribadi (UU PDP)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold">Pintasan Operasional</h2>
          <ul>
            <li>
              <a href="#" className={footerLinkClass}>
                Rekap RME &amp; Triase IGD
              </a>
            </li>
            <li>
              <a href="#" className={footerLinkClass}>
                Dashboard BOR &amp; Indikator Mutu
              </a>
            </li>
            <li>
              <a href="#" className={footerLinkClass}>
                Sinkronisasi Antrean BPJS Vclaim
              </a>
            </li>
            <li>
              <a href="#" className={footerLinkClass}>
                Tiket Helpdesk SIM &amp; Farmasi
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold">Kontak Siaga Faskes</h2>
          <p className="text-sm leading-5 text-foreground/75">
            Dukungan teknis PIC IT Medis tersedia 24/7 untuk faskes terintegrasi
            SIM Klinik.
          </p>
          <p className="mt-2 text-sm">◉ &nbsp; Ext. Internal IT: 1044 / 1045</p>
          <p className="mt-1 text-sm text-foreground/75">
            ✉ &nbsp; it-medis@klinikpulse.sim.id
          </p>
        </section>
      </div>

      <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-3 border-t border-foreground/10 pt-4 text-[10px] text-foreground/75 sm:flex-row sm:items-center sm:justify-between">
        <p>♧ SatuSehat Terverifikasi ID: FSK-71029</p>
        <p>
          • &nbsp; Standar HL7 FHIR v4.0.1 &nbsp; • &nbsp; Enkripsi AES-256 EMR
        </p>
        <p>© 2024 KlinikPulse SIM. Hak Cipta Dilindungi Undang-Undang.</p>
      </div>
    </footer>
  );
}
