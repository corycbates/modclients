import { useParams } from "wouter";
import { ClientDetail } from "@/components/clients/ClientDetail";

export default function ClientDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <div>Client ID is required</div>;
  }

  return <ClientDetail id={id} />;
}
