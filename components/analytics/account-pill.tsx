"use client";

import { LogOut, UserRound } from "lucide-react";

import { setAccount, useAccount } from "@/lib/account";
import { cn } from "@/lib/utils";

/**
 * Small pill in the top bars: "Guest" or the signed-in Google account, with sign-out.
 * Guests see everything except the owner analytics; signing in happens on the pilot form or the analytics page.
 */
export function AccountPill({ className }: { className?: string }) {
  const user = useAccount();
  if (!user)
    return (
      <span
        title="Guest: the whole site is open. Sign in with Google only to book a pilot."
        className={cn("inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-2.5 text-xs text-neutral-300", className)}
      >
        <UserRound className="size-3.5" aria-hidden />
        <span className="lp-account__word max-[389px]:hidden" aria-hidden>Guest</span>
        <span className="sr-only lp-account__sr">Guest</span>
      </span>
    );
  return (
    <span
      title={`Signed in as ${user.email}`}
      className={cn("inline-flex min-h-9 max-w-[14rem] shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 pl-1 pr-1 text-xs text-emerald-100", className)}
    >
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.picture} alt="" width={22} height={22} referrerPolicy="no-referrer" className="size-[22px] rounded-full" />
      ) : (
        <UserRound className="ml-1 size-3.5" aria-hidden />
      )}
      <span className="sr-only">Signed in as </span>
      <span className="hidden truncate sm:inline">{user.email}</span>
      <button
        type="button"
        onClick={() => setAccount(null)}
        aria-label={`Sign out ${user.email}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
      >
        <LogOut className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
