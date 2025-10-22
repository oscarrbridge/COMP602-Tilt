import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
export default function SpecialEventCreateButton({ onAdd }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        EventHook: "",
        EventTitle: "",
        EventDescription: "",
        EventImage: "",
        EventLink: "/",
    });
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = async () => {
        if (!form.EventTitle.trim())
            return;
        await onAdd({ ...form, EventImage: form.EventImage || null });
        setForm({ EventHook: "", EventTitle: "", EventDescription: "", EventImage: "", EventLink: "/" });
        setOpen(false);
        alert("Submitted for approval.");
    };
    return (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "contained", color: "primary", onClick: () => setOpen(true), children: "Add Event" }), _jsxs(Dialog, { open: open, onClose: () => setOpen(false), children: [_jsx(DialogTitle, { children: "Add Special Event" }), _jsxs(DialogContent, { sx: { display: "flex", flexDirection: "column", gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Hook", name: "EventHook", value: form.EventHook, onChange: handleChange }), _jsx(TextField, { label: "Title", name: "EventTitle", value: form.EventTitle, onChange: handleChange }), _jsx(TextField, { label: "Description", name: "EventDescription", value: form.EventDescription, onChange: handleChange }), _jsx(TextField, { label: "Image URL", name: "EventImage", value: form.EventImage ?? "", onChange: handleChange }), _jsx(TextField, { label: "Link", name: "EventLink", value: form.EventLink, onChange: handleChange })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, variant: "contained", children: "Save" })] })] })] }));
}
