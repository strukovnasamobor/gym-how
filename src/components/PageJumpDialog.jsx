import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

const PageJumpDialog = ({
  open,
  onClose,
  totalPages = 1,
  initial = 1,
  onSubmit,
}) => {
  const [value, setValue] = useState(String(initial));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(String(initial));
      setError("");
    }
  }, [open, initial]);

  const handleChange = (e) => {
    setValue(e.target.value);
    if (error) setError("");
  };

  const submit = () => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 1 || n > totalPages) {
      setError(`Enter a number 1-${totalPages}`);
      return;
    }
    onSubmit(n);
    onClose();
  };

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Go to page</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={`Page (1-${totalPages})`}
          type="number"
          fullWidth
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          error={!!error}
          helperText={error}
          inputProps={{ min: 1, max: totalPages }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit}>
          Go
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PageJumpDialog;
