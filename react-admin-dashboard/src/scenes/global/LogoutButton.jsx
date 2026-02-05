import React, { useState } from "react";
import { Button, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { secureStore } from "../../utils/storage";

const LogoutButton = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    secureStore.clear();
    setOpen(true);

    setTimeout(() => {
      window.location.href = "/login"; // Forces full reload to login page
    }, 1500);
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        onClick={handleLogout}
        sx={{ textTransform: "none", fontWeight: 500 }}
      >
        Logout
      </Button>

      <Snackbar
        open={open}
        autoHideDuration={1500}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Logout successful!
        </Alert>
      </Snackbar>
    </>
  );
};

export default LogoutButton;
