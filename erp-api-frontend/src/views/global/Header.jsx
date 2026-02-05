import { Typography, Box, useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Header = ({ title, subtitle }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    
    return (
        <Box sx={{
            m:"1rem 2px 2px 1rem"
        }}>
            <Typography
                variant="h6"
                color={colors.text.primary}
                fontWeight="bold"
                sx={{ 
                    m: "0 0 4px 0",
                    fontSize: { xs: ".7rem", sm: ".9rem", md: "1rem" },
                    lineHeight: 1
                }}
            >
                {title}
            </Typography>
            <Typography 
                variant="body1" 
                color={theme.palette.secondary.main}
                sx={{
                    fontSize: { xs: "0.7rem", sm: "0.9rem", md: "0.8rem" },
                    fontWeight: 400,
                    lineHeight: 1
                }}
            >
                {subtitle}
            </Typography>
        </Box>
    );
};

export default Header;