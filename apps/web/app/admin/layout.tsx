import type { Metadata } from "next";

import { AdminChrome } from "@/components/admin/admin-chrome";

export const metadata: Metadata = {
  title: "后台",
};

/** Admin 读写数据库与会话 Cookie，不参与构建期静态预渲染 */
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminChrome>{children}</AdminChrome>;
}
