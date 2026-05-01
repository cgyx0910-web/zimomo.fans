import { notFound } from "next/navigation";

import { ClusterEditor } from "@/components/admin/cluster-editor";
import { getClusterByIdAdmin, listClusterItemsAdmin } from "@/lib/clusters/queries";

export default async function AdminClusterEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const cluster = await getClusterByIdAdmin(id);
  if (!cluster) {
    notFound();
  }
  const members = await listClusterItemsAdmin(id);

  return <ClusterEditor cluster={cluster} members={members} />;
}
