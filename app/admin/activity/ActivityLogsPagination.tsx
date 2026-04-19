"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui";

export function ActivityLogsPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={(page) => router.push(`/admin/activity?page=${page}`)}
    />
  );
}
