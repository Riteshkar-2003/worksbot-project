"use client";

import React from "react";
import { usePathname } from "next/navigation";
import UserQueryModal from "./UserQueryModal";

export default function GlobalQueryWidget() {
  const pathname = usePathname();

  // Only render the floating query/issue button on the profile page
  if (!pathname || !pathname.startsWith("/profile")) {
    return null;
  }

  return <UserQueryModal />;
}
