import { redirect } from "next/navigation";

export default async function CatchAll({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref : undefined;

  if (ref) {
    redirect(`/?ref=${encodeURIComponent(ref)}`);
  }

  redirect("/");
}
