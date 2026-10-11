"use client";

import React from "react";
import { usePathname } from "next/navigation";
import UserQueryModal from "./UserQueryModal";

export default function GlobalQueryWidget() {
  const pathname = usePathname();

  // Do not render floating candidate support bubble on admin dashboard
  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }

  return <UserQueryModal />;
}
