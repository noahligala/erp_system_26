import { Paper } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';

export const GlassPaper = styled(Paper, {
  // Prevents the custom prop from leaking into the HTML DOM
  shouldForwardProp: (prop) => prop !== 'isdark',
})(({ theme, isdark }) => ({
  borderRadius: "24px",
  // Subtle gradient for a realistic frosted glass look
  background: isdark 
    ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`
    : `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8f9fa', 0.85)} 100%)`,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)", // Safari support
  // Refined translucent borders
  border: `1px solid ${isdark ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.08)}`,
  // Inner light effect + base shadow
  boxShadow: isdark
    ? `inset 0 1px 1px ${alpha(theme.palette.common.white, 0.05)}, 0 4px 20px rgba(0,0,0,0.2)`
    : `inset 0 1px 1px ${alpha(theme.palette.common.white, 0.5)}, 0 4px 20px ${alpha(theme.palette.common.black, 0.03)}`,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  overflow: "hidden", // Ensures inner elements don't bleed over the rounded corners
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: isdark 
      ? `inset 0 1px 1px ${alpha(theme.palette.common.white, 0.05)}, 0 12px 24px rgba(0,0,0,0.4)`
      : `inset 0 1px 1px ${alpha(theme.palette.common.white, 0.5)}, 0 12px 24px ${alpha(theme.palette.common.black, 0.08)}`,
  }
}));