import type { Metadata } from "next";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Project baru" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="Project baru" description="Isi detail program podcast. Kolom bertanda * wajib diisi." />
      <ProjectForm />
    </>
  );
}
