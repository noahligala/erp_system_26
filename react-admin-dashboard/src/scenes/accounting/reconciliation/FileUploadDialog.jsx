import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  CircularProgress, useTheme
} from '@mui/material';
import { tokens } from '../../../theme';
import { apiClient } from '../../../api/apiClient';
import { toast } from 'react-toastify';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const FileUploadDialog = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const { data } = await apiClient.post('/accounting/bank-statements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(data.message);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "File upload failed.");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ backgroundColor: colors.blueAccent[700] }}>Upload Bank Statement</DialogTitle>
      <DialogContent sx={{ backgroundColor: colors.primary[400], pt: 3 }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={2}
          border={`2px dashed ${colors.grey[500]}`}
          borderRadius="4px"
        >
          <UploadFileIcon sx={{ fontSize: 40, color: colors.grey[300] }} />
          <Button
            variant="contained"
            component="label"
            color="secondary"
            sx={{ mt: 2 }}
          >
            Choose CSV File
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleFileChange}
            />
          </Button>
          {selectedFile && (
            <Typography mt={1} color={colors.greenAccent[400]}>
              {selectedFile.name}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: colors.primary[400], p: 2 }}>
        <Button onClick={onClose} color="secondary" disabled={isUploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          color="secondary"
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? <CircularProgress size={24} /> : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadDialog;