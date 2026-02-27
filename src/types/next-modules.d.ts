declare module "next/link" {
  import type { ComponentType } from "react";
  const Link: ComponentType<Record<string, unknown>>;
  export default Link;
}

declare module "next/navigation" {
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
}
