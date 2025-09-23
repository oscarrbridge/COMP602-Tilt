// Create button for carousel
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import type { SpecialEventItem } from "./ComponentType";

// Takes Special Event item
interface Props {
  onAdd: (item: SpecialEventItem) => void;
}

// Main compontent
export default function SpecialEventCreateButton({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    // Stre Input
    EventHook: "",
    EventTitle: "",
    EventDescription: "",
    EventImage: "",
    EventLink: "/",
  });

  // User Input Change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Save Button Form
  const handleSubmit = () => {
    if (!form.EventTitle.trim()) return;

    onAdd({
      ...form,
      createdAt: Date.now(),
    });

    // Resetting Boxes for Form
    setForm({
      EventHook: "",
      EventTitle: "",
      EventDescription: "",
      EventImage: "",
      EventLink: "/",
    });
    setOpen(false);
  };

  return (
    <>
    {/* Button that opens the add form*/}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
      >
        Add Event
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Special Event</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <TextField
            label="Hook"
            name="EventHook"
            value={form.EventHook}
            onChange={handleChange}
          />
          <TextField
            label="Title"
            name="EventTitle"
            value={form.EventTitle}
            onChange={handleChange}
          />
          <TextField
            label="Description"
            name="EventDescription"
            value={form.EventDescription}
            onChange={handleChange}
          />
          <TextField
            label="Image URL"
            name="EventImage"
            value={form.EventImage}
            onChange={handleChange}
          />
          <TextField
            label="Link"
            name="EventLink"
            value={form.EventLink}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}