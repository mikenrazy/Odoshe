import { useEditor } from "@/lib/led/store";
import { DateField, Readout, Section, SelectField, TextAreaField, TextField } from "../Field";

export function SetupPanel() {
  const project = useEditor((s) => s.project);
  const setMeta = useEditor((s) => s.setMeta);
  const renameProject = useEditor((s) => s.renameProject);

  if (!project) return null;

  return (
    <>
      <Section title="Project Setup">
        <TextField
          label="Event Name"
          value={project.name}
          onChange={(name) => renameProject(project.id, name)}
        />
        <TextField
          label="Client"
          value={project.meta.client}
          onChange={(client) => setMeta({ client })}
        />
        <TextField
          label="Venue"
          value={project.meta.venue}
          onChange={(venue) => setMeta({ venue })}
        />
        <DateField
          label="Event Date"
          value={project.meta.eventDate}
          onChange={(eventDate) => setMeta({ eventDate })}
        />
        <SelectField
          label="Units"
          value={project.meta.units}
          options={[
            { value: "metric", label: "Metric (m)" },
            { value: "imperial", label: "Feet / Inches" },
          ]}
          onChange={(units) => setMeta({ units: units as "metric" | "imperial" })}
        />
      </Section>

      <Section title="Notes">
        <TextAreaField
          label="Production notes"
          rows={5}
          value={project.meta.notes}
          onChange={(notes) => setMeta({ notes })}
        />
      </Section>

      <Section title="At a glance">
        <Readout
          rows={[
            ["STAGE", `${project.stage.width} × ${project.stage.depth} m`],
            ["LED SURFACES", String(project.screens.length)],
            ["CANVAS", `${project.canvas.width} × ${project.canvas.height}`],
            ["EQUIPMENT", String(project.equipment.length)],
            ["CREATED", new Date(project.createdAt).toLocaleDateString()],
          ]}
        />
      </Section>
    </>
  );
}
