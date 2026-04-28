import React, { useState } from 'react';
import { Box, Typography, Button, Stack, TextField, CircularProgress, InputAdornment, Tooltip, Divider } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Formik } from 'formik';
import * as yup from 'yup';

// Icons
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';

// Validation schema only requires fields the standard user can actually edit
const profileSchema = yup.object().shape({
  phone: yup.string().required("Phone number is required"),
  location: yup.string().required("Location is required"),
  timezone: yup.string().required("Timezone is required"),
  gender: yup.string().required("Gender is required"),
  disability: yup.string().required("Disability status is required"),
});

const PersonalDetailsTab = ({ currentUser, onSave, isSaving, labelColor, inputSx }) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  // Determine if the current user has admin rights to edit locked fields
  const displayRole = currentUser?.company_role || currentUser?.accessLevel || 'Employee';
  const isAdmin = displayRole.toUpperCase() === 'ADMIN' || displayRole.toUpperCase() === 'OWNER';

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">Personal Information</Typography>
          <Typography variant="body2" color={labelColor} mt={0.5}>
            Update your contact preferences. Core details require HR/Admin privileges to modify.
          </Typography>
        </Box>
        <Button 
          variant={isEditing ? "outlined" : "contained"} 
          color={isEditing ? "error" : "primary"}
          startIcon={isEditing ? <CancelIcon /> : <EditOutlinedIcon />}
          onClick={() => setIsEditing(!isEditing)}
          disableElevation
          sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', px: 3 }}
        >
          {isEditing ? "Cancel Editing" : "Edit Contact Info"}
        </Button>
      </Stack>

      <Formik
        initialValues={{ 
          name: currentUser?.name || currentUser?.full_name || "", 
          staffId: currentUser?.id || `EMP-${Math.floor(Math.random() * 10000)}`,
          email: currentUser?.email || "",
          status: currentUser?.status || "Active",
          department: currentUser?.department || "N/A",
          jobTitle: currentUser?.job_title || "N/A",
          phone: currentUser?.phone || currentUser?.phone_number || "", 
          location: currentUser?.location || "",
          timezone: currentUser?.timezone || "Africa/Nairobi",
          gender: currentUser?.gender || "",
          disability: currentUser?.disability || "None"
        }}
        validationSchema={profileSchema}
        onSubmit={(values) => onSave(values, () => setIsEditing(false))}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => {
          
          // Helper to render locked fields consistently
          const renderLockedField = (name, label, icon) => (
            <Box>
              <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">
                {label}
              </Typography>
              <TextField 
                fullWidth 
                size="small" // Condensed size
                name={name} 
                value={values[name]} 
                onChange={handleChange} 
                disabled={!isAdmin || !isEditing} // Unlocks ONLY if editing AND is an Admin
                sx={inputSx}
                InputProps={{
                  startAdornment: icon ? <InputAdornment position="start">{icon}</InputAdornment> : null,
                  endAdornment: (!isAdmin) && (
                    <Tooltip title="Requires Admin Privileges to Edit">
                      <InputAdornment position="end">
                        <LockOutlinedIcon sx={{ color: alpha(labelColor, 0.5), fontSize: '1.1rem' }} />
                      </InputAdornment>
                    </Tooltip>
                  ),
                }}
              />
            </Box>
          );

          // Helper to render editable contact fields
          const renderEditableField = (name, label, placeholder) => (
            <Box>
              <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">
                {label} *
              </Typography>
              <TextField 
                fullWidth 
                size="small" // Condensed size
                name={name} 
                value={values[name]} 
                onChange={handleChange} 
                onBlur={handleBlur} 
                disabled={!isEditing} 
                placeholder={placeholder}
                error={!!touched[name] && !!errors[name]} 
                helperText={touched[name] && errors[name]} 
                sx={inputSx} 
              />
            </Box>
          );

          return (
            <form onSubmit={handleSubmit}>
              
              {/* SECTION 1: Core Employment Details (Locked for normal users) */}
              <Typography variant="overline" color="primary" fontWeight={800} letterSpacing={1} display="block" mb={2}>
                Core Employment Details
              </Typography>
              <Box display="grid" gap="24px" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }} mb={5}>
                {renderLockedField("staffId", "Staff ID", <BadgeOutlinedIcon sx={{ color: labelColor, fontSize: '1.1rem' }} />)}
                {renderLockedField("name", "Full Name")}
                {renderLockedField("email", "Work Email", <EmailOutlinedIcon sx={{ color: labelColor, fontSize: '1.1rem' }} />)}
                {renderLockedField("department", "Department", <WorkOutlineOutlinedIcon sx={{ color: labelColor, fontSize: '1.1rem' }} />)}
                {renderLockedField("jobTitle", "Job Title")}
                {renderLockedField("status", "Employment Status")}
              </Box>

              <Divider sx={{ my: 4, borderColor: theme.palette.divider }} />

              {/* SECTION 2: Contact & Preferences (Editable by user) */}
              <Typography variant="overline" color="primary" fontWeight={800} letterSpacing={1} display="block" mb={2}>
                Contact & Personal Details
              </Typography>
              <Box display="grid" gap="24px" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }}>
                {renderEditableField("phone", "Phone Number", "+254 7XX XXX XXX")}
                {renderEditableField("location", "Location / Branch", "e.g., Kitale, Kenya")}
                {renderEditableField("timezone", "Timezone", "e.g., Africa/Nairobi")}
                {renderEditableField("gender", "Gender", "e.g., Male, Female, Other")}
                {renderEditableField("disability", "Disability Status", "e.g., None, Visually Impaired, etc.")}
              </Box>

              {/* ACTION BUTTONS */}
              {isEditing && (
                <Box display="flex" flexDirection={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" mt={5} gap={2}>
                  <Button 
                    onClick={() => setIsEditing(false)} 
                    variant="outlined" 
                    sx={{ borderRadius: '8px', px: 4, py: 1.5, fontWeight: 700, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={isSaving} 
                    disableElevation
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveOutlinedIcon />}
                    sx={{ borderRadius: '8px', px: 4, py: 1.5, fontWeight: 700, textTransform: 'none', width: { xs: '100%', sm: 'auto' }, color: '#fff' }}
                  >
                    {isSaving ? "Saving Changes..." : "Save Changes"}
                  </Button>
                </Box>
              )}
            </form>
          );
        }}
      </Formik>
    </Box>
  );
};

export default React.memo(PersonalDetailsTab);