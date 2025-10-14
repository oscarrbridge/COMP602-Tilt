
import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import type { NewEventInput } from "../../../Backend/firebase/events"; 

interface Props {
  onAdd: (item: NewEventInput) => Promise<void>;
}

export default function SpecialEventCreateButton({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewEventInput>({
    EventHook: "",
    EventTitle: "",
    EventDescription: "",
    EventImage: "",
    EventLink: "/",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.EventTitle.trim()) return;
    await onAdd({ ...form, EventImage: form.EventImage || null });
    setForm({ EventHook: "", EventTitle: "", EventDescription: "", EventImage: "", EventLink: "/" });
    setOpen(false);
    alert("Submitted for approval.");
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>Add Event</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Special Event</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Hook" name="EventHook" value={form.EventHook} onChange={handleChange} />
          <TextField label="Title" name="EventTitle" value={form.EventTitle} onChange={handleChange} />
          <TextField label="Description" name="EventDescription" value={form.EventDescription} onChange={handleChange} />
          <TextField label="Image URL" name="EventImage" value={form.EventImage ?? ""} onChange={handleChange} />
          <TextField label="Link" name="EventLink" value={form.EventLink} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}