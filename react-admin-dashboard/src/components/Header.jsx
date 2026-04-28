import React from "react";
import { Typography, Box, useTheme } from "@mui/material";

const Header = ({ title, subtitle }) => {
  const theme = useTheme();

  return (
    <Box mb="20px">
      <Typography
        variant="h2"
        sx={{
          fontWeight: 600,
          mb: "4px",
          color: "inherit", 
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontWeight: 450,
          color: "inherit",
          opacity: 0.75, // Gives it a clean, modern secondary text look naturally
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
};

export default Header;