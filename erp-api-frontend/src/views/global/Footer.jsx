import { Box, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Footer = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      component="footer"
      sx={{
        textAlign: "center",
        py: 1.5,
        mt: "auto",
        backgroundColor:
          theme.palette.mode === "dark"
            ? colors.primary[900]
            : colors.grey[50],
        color: colors.text.primary,
        borderTop: `1px solid ${
          theme.palette.mode === "dark" ? colors.primary[700] : colors.grey[100]
        }`,
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 2,
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.3, fontSize: "0.5rem"}}>
        ©{new Date().getFullYear()} Ligco ERP Dashboard
      </Typography>
    </Box>
  );
};

export default Footer;
