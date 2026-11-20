"use client";

import Link from "next/link";

const SPOTIFY_PLAYLIST =
  "https://open.spotify.com/embed/playlist/6dcnCHcVUFWbS1sxJNGnCP?utm_source=generator";

export default function AtelierWelcome() {
  return (
    <div className="w-full space-y-6 pb-10">
      {/* Welcome marquee */}
      <div className="overflow-hidden rounded-full border border-pink-200/70 bg-white/90 py-3 shadow-sm">
        <div className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.22em] text-pink-500">
          <div className="inline-block min-w-full animate-[marquee_28s_linear_infinite]">
            ✦ welcome to hyuneatelier ✦ stray kids ✦ enhypen ✦ photocards &amp; official merch ✦ group orders ✦ proxy service ✦ welcome to hyuneatelier ✦
          </div>
        </div>
      </div>

      {/* App-style welcome area */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white bg-white/65 p-4 shadow-[0_18px_55px_-35px_rgba(219,39,119,0.35)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-pink-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-emerald-100/50 blur-3xl" />

        <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-pink-400">
              your little k-pop corner
            </p>
            <h1 className="mt-1 text-3xl font-black lowercase tracking-tight text-[#D85D98] sm:text-4xl">
              hyuneatelier<span className="text-amber-400"> ♡</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              A little space for photocards, group orders, proxy finds and the
              things we love collecting.
            </p>
          </div>
          <span className="rounded-full border border-pink-200 bg-white/90 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-pink-400">
            made with love ✧
          </span>
        </div>

        {/* Keep the existing community / Hyunjin images */}
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
          <div className="overflow-hidden rounded-[1.4rem] border border-sky-100 bg-white p-2 shadow-sm md:col-span-5 md:-rotate-1">
            <div className="mb-2 flex items-center justify-between px-1 text-[9px] font-bold uppercase tracking-widest text-sky-400">
              <span>little inspiration</span>
              <span>✧ 01</span>
            </div>
            <img
              src="https://i.postimg.cc/FKZt0hDG/441894935b5b1026b720976faa08bc5e.jpg"
              alt="Hyunjin inspiration"
              loading="lazy"
              className="h-72 w-full rounded-xl object-cover object-center sm:h-80"
            />
          </div>

          <div className="flex flex-col items-center rounded-[1.5rem] border border-amber-100 bg-[#FFFCF3] p-6 text-center shadow-sm md:col-span-2">
            <span className="text-3xl text-pink-300">୨୧</span>
            <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500">
              welcome!
            </p>
            <p className="mt-3 font-serif text-lg italic leading-6 text-zinc-600">
              Find your next favorite little treasure.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-400 to-rose-400 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              enter the shop →
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[1.4rem] border border-purple-100 bg-white p-2 shadow-sm md:col-span-5 md:rotate-1">
            <div className="mb-2 flex items-center justify-between px-1 text-[9px] font-bold uppercase tracking-widest text-purple-400">
              <span>collection moodboard</span>
              <span>✧ 02</span>
            </div>
            <img
              src="https://i.postimg.cc/C5fSGWZs/eca2f6969986d86cf77c8801c39c0026.jpg"
              alt="K-pop collection moodboard"
              loading="lazy"
              className="h-72 w-full rounded-xl object-cover object-center sm:h-80"
            />
            <span className="absolute right-4 top-10 text-xl text-amber-400">✦</span>
          </div>
        </div>
      </section>

      {/* App-style shortcuts */}
      <section className="rounded-[1.8rem] border border-white bg-white/65 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-400">
              explore hyuneatelier
            </p>
            <h2 className="mt-1 text-lg font-black lowercase text-zinc-700">
              open an app <span className="text-pink-400">♡</span>
            </h2>
          </div>
          <span className="text-[10px] text-zinc-400">choose where to go</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <AppShortcut href="/shop" icon="🛍️" title="shop" detail="photocards & merch" tone="pink" />
          <AppShortcut href="/gos" icon="📦" title="group orders" detail="join a GO" tone="mint" />
          <AppShortcut href="/proxy-service" icon="✈️" title="proxy kr" detail="proxy service" tone="butter" />
          <AppShortcut href="/info-rules" icon="📝" title="info & rules" detail="before ordering" tone="lilac" />
          <AppShortcut href="/joiner-login" icon="♡" title="my account" detail="sign in / register" tone="blue" />
        </div>
      </section>

      {/* Spotify official playlist embed */}
      <section className="overflow-hidden rounded-[1.8rem] border border-pink-200/70 bg-gradient-to-br from-[#FFF0F6] via-white to-[#F0FBF5] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-400">
              soundtrack for your visit
            </p>
            <h2 className="mt-1 text-xl font-black lowercase text-zinc-700">
              hyuneatelier radio <span className="text-pink-400">♫</span>
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Your K-pop playlist, playing through Spotify.
            </p>
          </div>
          <a
            href="https://open.spotify.com/playlist/6dcnCHcVUFWbS1sxJNGnCP"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-pink-200 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-pink-500 transition hover:bg-pink-50"
          >
            open in spotify ↗
          </a>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
          <iframe
            title="Hyuneatelier Radio Spotify playlist"
            src={SPOTIFY_PLAYLIST}
            width="100%"
            height="352"
            style={{ border: 0, display: "block" }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
        <p className="mt-3 text-center text-[10px] text-zinc-400">
          Press play whenever you feel like listening ♡
        </p>
      </section>

      {/* Community links */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ExternalShortcut
          href="https://instagram.com/maisonhyun"
          title="instagram"
          detail="follow the shop"
          tone="pink"
        />
        <LinkShortcut href="/shop" title="in stock" detail="ready to ship" tone="mint" />
        <ExternalShortcut
          href="https://chat.whatsapp.com/FMBE0gchYcMKkD7BPxd5q7"
          title="whatsapp"
          detail="join the community"
          tone="blue"
        />
        <LinkShortcut
          href="/proxy-service"
          title="proxy kr"
          detail="need help from korea?"
          tone="butter"
        />
      </section>
    </div>
  );
}

type ShortcutTone = "pink" | "mint" | "butter" | "lilac" | "blue";

const toneClasses: Record<ShortcutTone, string> = {
  pink: "border-pink-200 bg-[#FFF0F5] text-pink-600",
  mint: "border-emerald-200 bg-[#EDFFF6] text-emerald-700",
  butter: "border-amber-200 bg-[#FFFAE8] text-amber-700",
  lilac: "border-purple-200 bg-[#F7F1FF] text-purple-600",
  blue: "border-sky-200 bg-[#EFF8FF] text-sky-700",
};

function AppShortcut({
  href,
  icon,
  title,
  detail,
  tone,
}: {
  href: string;
  icon: string;
  title: string;
  detail: string;
  tone: ShortcutTone;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-32 flex-col items-center justify-center rounded-2xl border p-4 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${toneClasses[tone]}`}
    >
      <span className="text-2xl transition group-hover:scale-110">{icon}</span>
      <span className="mt-2 text-[11px] font-extrabold uppercase tracking-wider">
        {title}
      </span>
      <span className="mt-1 text-[10px] opacity-70">{detail}</span>
    </Link>
  );
}

function LinkShortcut({
  href,
  title,
  detail,
  tone,
}: {
  href: string;
  title: string;
  detail: string;
  tone: ShortcutTone;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}
    >
      <span className="text-[11px] font-extrabold uppercase tracking-widest">{title}</span>
      <span className="mt-1 text-[10px] opacity-70">{detail}</span>
    </Link>
  );
}

function ExternalShortcut({
  href,
  title,
  detail,
  tone,
}: {
  href: string;
  title: string;
  detail: string;
  tone: ShortcutTone;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}
    >
      <span className="text-[11px] font-extrabold uppercase tracking-widest">{title}</span>
      <span className="mt-1 text-[10px] opacity-70">{detail}</span>
    </a>
  );
}
