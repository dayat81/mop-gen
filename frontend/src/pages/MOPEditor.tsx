import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mop-tabpanel-${index}`}
      aria-labelledby={`mop-tab-${index}`}
      {...other}
      style={{ padding: '16px 0' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface MOPStep {
  id: string;
  stepNumber: number;
  description: string;
  command: string;
  verification: string;
  rollback: string;
}

interface MOP {
  id: string;
  title: string;
  description: string;
  status: string;
  documentId: string;
  createdAt: string;
  steps: MOPStep[];
}

const MOPEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [mop, setMop] = useState<MOP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMOP, setEditedMOP] = useState<MOP | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  useEffect(() => {
    if (id) {
      fetchMOP();
    }
  }, [id]);

  const fetchMOP = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For MVP, we'll simulate MOP data
      // In a real implementation, you would fetch from the API
      const mockMOP: MOP = {
        id: id || '1',
        title: 'Router Configuration MOP',
        description: 'Method of Procedure for configuring Cisco routers',
        status: 'draft',
        documentId: '123',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: '1',
            stepNumber: 1,
            description: 'Connect to router via console',
            command: 'telnet 192.168.1.1',
            verification: 'Verify connection established',
            rollback: 'Disconnect from console',
          },
          {
            id: '2',
            stepNumber: 2,
            description: 'Enter privileged EXEC mode',
            command: 'enable\nPassword: ******',
            verification: 'Verify prompt changes to Router#',
            rollback: 'exit',
          },
          {
            id: '3',
            stepNumber: 3,
            description: 'Enter configuration mode',
            command: 'configure terminal',
            verification: 'Verify prompt changes to Router(config)#',
            rollback: 'end',
          },
        ],
      };
      
      setMop(mockMOP);
      setEditedMOP(JSON.parse(JSON.stringify(mockMOP)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load MOP');
      console.error('Error fetching MOP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setSaveDialogOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleSaveConfirm = async () => {
    try {
      // In a real implementation, you would save to the API
      // await axios.put(`/api/mops/${id}`, editedMOP);
      
      setMop(editedMOP);
      setIsEditing(false);
      setSaveDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save MOP');
      console.error('Error saving MOP:', err);
    }
  };

  const handleSaveCancel = () => {
    setSaveDialogOpen(false);
  };

  const handleDiscardChanges = () => {
    setEditedMOP(JSON.parse(JSON.stringify(mop)));
    setIsEditing(false);
    setSaveDialogOpen(false);
  };

  const handleExportClick = () => {
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async () => {
    try {
      setIsLoading(true);
      
      // Call the export API
      const response = await axios.get(`/api/mops/${id}/export?format=${exportFormat}`);
      
      // Open the exported file in a new tab
      window.open(response.data.url, '_blank');
      
      setExportDialogOpen(false);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export MOP');
      console.error('Error exporting MOP:', err);
      setIsLoading(false);
    }
  };

  const handleExportCancel = () => {
    setExportDialogOpen(false);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (editedMOP) {
      setEditedMOP({
        ...editedMOP,
        title: event.target.value,
      });
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (editedMOP) {
      setEditedMOP({
        ...editedMOP,
        description: event.target.value,
      });
    }
  };

  const handleStepChange = (stepId: string, field: keyof MOPStep, value: string) => {
    if (editedMOP) {
      const updatedSteps = editedMOP.steps.map((step) =>
        step.id === stepId ? { ...step, [field]: value } : step
      );
      setEditedMOP({
        ...editedMOP,
        steps: updatedSteps,
      });
    }
  };

  const handleAddStep = () => {
    if (editedMOP) {
      const newStep: MOPStep = {
        id: `new-${Date.now()}`,
        stepNumber: editedMOP.steps.length + 1,
        description: '',
        command: '',
        verification: '',
        rollback: '',
      };
      setEditedMOP({
        ...editedMOP,
        steps: [...editedMOP.steps, newStep],
      });
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (editedMOP) {
      const updatedSteps = editedMOP.steps
        .filter((step) => step.id !== stepId)
        .map((step, index) => ({ ...step, stepNumber: index + 1 }));
      setEditedMOP({
        ...editedMOP,
        steps: updatedSteps,
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!mop) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">MOP not found</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </Box>
    );
  }

  const displayMOP = isEditing ? editedMOP : mop;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">MOP Editor</Typography>
        <Box>
          <Button
            variant={isEditing ? 'contained' : 'outlined'}
            color={isEditing ? 'success' : 'primary'}
            startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
            onClick={handleEditToggle}
            sx={{ mr: 1 }}
          >
            {isEditing ? 'Save Changes' : 'Edit MOP'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportClick}
            disabled={isEditing}
          >
            Export
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="MOP tabs">
            <Tab label="Overview" id="mop-tab-0" aria-controls="mop-tabpanel-0" />
            <Tab label="Procedure Steps" id="mop-tab-1" aria-controls="mop-tabpanel-1" />
            <Tab label="Version History" id="mop-tab-2" aria-controls="mop-tabpanel-2" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {isEditing ? (
                  <TextField
                    fullWidth
                    label="Title"
                    value={displayMOP?.title || ''}
                    onChange={handleTitleChange}
                    variant="outlined"
                  />
                ) : (
                  <Typography variant="h5" gutterBottom>
                    {displayMOP?.title}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                {isEditing ? (
                  <TextField
                    fullWidth
                    label="Description"
                    value={displayMOP?.description || ''}
                    onChange={handleDescriptionChange}
                    variant="outlined"
                    multiline
                    rows={4}
                  />
                ) : (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {displayMOP?.description}
                    </Typography>
                  </>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Status
                    </Typography>
                    <Typography variant="body1">{displayMOP?.status}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {new Date(displayMOP?.createdAt || '').toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Procedure Steps
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stepper orientation="vertical" nonLinear>
              {displayMOP?.steps.map((step) => (
                <Step key={step.id} active>
                  <StepLabel>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="subtitle1">
                        Step {step.stepNumber}: {step.description}
                      </Typography>
                      {isEditing && (
                        <Tooltip title="Delete Step">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteStep(step.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </StepLabel>
                  <Box sx={{ ml: 3, mt: 1, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        {isEditing ? (
                          <TextField
                            fullWidth
                            label="Description"
                            value={step.description}
                            onChange={(e) =>
                              handleStepChange(step.id, 'description', e.target.value)
                            }
                            variant="outlined"
                            margin="normal"
                          />
                        ) : (
                          <Typography variant="body1" paragraph>
                            {step.description}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Command
                        </Typography>
                        {isEditing ? (
                          <TextField
                            fullWidth
                            value={step.command}
                            onChange={(e) => handleStepChange(step.id, 'command', e.target.value)}
                            variant="outlined"
                            multiline
                            rows={2}
                          />
                        ) : (
                          <Paper
                            sx={{
                              p: 2,
                              bgcolor: 'grey.900',
                              color: 'grey.100',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {step.command}
                          </Paper>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Verification
                        </Typography>
                        {isEditing ? (
                          <TextField
                            fullWidth
                            value={step.verification}
                            onChange={(e) =>
                              handleStepChange(step.id, 'verification', e.target.value)
                            }
                            variant="outlined"
                            multiline
                            rows={2}
                          />
                        ) : (
                          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>{step.verification}</Paper>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Rollback
                        </Typography>
                        {isEditing ? (
                          <TextField
                            fullWidth
                            value={step.rollback}
                            onChange={(e) => handleStepChange(step.id, 'rollback', e.target.value)}
                            variant="outlined"
                            multiline
                            rows={2}
                          />
                        ) : (
                          <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                            {step.rollback}
                          </Paper>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                </Step>
              ))}
            </Stepper>

            {isEditing && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                  size="large"
                >
                  Add Step
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Version History
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* For MVP, we'll show a simple version history */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <strong>Version 1.0</strong> - {new Date().toLocaleDateString()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>Initial version created from document analysis.</Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        </TabPanel>
      </Paper>

      {/* Save Changes Dialog */}
      <Dialog open={saveDialogOpen} onClose={handleSaveCancel}>
        <DialogTitle>Save Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to save your changes to this MOP?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDiscardChanges} color="error" startIcon={<CloseIcon />}>
            Discard Changes
          </Button>
          <Button onClick={handleSaveCancel}>Cancel</Button>
          <Button onClick={handleSaveConfirm} color="primary" startIcon={<CheckIcon />} autoFocus>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={handleExportCancel}>
        <DialogTitle>Export MOP</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose a format to export this Method of Procedure document.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Tabs
              value={exportFormat}
              onChange={(e, value) => setExportFormat(value)}
              aria-label="export format tabs"
            >
              <Tab value="pdf" label="PDF" />
              <Tab value="docx" label="Word (DOCX)" />
              <Tab value="html" label="HTML" />
              <Tab value="txt" label="Text" />
            </Tabs>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExportCancel}>Cancel</Button>
          <Button
            onClick={handleExportConfirm}
            color="primary"
            startIcon={<DownloadIcon />}
            autoFocus
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MOPEditor;
