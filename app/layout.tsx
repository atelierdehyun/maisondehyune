"use client";

import Link from "next/link";

const SPOTIFY_PLAYLIST =
  "https://open.spotify.com/embed/playlist/6dcnCHcVUFWbS1sxJNGnCP?utm_source=generator";

export default function AtelierWelcome() {
  return (
    <div className="relative w-full space-y-7 overflow-hidden pb-10 text-[#514653]">
      {/* Brand ticker */}
      <div className="relative overflow-hidden border-y border-[#edcddd] bg-[#fff8fb] py-2.5">
        <div className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.28em] text-[#c9689b] sm:text-[10px]">
          <span className="inline-block min-w-full animate-[marquee_28s_linear_infinite]">
            ✳ made for collectors ✳ photocards & little treasures ✳ group orders ✳ korean proxy ✳ made for collectors ✳ photocards & little treasures ✳ group orders ✳ korean proxy ✳
          </span>
        </div>
      </div>

      {/* Main brand / editorial hero */}
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/90 bg-[#fff9fb] p-4 shadow-[0_24px_70px_-42px_rgba(174,91,135,0.38)] sm:rounded-[2.5rem] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:linear-gradient(rgba(226,177,199,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(226,177,199,.13)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="pointer-events-none absolute -left-20 top-24 -z-10 h-64 w-64 rounded-full bg-[#f9dce9]/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-[#e4f4e9]/75 blur-3xl" />

        <header className="relative flex flex-col gap-5 border-b border-[#f0dce6] pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:pb-7">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#c76d9d] sm:text-[10px]">
              <span className="h-px w-7 bg-[#e5a9c8]" />
              your little k-pop corner
              <span className="text-[#e5b94e]">✳</span>
            </div>
            <div className="flex flex-wrap items-end gap-x-2 gap-y-0">
              <h1 aria-label="Hyuneatelier" className="leading-[0.86] tracking-[-0.085em] text-[#bd5e91]">
                <span className="inline-block font-black text-[clamp(2.8rem,8vw,5.8rem)]">hyune</span>
                <span className="ml-1 inline-block -rotate-3 font-serif text-[clamp(2.9rem,8.2vw,5.95rem)] italic font-semibold tracking-[-0.09em] text-[#d77ba8]">atelier</span>
              </h1>
              <span className="mb-1 inline-flex h-9 w-9 rotate-6 items-center justify-center rounded-full border border-[#f0d28a] bg-[#fff8df] text-xl text-[#d9ad45] shadow-sm sm:mb-2">✳</span>
            </div>
            <p className="mt-4 max-w-xl text-[13px] leading-6 text-[#827783] sm:text-[15px]">
              A tiny universe for the things we love to collect — photocards, group orders, proxy finds & happy little surprises.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:pt-2">
            <span className="rounded-full border border-[#edc9dc] bg-white/85 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#c76d9d] shadow-[0_4px_14px_rgba(199,109,157,.08)] sm:text-[10px]">
              a collector's daydream ✧
            </span>
            <span className="hidden text-right font-serif text-sm italic text-[#a68c9c] sm:block">curated with love, always ♡</span>
          </div>
        </header>

        {/* Photo collage */}
        <div className="relative mt-5 grid grid-cols-1 items-center gap-4 sm:mt-7 md:grid-cols-[1fr_minmax(150px,190px)_1fr] md:gap-5 lg:gap-7">
          <figure className="group relative min-w-0 -rotate-[1deg] rounded-[1.65rem] border border-[#dcecf5] bg-white p-2 shadow-[0_12px_28px_-20px_rgba(72,128,163,.45)] transition duration-300 hover:-translate-y-1 hover:rotate-0">
            <figcaption className="mb-2 flex items-center justify-between px-1.5 text-[9px] font-black uppercase tracking-[0.19em] text-[#79b5d9]">
              <span>little inspiration</span><span>✧ 01</span>
            </figcaption>
            <div className="relative overflow-hidden rounded-[1.15rem] bg-[#f4eee8]">
              <img
                src="https://i.postimg.cc/FKZt0hDG/441894935b5b1026b720976faa08bc5e.jpg"
                alt="Hyunjin — little inspiration"
                loading="lazy"
                className="h-[270px] w-full object-cover object-center sm:h-[340px] lg:h-[390px]"
              />
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#827783] backdrop-blur-sm">mood: starlight</span>
            </div>
            <span className="pointer-events-none absolute -right-2 -top-4 rotate-12 text-3xl text-[#e7c66c] drop-shadow-sm">✦</span>
          </figure>

          <div className="relative z-10 mx-auto flex w-full max-w-[290px] flex-col items-center px-2 py-2 text-center md:max-w-none md:px-0">
            <span className="mb-2 font-serif text-4xl italic text-[#e4a5c8]">୨୧</span>
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#d5a33e]">welcome, lovely</p>
            <p className="mt-3 font-serif text-[1.55rem] italic leading-[1.18] text-[#655765] sm:text-[1.7rem]">
              Find your next<br />favorite little<br /><span className="text-[#c76d9d]">treasure.</span>
            </p>
            <p className="mt-3 max-w-[210px] text-[10px] leading-5 text-[#9a8997]">A happy place for your wishlist to come true.</p>
            <Link
              href="/shop"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d96fa7] to-[#e47c91] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.17em] text-white shadow-[0_9px_20px_-10px_rgba(207,91,145,.8)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_13px_24px_-10px_rgba(207,91,145,.75)]"
            >
              enter the shop <span className="text-sm">↗</span>
            </Link>
            <span className="mt-4 text-[9px] font-bold uppercase tracking-[0.22em] text-[#b9a5b3]">browse • collect • adore</span>
          </div>

          <figure className="group relative min-w-0 rotate-[1deg] rounded-[1.65rem] border border-[#eadcf8] bg-white p-2 shadow-[0_12px_28px_-20px_rgba(133,100,164,.4)] transition duration-300 hover:-translate-y-1 hover:rotate-0">
            <figcaption className="mb-2 flex items-center justify-between px-1.5 text-[9px] font-black uppercase tracking-[0.19em] text-[#ad8bd1]">
              <span>collection moodboard</span><span>✧ 02</span>
            </figcaption>
            <div className="relative overflow-hidden rounded-[1.15rem] bg-[#f8e7aa]">
              <img
                src="https://i.postimg.cc/C5fSGWZs/eca2f6969986d86cf77c8801c39c0026.jpg"
                alt="Hyunjin — collection moodboard"
                loading="lazy"
                className="h-[270px] w-full object-cover object-center sm:h-[340px] lg:h-[390px]"
              />
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#fff8df]/90 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#ad8a3c]">the pretty things</span>
            </div>
            <span className="pointer-events-none absolute -left-2 -top-3 -rotate-12 text-3xl text-[#e7c66c] drop-shadow-sm">✦</span>
          </figure>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-[#f0dce6] pt-4 text-[8px] font-black uppercase tracking-[0.22em] text-[#b59aaa] sm:justify-between sm:text-[9px]">
          <span>indulge in the little things</span><span className="text-[#e0b65a]">✳ ✧ ✳</span><span>made for fellow collectors</span>
        </div>
      </section>

      {/* Main navigation */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white bg-white/75 p-4 shadow-[0_16px_45px_-34px_rgba(174,91,135,.3)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#cf78a4]">the atelier directory</p>
            <h2 className="mt-1 font-serif text-2xl italic text-[#635463] sm:text-3xl">Explore your little world<span className="text-[#d97ca8]">.</span></h2>
          </div>
          <span className="pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#ad9ba9]">pick a destination ↘</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <AppShortcut href="/shop" icon="✳" title="the shop" detail="photocards & merch" tone="pink" index="01" />
          <AppShortcut href="/gos" icon="▧" title="group orders" detail="join a GO" tone="mint" index="02" />
          <AppShortcut href="/proxy-service" icon="↗" title="korea proxy" detail="proxy service" tone="butter" index="03" />
          <AppShortcut href="/info-rules" icon="⌑" title="info & rules" detail="before ordering" tone="lilac" index="04" />
          <AppShortcut href="/joiner-login" icon="♡" title="my account" detail="sign in / register" tone="blue" index="05" />
        </div>
      </section>

      {/* Spotify */}
      <section className="relative overflow-hidden rounded-[2rem] border border-[#efcddd] bg-gradient-to-br from-[#fff0f6] via-[#fffafd] to-[#eff9f2] p-4 shadow-[0_16px_45px_-34px_rgba(174,91,135,.3)] sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#f7d9e8]/70 blur-3xl" />
        <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#ca73a1]">a little soundtrack</p>
            <h2 className="mt-1 font-serif text-3xl italic text-[#655665]">hyuneatelier radio <span className="text-[#d77ba8]">♫</span></h2>
            <p className="mt-1 text-xs text-[#968694]">A playlist to keep you company while you browse.</p>
          </div>
          <a href="https://open.spotify.com/playlist/6dcnCHcVUFWbS1sxJNGnCP" target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#ecc8da] bg-white/90 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#c66e9b] transition hover:-translate-y-0.5 hover:bg-white">open in spotify ↗</a>
        </div>
        <div className="relative overflow-hidden rounded-[1.4rem] border border-white bg-white shadow-sm">
          <iframe title="Hyuneatelier Radio Spotify playlist" src={SPOTIFY_PLAYLIST} width="100%" height="352" style={{ border: 0, display: "block" }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        </div>
        <p className="mt-3 text-center text-[9px] font-medium tracking-wide text-[#aa96a5]">press play whenever you feel like it ♡</p>
      </section>

      {/* Community links */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ExternalShortcut href="https://instagram.com/maisonhyun" title="instagram" detail="follow the shop" tone="pink" />
        <LinkShortcut href="/shop" title="in stock" detail="ready to ship" tone="mint" />
        <ExternalShortcut href="https://chat.whatsapp.com/FMBE0gchYcMKkD7BPxd5q7" title="whatsapp" detail="join the community" tone="blue" />
        <LinkShortcut href="/proxy-service" title="korea proxy" detail="need help from korea?" tone="butter" />
      </section>
      <footer className="pb-2 text-center text-[9px] font-bold uppercase tracking-[0.24em] text-[#b69aaa]">hyuneatelier · made with love for collectors ♡</footer>
    </div>
  );
}

type ShortcutTone = "pink" | "mint" | "butter" | "lilac" | "blue";
const toneClasses: Record<ShortcutTone, string> = {
  pink: "border-[#f0cddd] bg-[#fff1f6] text-[#bd6393]",
  mint: "border-[#d5eadc] bg-[#f0faf3] text-[#628d77]",
  butter: "border-[#f0e2b8] bg-[#fff9e8] text-[#a9873d]",
  lilac: "border-[#e5d9f1] bg-[#f8f3fc] text-[#9477b4]",
  blue: "border-[#d7e8f2] bg-[#f1f8fc] text-[#6795b2]",
};

function AppShortcut({ href, icon, title, detail, tone, index }: { href: string; icon: string; title: string; detail: string; tone: ShortcutTone; index: string }) {
  return (
    <Link href={href} className={`group relative flex min-h-[126px] flex-col items-start justify-between overflow-hidden rounded-[1.35rem] border p-4 text-left shadow-[0_7px_20px_-16px_rgba(100,70,90,.35)] transition duration-200 hover:-translate-y-1 hover:shadow-md ${toneClasses[tone]}`}>
      <span className="absolute right-3 top-3 text-[8px] font-black tracking-[0.18em] opacity-45">{index}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current/15 bg-white/65 font-serif text-xl transition group-hover:rotate-6 group-hover:scale-110">{icon}</span>
      <span className="mt-4">
        <span className="block text-[10px] font-black uppercase tracking-[0.13em]">{title}</span>
        <span className="mt-1 block text-[9px] opacity-70">{detail}</span>
      </span>
      <span className="absolute bottom-3 right-3 text-xs opacity-55 transition group-hover:translate-x-1">↗</span>
    </Link>
  );
}

function LinkShortcut({ href, title, detail, tone }: { href: string; title: string; detail: string; tone: ShortcutTone }) {
  return <Link href={href} className={`flex min-h-24 flex-col items-center justify-center rounded-[1.3rem] border p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}><span className="text-[10px] font-black uppercase tracking-[0.16em]">{title}</span><span className="mt-1 text-[9px] opacity-70">{detail}</span></Link>;
}

function ExternalShortcut({ href, title, detail, tone }: { href: string; title: string; detail: string; tone: ShortcutTone }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`flex min-h-24 flex-col items-center justify-center rounded-[1.3rem] border p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}><span className="text-[10px] font-black uppercase tracking-[0.16em]">{title}</span><span className="mt-1 text-[9px] opacity-70">{detail}</span></a>;
}
