import React from "react";
import { IconButton, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";

const ScrollToTopButton = ({ visible = false, scrollToTop }) => {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <IconButton
      onClick={scrollToTop}
      aria-label="Scroll to top"
      sx={{
        position: "fixed",
        right: { xs: 16, md: 24 },
        bottom: { xs: 16, md: 24 },
        zIndex: 70,
        width: 44,
        height: 44,
        borderRadius: 3,
        bgcolor: theme.palette.primary.main,
        color: "#fff",
        boxShadow: `0 18px 45px ${alpha(theme.palette.primary.main, 0.32)}`,
        "&:hover": {
          bgcolor: theme.palette.primary.dark,
        },
      }}
    >
      <KeyboardArrowUpRounded />
    </IconButton>
  );
};

export default ScrollToTopButton;