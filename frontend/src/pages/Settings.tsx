import React, { useState } from 'react';
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
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      style={{ padding: '16px 0' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface VendorTemplate {
  id: string;
  vendorName: string;
  equipmentType: string;
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Network Operations Center',
    defaultExportFormat: 'pdf',
    enableNotifications: true,
    autoSaveInterval: 5,
  });
  const [apiSettings, setApiSettings] = useState({
    cogneeApiUrl: 'http://localhost:8000/process',
    cogneeApiKey: 'your-api-key',
    enableApiLogging: true,
  });
  const [vendorTemplates, setVendorTemplates] = useState<VendorTemplate[]>([
    { id: '1', vendorName: 'Cisco', equipmentType: 'Router' },
    { id: '2', vendorName: 'Juniper', equipmentType: 'Switch' },
    { id: '3', vendorName: 'Arista', equipmentType: 'Switch' },
  ]);
  const [newTemplate, setNewTemplate] = useState({
    vendorName: '',
    equipmentType: '',
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGeneralSettingChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value, checked } = event.target as HTMLInputElement;
    setGeneralSettings({
      ...generalSettings,
      [name as string]: name === 'enableNotifications' ? checked : value,
    });
  };

  const handleApiSettingChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value, checked } = event.target as HTMLInputElement;
    setApiSettings({
      ...apiSettings,
      [name as string]: name === 'enableApiLogging' ? checked : value,
    });
  };

  const handleNewTemplateChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = event.target as HTMLInputElement;
    setNewTemplate({
      ...newTemplate,
      [name as string]: value,
    });
  };

  const handleAddTemplate = () => {
    if (!newTemplate.vendorName || !newTemplate.equipmentType) {
      setSnackbarMessage('Please fill in all template fields');
      setSnackbarOpen(true);
      return;
    }

    const newTemplateWithId: VendorTemplate = {
      id: `new-${Date.now()}`,
      vendorName: newTemplate.vendorName,
      equipmentType: newTemplate.equipmentType,
    };

    setVendorTemplates([...vendorTemplates, newTemplateWithId]);
    setNewTemplate({ vendorName: '', equipmentType: '' });
    setSnackbarMessage('Template added successfully');
    setSnackbarOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    setVendorTemplates(vendorTemplates.filter((template) => template.id !== id));
    setSnackbarMessage('Template deleted successfully');
    setSnackbarOpen(true);
  };

  const handleSaveGeneralSettings = () => {
    // In a real implementation, you would save to the API
    setSnackbarMessage('General settings saved successfully');
    setSnackbarOpen(true);
  };

  const handleSaveApiSettings = () => {
    // In a real implementation, you would save to the API
    setSnackbarMessage('API settings saved successfully');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="General" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label="API Configuration" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab
              label="Vendor Templates"
              id="settings-tab-2"
              aria-controls="settings-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="companyName"
                  value={generalSettings.companyName}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="default-export-format-label">Default Export Format</InputLabel>
                  <Select
                    labelId="default-export-format-label"
                    name="defaultExportFormat"
                    value={generalSettings.defaultExportFormat}
                    label="Default Export Format"
                    onChange={handleGeneralSettingChange}
                  >
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="docx">Word (DOCX)</MenuItem>
                    <MenuItem value="html">HTML</MenuItem>
                    <MenuItem value="txt">Text</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generalSettings.enableNotifications}
                      onChange={handleGeneralSettingChange}
                      name="enableNotifications"
                      color="primary"
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Auto-Save Interval (minutes)"
                  name="autoSaveInterval"
                  type="number"
                  value={generalSettings.autoSaveInterval}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                  inputProps={{ min: 1, max: 60 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveGeneralSettings}
                >
                  Save Settings
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              API Configuration
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Alert severity="info" sx={{ mb: 3 }}>
              Configure the connection to the Cognee RAG API for document processing.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cognee API URL"
                  name="cogneeApiUrl"
                  value={apiSettings.cogneeApiUrl}
                  onChange={handleApiSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cognee API Key"
                  name="cogneeApiKey"
                  value={apiSettings.cogneeApiKey}
                  onChange={handleApiSettingChange}
                  margin="normal"
                  type="password"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={apiSettings.enableApiLogging}
                      onChange={handleApiSettingChange}
                      name="enableApiLogging"
                      color="primary"
                    />
                  }
                  label="Enable API Logging"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveApiSettings}
                >
                  Save API Settings
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Vendor Templates
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Alert severity="info" sx={{ mb: 3 }}>
              Manage vendor-specific templates for MOP generation. These templates define the
              structure and commands for different equipment types.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Add New Template
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Vendor Name"
                          name="vendorName"
                          value={newTemplate.vendorName}
                          onChange={handleNewTemplateChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Equipment Type"
                          name="equipmentType"
                          value={newTemplate.equipmentType}
                          onChange={handleNewTemplateChange}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<AddIcon />}
                      color="primary"
                      onClick={handleAddTemplate}
                    >
                      Add Template
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Existing Templates
                </Typography>
                <List>
                  {vendorTemplates.map((template) => (
                    <ListItem key={template.id} divider>
                      <ListItemText
                        primary={`${template.vendorName} - ${template.equipmentType}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="edit"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Settings;
