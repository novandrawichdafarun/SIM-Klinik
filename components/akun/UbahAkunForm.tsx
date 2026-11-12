import { getAkunByIdAction } from "@/actions/akun";
import ErrorBox from "../ui/ErrorBox";
import AkunForm from "./AkunForm";

export default async function UbahAkunForm({
  params,
}: Pick<PageProps<"/akun/[id]/ubah">, "params">) {
  const { id } = await params;
  const result = await getAkunByIdAction(id);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Akun tidak ditemukan." : result.error}
      />
    );
  }
  return (
    <AkunForm mode="edit" akun={result.data.akun} isSelf={result.data.isSelf} />
  );
}
