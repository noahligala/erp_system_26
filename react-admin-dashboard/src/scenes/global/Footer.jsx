import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Footer = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const currentYear = new Date().getFullYear();

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        textAlign: "center",
        py: 1.2,
        color: colors.grey[900],
        fontSize: "0.2rem",
        zIndex: 1,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: colors.grey[600],
          fontWeight: 200,
          letterSpacing: "0.3px",
        fontSize: "0.55rem",
        }}
      >
        © {currentYear} Ligco Technologies. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
