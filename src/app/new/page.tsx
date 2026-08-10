import { ProjectWizard } from "@/components/forms/ProjectWizard";
import { Header } from "@/components/layout/header";

export default function NewProjectPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ProjectWizard />
      </main>
    </div>
  );
}
