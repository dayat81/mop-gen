import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import axios from 'axios';

const DocumentUpload: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('document', file);
      formData.append('description', description);

      const response = await axios.post('/api/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(percentCompleted);
        },
      });

      setUploadedDocumentId(response.data.id);
      setActiveStep(1);
      checkProcessingStatus(response.data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload document');
      console.error('Error uploading document:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const checkProcessingStatus = async (documentId: string) => {
    try {
      setProcessingStatus('processing');
      
      // In a real implementation, you would poll the status endpoint
      // For MVP, we'll simulate processing with a timeout
      setTimeout(async () => {
        try {
          const response = await axios.get(`/api/documents/${documentId}/status`);
          setProcessingStatus(response.data.status);
          
          if (response.data.status === 'completed') {
            setActiveStep(2);
          } else if (response.data.status === 'failed') {
            setError('Document processing failed. Please try again.');
          } else {
            // Continue polling if still processing
            setTimeout(() => checkProcessingStatus(documentId), 2000);
          }
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to check processing status');
          console.error('Error checking processing status:', err);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check processing status');
      console.error('Error checking processing status:', err);
    }
  };

  const handleGenerateMOP = () => {
    if (uploadedDocumentId) {
      navigate(`/mop/generate/${uploadedDocumentId}`);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setDescription('');
    setError(null);
    setUploadedDocumentId(null);
    setProcessingStatus(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const steps = [
    {
      label: 'Upload Document',
      description: 'Select a network specification document to upload',
      content: (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                variant="outlined"
                label="Document Description"
                value={description}
                onChange={handleDescriptionChange}
                disabled={isUploading}
              />
            </Grid>
            <Grid item xs={12}>
              <input
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={isUploading}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={isUploading}
                  fullWidth
                >
                  Select File
                </Button>
              </label>
            </Grid>
            {file && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  <Typography variant="body1">{file.name}</Typography>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!file || isUploading}
                fullWidth
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </Grid>
            {isUploading && (
              <Grid item xs={12}>
                <Box sx={{ width: '100%', mt: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{ display: 'block', mx: 'auto' }}
                  />
                  <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                    {uploadProgress}% Uploaded
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      ),
    },
    {
      label: 'Processing Document',
      description: 'The system is extracting information from your document',
      content: (
        <Box sx={{ mt: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Processing
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography>
                  {processingStatus === 'processing'
                    ? 'Processing document...'
                    : processingStatus === 'completed'
                    ? 'Processing complete!'
                    : 'Waiting for processing to start...'}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                The system is analyzing your document using the Cognee RAG system to extract network
                specifications and requirements.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ),
    },
    {
      label: 'Document Processed',
      description: 'Your document has been processed successfully',
      content: (
        <Box sx={{ mt: 2 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckIcon color="success" sx={{ mr: 2 }} />
                <Typography variant="h6">Processing Complete!</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography paragraph>
                Your document has been successfully processed. You can now generate a MOP based on
                the extracted information.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleGenerateMOP}
                  >
                    Generate MOP
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" fullWidth onClick={handleReset}>
                    Upload Another Document
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Document Upload
      </Typography>
      <Typography variant="body1" paragraph>
        Upload network specification documents to generate Methods of Procedure (MOPs).
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography>{step.description}</Typography>
                {step.content}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default DocumentUpload;
